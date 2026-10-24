import {
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type GradientDocument,
	type GradientLayer,
	getDimensions,
	svgDataUrl,
} from "@/lib/gradients";

export type TextInk = "light" | "dark";

interface CanvasProps {
	doc: GradientDocument;
	activeId: string | null;
	showHandles: boolean;
	showText: boolean;
	textInk: TextInk;
	onSelect: (id: string) => void;
	onLayerChange: (
		id: string,
		patch: Partial<GradientLayer>,
		transient: boolean,
	) => void;
	onCommit: () => void;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const KNOB_DISTANCE = 56;

function wrapAngle(angle: number) {
	let a = Math.round(angle);
	while (a > 180) a -= 360;
	while (a < -180) a += 360;
	return a;
}

export function Canvas({
	doc,
	activeId,
	showHandles,
	showText,
	textInk,
	onSelect,
	onLayerChange,
	onCommit,
}: CanvasProps) {
	const boardRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState<string | null>(null);
	const { width, height } = getDimensions(doc.aspectRatio);
	const lastGood = useRef("");
	const src = useMemo(() => {
		try {
			lastGood.current = svgDataUrl(doc);
		} catch {
			// Keep showing the last valid render while an edit is mid-way.
		}
		return lastGood.current;
	}, [doc]);

	const pointToPercent = (event: PointerEvent) => {
		const rect = boardRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return null;
		return {
			x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
			y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
			rect,
		};
	};

	const startDrag = (
		event: PointerEvent<HTMLElement>,
		layerId: string,
		mode: "move" | "rotate" = "move",
	) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		event.currentTarget.focus({ preventScroll: true });
		onSelect(layerId);
		setDragging(mode === "move" ? layerId : `${layerId}:rotate`);
	};

	const endDrag = (event: PointerEvent<HTMLElement>) => {
		if (!dragging) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setDragging(null);
		onCommit();
	};

	const moveLayer = (
		event: PointerEvent<HTMLElement>,
		layer: GradientLayer,
	) => {
		if (dragging !== layer.id) return;
		const point = pointToPercent(event);
		if (!point) return;
		onLayerChange(
			layer.id,
			{ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 },
			true,
		);
	};

	const rotateLayer = (
		event: PointerEvent<HTMLElement>,
		layer: GradientLayer,
	) => {
		if (dragging !== `${layer.id}:rotate`) return;
		const point = pointToPercent(event);
		if (!point) return;
		const cx = point.rect.left + (layer.x / 100) * point.rect.width;
		const cy = point.rect.top + (layer.y / 100) * point.rect.height;
		const angle =
			(Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
		onLayerChange(layer.id, { rotation: wrapAngle(angle) }, true);
	};

	const nudge = (event: KeyboardEvent, layer: GradientLayer) => {
		const step = event.shiftKey ? 5 : 1;
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step],
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		onLayerChange(
			layer.id,
			{
				x: clamp(Math.round(layer.x + move[0]), 0, 100),
				y: clamp(Math.round(layer.y + move[1]), 0, 100),
			},
			true,
		);
	};

	const spin = (event: KeyboardEvent, layer: GradientLayer) => {
		const step = event.shiftKey ? 15 : 1;
		const delta =
			event.key === "ArrowLeft" || event.key === "ArrowDown"
				? -step
				: event.key === "ArrowRight" || event.key === "ArrowUp"
					? step
					: 0;
		if (!delta) return;
		event.preventDefault();
		onLayerChange(
			layer.id,
			{ rotation: wrapAngle(layer.rotation + delta) },
			true,
		);
	};

	const activeLayer = doc.layers.find((layer) => layer.id === activeId);

	return (
		<div className="gp-stage">
			<div
				ref={boardRef}
				className="gp-board"
				style={{ "--ratio": `${width / height}` } as CSSProperties}
				data-dragging={dragging ? "" : undefined}
			>
				<img
					className="gp-board__art"
					src={src}
					alt={`${doc.name} gradient artwork`}
					draggable={false}
				/>

				{showText && (
					<div className="gp-hero" data-ink={textInk} aria-hidden="true">
						<p className="gp-hero__eyebrow">New — Spring collection</p>
						<p className="gp-hero__title">Light that feels like weather.</p>
						<p className="gp-hero__body">
							A preview of how this background carries real headline type, body
							copy and calls to action.
						</p>
						<div className="gp-hero__actions">
							<span className="gp-hero__primary">Get started</span>
							<span className="gp-hero__secondary">Learn more</span>
						</div>
					</div>
				)}

				{showHandles && (
					<div className="gp-handles">
						{doc.layers.map((layer) =>
							layer.visible ? (
								<button
									key={layer.id}
									type="button"
									className="gp-handle"
									data-active={layer.id === activeId ? "" : undefined}
									style={
										{
											left: `${layer.x}%`,
											top: `${layer.y}%`,
											"--swatch": layer.color,
										} as CSSProperties
									}
									aria-label={`Move ${layer.name}. ${Math.round(layer.x)}% across, ${Math.round(layer.y)}% down. Arrow keys nudge, Shift for larger steps.`}
									aria-pressed={layer.id === activeId}
									onClick={() => onSelect(layer.id)}
									onPointerDown={(event) => startDrag(event, layer.id)}
									onPointerMove={(event) => moveLayer(event, layer)}
									onPointerUp={endDrag}
									onPointerCancel={endDrag}
									onLostPointerCapture={() => {
										if (dragging === layer.id) {
											setDragging(null);
											onCommit();
										}
									}}
									onKeyDown={(event) => nudge(event, layer)}
									onKeyUp={onCommit}
									onBlur={onCommit}
								>
									<span className="gp-handle__dot" />
								</button>
							) : null,
						)}

						{activeLayer?.visible && (
							<>
								<span
									className="gp-rotor-arm"
									aria-hidden="true"
									style={
										{
											left: `${activeLayer.x}%`,
											top: `${activeLayer.y}%`,
											width: `${KNOB_DISTANCE}px`,
											transform: `rotate(${activeLayer.rotation}deg)`,
										} as CSSProperties
									}
								/>
								<button
									type="button"
									className="gp-rotor"
									style={{
										left: `calc(${activeLayer.x}% + ${Math.cos((activeLayer.rotation * Math.PI) / 180) * KNOB_DISTANCE}px)`,
										top: `calc(${activeLayer.y}% + ${Math.sin((activeLayer.rotation * Math.PI) / 180) * KNOB_DISTANCE}px)`,
									}}
									aria-label={`Rotate ${activeLayer.name}. ${activeLayer.rotation} degrees. Arrow keys rotate, Shift for 15 degree steps.`}
									onPointerDown={(event) =>
										startDrag(event, activeLayer.id, "rotate")
									}
									onPointerMove={(event) => rotateLayer(event, activeLayer)}
									onPointerUp={endDrag}
									onPointerCancel={endDrag}
									onLostPointerCapture={() => {
										setDragging(null);
										onCommit();
									}}
									onKeyDown={(event) => spin(event, activeLayer)}
									onKeyUp={onCommit}
									onBlur={onCommit}
								/>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
