import {
	ChevronDown,
	ChevronUp,
	CopyPlus,
	Eye,
	EyeOff,
	Plus,
	Trash2,
} from "lucide-react";
import { useId, useState } from "react";
import {
	ASPECT_RATIOS,
	type AspectRatio,
	BLEND_MODES,
	type BlendMode,
	type GradientDocument,
	type GradientLayer,
	LAYER_TYPES,
	type LayerType,
} from "@/lib/gradients";
import type { TextInk } from "./Canvas";
import { ColorField, IconButton, RangeField, Segmented } from "./controls";

export const LAYER_TYPE_LABELS: Record<LayerType, string> = {
	beam: "Light beam",
	radial: "Glow",
	linear: "Linear wash",
	ring: "Halo ring",
	aurora: "Aurora ribbon",
};

/** What `color` / `color2` mean for each shape in the renderer. */
const COLOR_LABELS: Record<LayerType, [string, string]> = {
	beam: ["Glow", "Core"],
	radial: ["Glow", "Core"],
	linear: ["Start", "End"],
	ring: ["Start", "End"],
	aurora: ["Base", "Crest"],
};

const BLEND_LABELS: Record<BlendMode, string> = {
	normal: "Normal",
	screen: "Screen",
	multiply: "Multiply",
	overlay: "Overlay",
	"soft-light": "Soft light",
	"color-dodge": "Color dodge",
	lighten: "Lighten",
};

export type LayerPatch = Partial<Omit<GradientLayer, "id">>;
export type DocumentPatch = Partial<
	Omit<GradientDocument, "layers" | "version">
>;

interface InspectorProps {
	doc: GradientDocument;
	activeLayer: GradientLayer | null;
	textInk: TextInk;
	onTextInk: (ink: TextInk) => void;
	onSelect: (id: string) => void;
	onLayerChange: (id: string, patch: LayerPatch, transient?: boolean) => void;
	onDocumentChange: (patch: DocumentPatch, transient?: boolean) => void;
	onCommit: () => void;
	onAddLayer: (type: LayerType) => void;
	onDuplicate: (id: string) => void;
	onRemove: (id: string) => void;
	onMove: (id: string, direction: 1 | -1) => void;
}

export function Inspector(props: InspectorProps) {
	return (
		<div className="gp-inspector">
			<LayerStack {...props} />
			{props.activeLayer ? (
				<LayerProperties {...props} layer={props.activeLayer} />
			) : (
				<section className="gp-section">
					<p className="gp-hint">Add a layer to start painting with light.</p>
				</section>
			)}
			<CanvasSettings {...props} />
		</div>
	);
}

function LayerStack({
	doc,
	activeLayer,
	onSelect,
	onLayerChange,
	onAddLayer,
	onDuplicate,
	onRemove,
	onMove,
}: InspectorProps) {
	const [newType, setNewType] = useState<LayerType>("beam");
	const typeId = useId();
	// Topmost layer first, like any design tool.
	const ordered = doc.layers
		.map((layer, index) => ({ layer, index }))
		.reverse();
	const count = doc.layers.length;

	return (
		<section className="gp-section" aria-labelledby="gp-layers-title">
			<header className="gp-panel-head">
				<h2 id="gp-layers-title" className="gp-panel-title">
					Layers
				</h2>
				<span className="gp-count">{count}</span>
			</header>

			<ol className="gp-layers" aria-label="Layer stack, top to bottom">
				{ordered.map(({ layer, index }) => {
					const active = layer.id === activeLayer?.id;
					return (
						<li
							key={layer.id}
							className="gp-layer"
							data-active={active ? "" : undefined}
							data-hidden={layer.visible ? undefined : ""}
						>
							<button
								type="button"
								className="gp-layer__select"
								aria-pressed={active}
								onClick={() => onSelect(layer.id)}
							>
								<span
									className="gp-layer__swatch"
									style={{
										background: `linear-gradient(135deg, ${layer.color}, ${layer.color2})`,
									}}
									aria-hidden="true"
								/>
								<span className="gp-layer__text">
									<span className="gp-layer__name">{layer.name}</span>
									<span className="gp-layer__type">
										{LAYER_TYPE_LABELS[layer.type]} ·{" "}
										{BLEND_LABELS[layer.blendMode]}
									</span>
								</span>
							</button>
							<div className="gp-layer__actions">
								<IconButton
									label={
										layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`
									}
									aria-pressed={!layer.visible}
									onClick={() =>
										onLayerChange(layer.id, { visible: !layer.visible })
									}
								>
									{layer.visible ? (
										<Eye size={15} aria-hidden="true" />
									) : (
										<EyeOff size={15} aria-hidden="true" />
									)}
								</IconButton>
								<IconButton
									label={`Move ${layer.name} up`}
									disabled={index === count - 1}
									onClick={() => onMove(layer.id, 1)}
								>
									<ChevronUp size={15} aria-hidden="true" />
								</IconButton>
								<IconButton
									label={`Move ${layer.name} down`}
									disabled={index === 0}
									onClick={() => onMove(layer.id, -1)}
								>
									<ChevronDown size={15} aria-hidden="true" />
								</IconButton>
								<IconButton
									label={`Duplicate ${layer.name}`}
									disabled={count >= 24}
									onClick={() => onDuplicate(layer.id)}
								>
									<CopyPlus size={15} aria-hidden="true" />
								</IconButton>
								<IconButton
									label={`Remove ${layer.name}`}
									disabled={count <= 1}
									onClick={() => onRemove(layer.id)}
								>
									<Trash2 size={15} aria-hidden="true" />
								</IconButton>
							</div>
						</li>
					);
				})}
			</ol>

			<div className="gp-add-layer">
				<label htmlFor={typeId} className="sr-only">
					New layer type
				</label>
				<select
					id={typeId}
					className="gp-select"
					value={newType}
					onChange={(event) => setNewType(event.target.value as LayerType)}
				>
					{LAYER_TYPES.map((type) => (
						<option key={type} value={type}>
							{LAYER_TYPE_LABELS[type]}
						</option>
					))}
				</select>
				<button
					type="button"
					className="gp-button"
					onClick={() => onAddLayer(newType)}
					disabled={count >= 24}
				>
					<Plus size={15} aria-hidden="true" />
					Add layer
				</button>
			</div>
			{count >= 24 && (
				<p className="gp-hint">
					24-layer limit reached. Remove a layer to add another.
				</p>
			)}
		</section>
	);
}

function LayerProperties({
	layer,
	onLayerChange,
	onCommit,
}: InspectorProps & { layer: GradientLayer }) {
	const nameId = useId();
	const typeId = useId();
	const blendId = useId();
	const change =
		<K extends keyof LayerPatch>(key: K) =>
		(value: LayerPatch[K], transient = false) =>
			onLayerChange(layer.id, { [key]: value } as LayerPatch, transient);

	return (
		<section className="gp-section" aria-labelledby="gp-layer-title">
			<header className="gp-panel-head">
				<h2 id="gp-layer-title" className="gp-panel-title">
					Layer
				</h2>
			</header>

			<div className="gp-field">
				<label htmlFor={nameId} className="gp-label">
					Name
				</label>
				<input
					id={nameId}
					className="gp-input"
					value={layer.name}
					maxLength={40}
					onChange={(event) => change("name")(event.target.value, true)}
					onBlur={onCommit}
				/>
			</div>

			<div className="gp-grid-2">
				<div className="gp-field">
					<label htmlFor={typeId} className="gp-label">
						Shape
					</label>
					<select
						id={typeId}
						className="gp-select"
						value={layer.type}
						onChange={(event) =>
							change("type")(event.target.value as LayerType)
						}
					>
						{LAYER_TYPES.map((type) => (
							<option key={type} value={type}>
								{LAYER_TYPE_LABELS[type]}
							</option>
						))}
					</select>
				</div>
				<div className="gp-field">
					<label htmlFor={blendId} className="gp-label">
						Blend
					</label>
					<select
						id={blendId}
						className="gp-select"
						value={layer.blendMode}
						onChange={(event) =>
							change("blendMode")(event.target.value as BlendMode)
						}
					>
						{BLEND_MODES.map((mode) => (
							<option key={mode} value={mode}>
								{BLEND_LABELS[mode]}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="gp-colors">
				<ColorField
					label={COLOR_LABELS[layer.type][0]}
					value={layer.color}
					onChange={change("color")}
					onCommit={onCommit}
				/>
				<ColorField
					label={COLOR_LABELS[layer.type][1]}
					value={layer.color2}
					onChange={change("color2")}
					onCommit={onCommit}
				/>
			</div>

			<div className="gp-ranges">
				<RangeField
					label="Intensity"
					value={layer.opacity}
					min={0}
					max={100}
					unit="%"
					onChange={change("opacity")}
					onCommit={onCommit}
				/>
				<RangeField
					label="Blur"
					value={layer.blur}
					min={0}
					max={30}
					step={0.5}
					onChange={change("blur")}
					onCommit={onCommit}
				/>
				<div className="gp-grid-2">
					<RangeField
						label="Width"
						value={layer.width}
						min={1}
						max={250}
						unit="%"
						onChange={change("width")}
						onCommit={onCommit}
					/>
					<RangeField
						label="Height"
						value={layer.height}
						min={1}
						max={250}
						unit="%"
						onChange={change("height")}
						onCommit={onCommit}
					/>
					<RangeField
						label="X"
						value={layer.x}
						min={0}
						max={100}
						step={0.5}
						unit="%"
						onChange={change("x")}
						onCommit={onCommit}
					/>
					<RangeField
						label="Y"
						value={layer.y}
						min={0}
						max={100}
						step={0.5}
						unit="%"
						onChange={change("y")}
						onCommit={onCommit}
					/>
				</div>
				<RangeField
					label="Rotation"
					value={layer.rotation}
					min={-180}
					max={180}
					unit="°"
					onChange={change("rotation")}
					onCommit={onCommit}
				/>
			</div>
		</section>
	);
}

const ASPECT_OPTIONS = ASPECT_RATIOS.map((ratio) => ({
	value: ratio,
	label: ratio,
}));

function CanvasSettings({
	doc,
	textInk,
	onTextInk,
	onDocumentChange,
	onCommit,
}: InspectorProps) {
	const nameId = useId();
	return (
		<section className="gp-section" aria-labelledby="gp-canvas-title">
			<header className="gp-panel-head">
				<h2 id="gp-canvas-title" className="gp-panel-title">
					Canvas
				</h2>
			</header>

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

			<Segmented<AspectRatio>
				label="Aspect ratio"
				value={doc.aspectRatio}
				options={ASPECT_OPTIONS}
				onChange={(aspectRatio) => onDocumentChange({ aspectRatio })}
				className="gp-segmented--wrap"
			/>

			<ColorField
				label="Background"
				value={doc.background}
				onChange={(background, transient) =>
					onDocumentChange({ background }, transient)
				}
				onCommit={onCommit}
			/>

			<RangeField
				label="Grain"
				value={doc.grain}
				min={0}
				max={100}
				unit="%"
				onChange={(grain, transient) => onDocumentChange({ grain }, transient)}
				onCommit={onCommit}
			/>

			<Segmented<TextInk>
				label="Preview text ink"
				value={textInk}
				options={[
					{ value: "light", label: "Light" },
					{ value: "dark", label: "Dark" },
				]}
				onChange={onTextInk}
			/>
		</section>
	);
}
