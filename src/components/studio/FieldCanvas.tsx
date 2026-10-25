import {
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	createFieldRenderer,
	type FieldRenderer,
	type GradientDocument,
	type GradientField,
	isStaticFieldMode,
	svgDataUrl,
} from "@/lib/gradients";
import type { TextInk } from "./Canvas";

interface Props {
	doc: GradientDocument;
	playing: boolean;
	showText: boolean;
	textInk: TextInk;
	onChange: (patch: Partial<GradientField>, transient?: boolean) => void;
	onCommit: () => void;
	onTime?: (seconds: number) => void;
}
const clamp = (v: number, min: number, max: number) =>
	Math.min(max, Math.max(min, v));
export function FieldCanvas({
	doc,
	playing,
	showText,
	textInk,
	onChange,
	onCommit,
	onTime,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const renderer = useRef<FieldRenderer | null>(null);
	const timeCallback = useRef(onTime);
	timeCallback.current = onTime;
	const [error, setError] = useState(false);
	const [size, setSize] = useState({ width: 1, height: 1 });
	const [drag, setDrag] = useState<"move" | "rotate" | null>(null);
	const field = doc.field;
	const animating =
		playing && !!field && !isStaticFieldMode(field.mode) && field.speed > 0;
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const create = () => {
			try {
				renderer.current = createFieldRenderer(canvas);
				setError(false);
			} catch {
				setError(true);
			}
		};
		const lost = (event: Event) => {
			event.preventDefault();
			renderer.current = null;
			setError(true);
		};
		create();
		canvas.addEventListener("webglcontextlost", lost);
		canvas.addEventListener("webglcontextrestored", create);
		return () => {
			renderer.current?.dispose();
			renderer.current = null;
			canvas.removeEventListener("webglcontextlost", lost);
			canvas.removeEventListener("webglcontextrestored", create);
		};
	}, []);
	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const observer = new ResizeObserver(([entry]) => {
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			setSize({
				width: Math.round(entry.contentRect.width * dpr),
				height: Math.round(entry.contentRect.height * dpr),
			});
		});
		observer.observe(wrapper);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (!field || error) return;
		let raf = 0,
			last = 0,
			elapsed = 0,
			drawn = false;
		const draw = (now: number) => {
			if (last && animating && !document.hidden)
				elapsed += Math.min((now - last) / 1000, 0.1);
			last = now;
			const phase = field.phase + elapsed * (field.speed / 100) * 0.65;
			if (!drawn || (animating && !document.hidden)) {
				renderer.current?.render(doc, phase, size.width, size.height);
				drawn = true;
			}
			timeCallback.current?.(phase);
			if (animating) raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(raf);
	}, [doc, field, animating, size, error]);
	if (!field) return null;
	const start = (
		event: PointerEvent<HTMLButtonElement>,
		kind: "move" | "rotate",
	) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		event.currentTarget.focus({ preventScroll: true });
		setDrag(kind);
	};
	const end = (event: PointerEvent<HTMLButtonElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		setDrag(null);
		onCommit();
	};
	const move = (event: PointerEvent<HTMLButtonElement>) => {
		if (!drag) return;
		const rect = wrapperRef.current?.getBoundingClientRect();
		if (!rect) return;
		if (drag === "move")
			onChange(
				{
					x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
					y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
				},
				true,
			);
		else
			onChange(
				{
					angle: Math.round(
						(Math.atan2(
							event.clientY - rect.top - (rect.height * field.y) / 100,
							event.clientX - rect.left - (rect.width * field.x) / 100,
						) *
							180) /
							Math.PI,
					),
				},
				true,
			);
	};
	const nudge = (
		event: KeyboardEvent<HTMLButtonElement>,
		kind: "move" | "rotate",
	) => {
		if (
			!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
		)
			return;
		event.preventDefault();
		const sign = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
		const step = (event.shiftKey ? 5 : 1) * sign;
		if (kind === "rotate")
			onChange({ angle: clamp(field.angle + step, -180, 180) }, true);
		else if (["ArrowLeft", "ArrowRight"].includes(event.key))
			onChange({ x: clamp(field.x + step, 0, 100) }, true);
		else onChange({ y: clamp(field.y + step, 0, 100) }, true);
	};
	return (
		<div
			ref={wrapperRef}
			className="gp-field-canvas"
			data-dragging={drag || undefined}
		>
			<canvas
				ref={canvasRef}
				className="gp-field-art"
				role="img"
				aria-label={`${doc.name}, ${animating ? "moving" : "still"} gradient artwork`}
			>
				A softly rendered gradient. Use the inspector to adjust colors and
				shape.
			</canvas>
			{error && (
				<>
					<img
						className="gp-field-art"
						src={svgDataUrl(doc)}
						alt={`${doc.name} static fallback`}
					/>
					<p className="gp-render-note" role="status">
						Static preview · live gradients need graphics acceleration.
					</p>
				</>
			)}
			{showText && (
				<div className="gp-hero" data-ink={textInk} aria-hidden="true">
					<p className="gp-hero__eyebrow">A study in light</p>
					<p className="gp-hero__title">
						A softer
						<br />
						kind of light.
					</p>
					<p className="gp-hero__body">
						Color, atmosphere, and a little room to breathe.
					</p>
				</div>
			)}
			<div
				className="gp-field-handles"
				style={
					{
						"--field-x": `${field.x}%`,
						"--field-y": `${field.y}%`,
						"--field-angle": `${field.angle}deg`,
					} as CSSProperties
				}
			>
				<span className="gp-field-guide" aria-hidden="true" />
				<button
					type="button"
					className="gp-field-handle gp-field-handle--position"
					aria-label="Position light. Arrow keys move, Shift for larger steps."
					onPointerDown={(e) => start(e, "move")}
					onPointerMove={move}
					onPointerUp={end}
					onPointerCancel={end}
					onLostPointerCapture={() => {
						setDrag(null);
						onCommit();
					}}
					onKeyDown={(e) => nudge(e, "move")}
					onKeyUp={onCommit}
					onBlur={onCommit}
				/>
				<button
					type="button"
					className="gp-field-handle gp-field-handle--angle"
					style={{
						left: `calc(${field.x}% + ${Math.cos((field.angle * Math.PI) / 180) * 92}px)`,
						top: `calc(${field.y}% + ${Math.sin((field.angle * Math.PI) / 180) * 92}px)`,
					}}
					aria-label={`Rotate light. ${field.angle} degrees. Arrow keys rotate.`}
					onPointerDown={(e) => start(e, "rotate")}
					onPointerMove={move}
					onPointerUp={end}
					onPointerCancel={end}
					onLostPointerCapture={() => {
						setDrag(null);
						onCommit();
					}}
					onKeyDown={(e) => nudge(e, "rotate")}
					onKeyUp={onCommit}
					onBlur={onCommit}
				/>
			</div>
		</div>
	);
}
