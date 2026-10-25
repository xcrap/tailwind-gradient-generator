import { ArrowLeftRight, ChevronRight, Dices } from "lucide-react";
import { useId } from "react";
import {
	ASPECT_RATIOS,
	type AspectRatio,
	FIELD_MODES,
	FIELD_VARIANTS,
	type FieldMode,
	type GradientDocument,
	type GradientField,
	isStaticFieldMode,
} from "@/lib/gradients";
import type { TextInk } from "./Canvas";
import { RangeField, Segmented } from "./controls";

export const FIELD_MODE_LABELS: Record<FieldMode, string> = {
	beam: "Light sheet",
	mesh: "Mesh",
	aurora: "Aurora",
	halo: "Halo",
	edge: "Edge light",
	silk: "Silk",
	flow: "Flow",
	still: "Still",
	retro: "Retro",
	pattern: "Patterns",
};

const FIELD_MODE_NOTES: Record<FieldMode, string> = {
	beam: "A broad, soft sheet of light crossing the frame, brightest where it lands.",
	mesh: "Continuous colour fields that drift into one another like ink in water.",
	aurora: "Tall, slow curtains of colour folding across a dark sky.",
	halo: "A wide luminous ring — eclipse light bleeding into the dark.",
	edge: "Light rising from one edge of the frame, fading into shadow.",
	silk: "Soft lit folds, like satin catching a window.",
	flow: "Liquid colour currents, softly twisted into a flowing field.",
	still: "Quiet colour studies in linear, radial, and conic compositions.",
	retro: "Wavy stripes, sweeping arches, and sunbursts in six bold inks.",
	pattern:
		"Repeating checks, dots, and stripes. Make them bold or soften the edges.",
};

const SWATCH_ROLES = ["Shadow", "Deep", "Mid", "Bright", "Glow", "Light"];

export type FieldPatch = Partial<GradientField>;
export type FieldDocumentPatch = Partial<
	Pick<GradientDocument, "name" | "grain" | "aspectRatio">
>;

interface FieldInspectorProps {
	doc: GradientDocument;
	field: GradientField;
	textInk: TextInk;
	onTextInk: (ink: TextInk) => void;
	onFieldChange: (patch: FieldPatch, transient?: boolean) => void;
	onDocumentChange: (patch: FieldDocumentPatch, transient?: boolean) => void;
	onCommit: () => void;
	onShufflePalette: () => void;
}

export function FieldInspector({
	doc,
	field,
	textInk,
	onTextInk,
	onFieldChange,
	onDocumentChange,
	onCommit,
	onShufflePalette,
}: FieldInspectorProps) {
	const modeId = useId();
	const nameId = useId();
	const aspectId = useId();
	const variants = FIELD_VARIANTS[field.mode as keyof typeof FIELD_VARIANTS];
	const staticArtwork = isStaticFieldMode(field.mode);
	const orderedPalette =
		field.mode !== "mesh" && field.mode !== "retro" && field.mode !== "pattern";
	const modeOrder = [
		...(["flow", "mesh", "still", "retro", "pattern"] as const),
		...FIELD_MODES.filter(
			(mode) => !["flow", "mesh", "still", "retro", "pattern"].includes(mode),
		),
	];
	const range =
		<
			K extends
				| "angle"
				| "x"
				| "y"
				| "softness"
				| "spread"
				| "curve"
				| "detail"
				| "speed"
				| "seed",
		>(
			key: K,
		) =>
		(value: number, transient: boolean) =>
			onFieldChange({ [key]: value } as FieldPatch, transient);

	const setColor = (index: number, color: string, transient: boolean) => {
		const palette = [...field.palette];
		palette[index] = color;
		onFieldChange({ palette }, transient);
	};

	return (
		<div className="gp-inspector">
			<section className="gp-section" aria-labelledby={modeId}>
				<h2 id={modeId} className="gp-overline">
					Mode
				</h2>
				<fieldset className="gp-modes" aria-labelledby={modeId}>
					{modeOrder.map((mode) => (
						<button
							key={mode}
							type="button"
							aria-pressed={field.mode === mode}
							className="gp-mode"
							onClick={() => {
								if (mode === field.mode) return;
								onFieldChange({
									mode,
									variant: undefined,
									...(staticArtwork &&
									!isStaticFieldMode(mode) &&
									field.speed === 0
										? { speed: 22 }
										: {}),
								});
							}}
						>
							{FIELD_MODE_LABELS[mode]}
						</button>
					))}
				</fieldset>
				<p className="gp-note">{FIELD_MODE_NOTES[field.mode]}</p>
				{variants && (
					<Segmented
						label="Style"
						value={field.variant ?? variants[0]}
						options={variants.map((value) => ({
							value,
							label: value[0].toUpperCase() + value.slice(1),
						}))}
						onChange={(variant) => onFieldChange({ variant })}
					/>
				)}
			</section>

			<section className="gp-section" aria-labelledby="gp-palette-title">
				<div className="gp-section__head">
					<h2 id="gp-palette-title" className="gp-overline">
						Palette
					</h2>
					<span className="gp-note">
						{orderedPalette ? "shadow → light" : "six colour inks"}
					</span>
				</div>
				<ul className="gp-wells">
					{field.palette.map((color, index) => (
						<li
							// Palette slots are positional; the index is the identity.
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed six-slot palette
							key={index}
							className="gp-well"
							style={{ background: color }}
							title={`${orderedPalette ? SWATCH_ROLES[index] : `Colour ${index + 1}`} · ${color}`}
						>
							<input
								type="color"
								aria-label={`Colour ${index + 1}${orderedPalette ? `, ${SWATCH_ROLES[index]}` : ""} (${color})`}
								value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
								onChange={(event) => setColor(index, event.target.value, true)}
								onBlur={onCommit}
							/>
						</li>
					))}
				</ul>
				<div className="gp-pair">
					<button
						type="button"
						className="gp-button"
						onClick={onShufflePalette}
					>
						<Dices size={15} aria-hidden="true" />
						Shuffle
					</button>
					<button
						type="button"
						className="gp-button"
						onClick={() =>
							onFieldChange({ palette: [...field.palette].reverse() })
						}
					>
						<ArrowLeftRight size={15} aria-hidden="true" />
						Invert
					</button>
				</div>
			</section>

			<section className="gp-section" aria-labelledby="gp-shape-title">
				<h2 id="gp-shape-title" className="gp-overline">
					{staticArtwork || field.mode === "flow" || field.mode === "mesh"
						? "Composition"
						: "Light"}
				</h2>
				<div className="gp-ranges">
					<RangeField
						label="Angle"
						value={field.angle}
						min={-180}
						max={180}
						unit="°"
						onChange={range("angle")}
						onCommit={onCommit}
					/>
					<div className="gp-grid-2">
						<RangeField
							label="Position X"
							value={field.x}
							min={0}
							max={100}
							unit="%"
							onChange={range("x")}
							onCommit={onCommit}
						/>
						<RangeField
							label="Position Y"
							value={field.y}
							min={0}
							max={100}
							unit="%"
							onChange={range("y")}
							onCommit={onCommit}
						/>
					</div>
					<RangeField
						label="Diffusion"
						value={field.softness}
						min={0}
						max={100}
						onChange={range("softness")}
						onCommit={onCommit}
					/>
					{!(field.mode === "still" && field.variant === "conic") && (
						<RangeField
							label={
								field.mode === "retro" || field.mode === "pattern"
									? "Scale"
									: "Spread"
							}
							value={field.spread}
							min={0}
							max={100}
							onChange={range("spread")}
							onCommit={onCommit}
						/>
					)}
					{field.mode !== "still" && (
						<RangeField
							label={field.mode === "flow" ? "Distortion" : "Curve"}
							value={field.curve}
							min={0}
							max={100}
							onChange={range("curve")}
							onCommit={onCommit}
						/>
					)}
					{field.mode !== "still" &&
						(field.mode !== "pattern" || field.variant === "dots") && (
							<RangeField
								label={
									field.mode === "retro"
										? "Bands"
										: field.mode === "pattern"
											? "Dot size"
											: "Detail"
								}
								value={field.detail}
								min={0}
								max={100}
								onChange={range("detail")}
								onCommit={onCommit}
							/>
						)}
				</div>
			</section>

			<section className="gp-section" aria-labelledby="gp-finish-title">
				<h2 id="gp-finish-title" className="gp-overline">
					{staticArtwork ? "Finish" : "Motion & finish"}
				</h2>
				<div className="gp-ranges">
					{!staticArtwork && (
						<RangeField
							label="Motion"
							value={field.speed}
							min={0}
							max={100}
							onChange={range("speed")}
							onCommit={onCommit}
						/>
					)}
					<RangeField
						label="Grain"
						value={doc.grain}
						min={0}
						max={100}
						onChange={(grain, transient) =>
							onDocumentChange({ grain }, transient)
						}
						onCommit={onCommit}
					/>
				</div>
				{staticArtwork && (
					<p className="gp-note">
						A still composition, in the editor and in every export.
					</p>
				)}
			</section>

			<details className="gp-section gp-more">
				<summary>
					<ChevronRight size={14} aria-hidden="true" />
					<span className="gp-overline">More settings</span>
				</summary>
				<div className="gp-more__body">
					<div className="gp-field">
						<label htmlFor={nameId} className="gp-label">
							Artwork name
						</label>
						<input
							id={nameId}
							className="gp-input"
							value={doc.name}
							maxLength={60}
							onChange={(event) =>
								onDocumentChange({ name: event.target.value }, true)
							}
							onBlur={onCommit}
						/>
					</div>

					<div className="gp-field">
						<label htmlFor={aspectId} className="gp-label">
							Export aspect ratio
						</label>
						<select
							id={aspectId}
							className="gp-select"
							value={doc.aspectRatio}
							onChange={(event) =>
								onDocumentChange({
									aspectRatio: event.target.value as AspectRatio,
								})
							}
						>
							{ASPECT_RATIOS.map((ratio) => (
								<option key={ratio} value={ratio}>
									{ratio}
								</option>
							))}
						</select>
					</div>

					<div className="gp-seed">
						<RangeField
							label="Seed"
							value={field.seed}
							min={0}
							max={1000}
							onChange={range("seed")}
							onCommit={onCommit}
						/>
						<button
							type="button"
							className="gp-button"
							onClick={() =>
								onFieldChange({ seed: Math.floor(Math.random() * 1001) })
							}
						>
							<Dices size={15} aria-hidden="true" />
							New seed
						</button>
					</div>

					<Segmented<TextInk>
						label="Preview text"
						value={textInk}
						options={[
							{ value: "light", label: "Light ink" },
							{ value: "dark", label: "Dark ink" },
						]}
						onChange={onTextInk}
					/>
				</div>
			</details>
		</div>
	);
}
