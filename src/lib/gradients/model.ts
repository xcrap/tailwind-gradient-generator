import {
	ASPECT_RATIOS,
	BLEND_MODES,
	FIELD_MODES,
	FIELD_VARIANTS,
	type FieldVariant,
	type GradientDocument,
	type GradientField,
	type GradientLayer,
	LAYER_TYPES,
	type LayerType,
} from "./types";

const hex = /^#[\da-f]{6}$/i;
export const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));
const number = (value: unknown, fallback: number, min: number, max: number) =>
	typeof value === "number" && Number.isFinite(value)
		? clamp(value, min, max)
		: fallback;
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, fallback: string, limit = 80) =>
	typeof value === "string" && value.trim()
		? value.trim().slice(0, limit)
		: fallback;
const color = (value: unknown, fallback: string) =>
	typeof value === "string" && hex.test(value) ? value.toLowerCase() : fallback;

export function createLayer(type: LayerType = "radial"): GradientLayer {
	return {
		id: crypto.randomUUID(),
		name: {
			beam: "Light beam",
			radial: "Soft glow",
			linear: "Color wash",
			ring: "Halo",
			aurora: "Aurora",
		}[type],
		type,
		color: "#7d72ff",
		color2: "#f6dfff",
		x: 50,
		y: 50,
		width: type === "beam" ? 180 : 100,
		height: type === "beam" ? 8 : 100,
		rotation: type === "beam" ? -28 : 0,
		opacity: 90,
		blur: 4,
		blendMode: "screen",
		visible: true,
	};
}

/** Validate stored/imported projects and bound every value used in SVG or CSS. */
export function validateDocument(value: unknown): GradientDocument | null {
	if (
		!record(value) ||
		value.version !== 1 ||
		!Array.isArray(value.layers) ||
		!value.layers.length ||
		value.layers.length > 24
	)
		return null;
	if (!value.layers.every(record)) return null;
	const seen = new Set<string>();
	const layers: GradientLayer[] = value.layers.map((entry, index) => {
		const layer = entry as Record<string, unknown>;
		let id =
			text(layer.id, `layer-${index}`)
				.replace(/[^a-z\d_-]/gi, "")
				.slice(0, 64) || `layer-${index}`;
		while (seen.has(id)) id = `${id}-${index}`;
		seen.add(id);
		return {
			id,
			name: text(layer.name, `Layer ${index + 1}`),
			type: LAYER_TYPES.includes(layer.type as LayerType)
				? (layer.type as LayerType)
				: "radial",
			color: color(layer.color, "#7d72ff"),
			color2: color(layer.color2, "#f6dfff"),
			x: number(layer.x, 50, 0, 100),
			y: number(layer.y, 50, 0, 100),
			width: number(layer.width, 100, 1, 250),
			height: number(layer.height, 100, 1, 250),
			rotation: number(layer.rotation, 0, -180, 180),
			opacity: number(layer.opacity, 100, 0, 100),
			blur: number(layer.blur, 0, 0, 30),
			blendMode: BLEND_MODES.includes(
				layer.blendMode as GradientLayer["blendMode"],
			)
				? (layer.blendMode as GradientLayer["blendMode"])
				: "normal",
			visible: layer.visible !== false,
		};
	});
	return {
		version: 1,
		name: text(value.name, "Untitled gradient"),
		background: color(value.background, "#10101b"),
		grain: number(value.grain, 0, 0, 100),
		aspectRatio: ASPECT_RATIOS.includes(
			value.aspectRatio as GradientDocument["aspectRatio"],
		)
			? (value.aspectRatio as GradientDocument["aspectRatio"])
			: "16:10",
		layers,
		...(record(value.field) ? { field: validateField(value.field) } : {}),
	};
}

export function validateField(value: Record<string, unknown>): GradientField {
	const mode = FIELD_MODES.includes(value.mode as GradientField["mode"])
		? (value.mode as GradientField["mode"])
		: "beam";
	const variants: readonly string[] =
		FIELD_VARIANTS[mode as keyof typeof FIELD_VARIANTS] ?? [];
	const fallback = [
		"#070b17",
		"#101f40",
		"#244489",
		"#487dc9",
		"#9cc8ef",
		"#f1f8fb",
	];
	return {
		mode,
		...(variants.includes(value.variant as string)
			? { variant: value.variant as FieldVariant }
			: {}),
		palette: fallback.map((hex, index) =>
			color(
				Array.isArray(value.palette) ? value.palette[index] : undefined,
				hex,
			),
		),
		angle: number(value.angle, 22, -180, 180),
		x: number(value.x, 50, 0, 100),
		y: number(value.y, 46, 0, 100),
		softness: number(value.softness, 62, 0, 100),
		spread: number(value.spread, 42, 0, 100),
		curve: number(value.curve, 35, 0, 100),
		detail: number(value.detail, 35, 0, 100),
		speed: number(value.speed, 22, 0, 100),
		seed: number(value.seed, 21, 0, 1000),
		phase: number(value.phase, 0, 0, 1000000),
	};
}

export const cloneDocument = (doc: GradientDocument): GradientDocument =>
	structuredClone(doc);

const palettes = [
	["#0c1023", "#577bff", "#c8b9ff", "#ff9cbb"],
	["#170e22", "#ff4e85", "#ffc07b", "#8e62ff"],
	["#0a1a18", "#31dba8", "#d2fa99", "#499fda"],
	["#24140e", "#ff683e", "#ffe3aa", "#ba1c60"],
	["#131524", "#a9a9ff", "#f7d9ff", "#558bff"],
	["#160e10", "#e82545", "#ffcf7b", "#8036d0"],
	["#0c1820", "#1e8caf", "#9be8d8", "#5b68ff"],
	["#221511", "#d49d60", "#fff2ce", "#b66482"],
];
export function randomizeDocument(doc: GradientDocument): GradientDocument {
	if (doc.field) {
		const fieldPalettes = [
			["#070b16", "#102148", "#244b99", "#4f86ce", "#a0c7e9", "#f0f7fa"],
			["#130c09", "#3a1c0d", "#8f4219", "#cd7b35", "#f2c68b", "#fff1d7"],
			["#1b101b", "#49233c", "#96546d", "#c88e9c", "#ead1cf", "#fff1e9"],
			["#071612", "#103e36", "#286c5b", "#62a88a", "#b9d9b5", "#eff6dd"],
			["#10101b", "#32304b", "#6b648d", "#aaa3c4", "#dad5e9", "#f5f1fa"],
		];
		const palette =
			fieldPalettes[Math.floor(Math.random() * fieldPalettes.length)];
		return {
			...cloneDocument(doc),
			name: "Untitled study",
			background: palette[0],
			field: {
				...doc.field,
				palette: [...palette],
				seed: Math.round(Math.random() * 100),
				phase: 0,
			},
		};
	}
	const palette = palettes[Math.floor(Math.random() * palettes.length)];
	return {
		...cloneDocument(doc),
		name: "Happy accident",
		background: palette[0],
		layers: doc.layers.map((layer, index) => ({
			...layer,
			color: palette[1 + (index % 3)],
			color2: palette[1 + ((index + 1) % 3)],
			rotation: clamp(
				layer.rotation + Math.round(Math.random() * 30 - 15),
				-180,
				180,
			),
		})),
	};
}
