export const LAYER_TYPES = [
	"beam",
	"radial",
	"linear",
	"ring",
	"aurora",
] as const;
export type LayerType = (typeof LAYER_TYPES)[number];
export const BLEND_MODES = [
	"normal",
	"screen",
	"multiply",
	"overlay",
	"soft-light",
	"color-dodge",
	"lighten",
] as const;
export type BlendMode = (typeof BLEND_MODES)[number];
export const ASPECT_RATIOS = [
	"16:10",
	"16:9",
	"1:1",
	"4:5",
	"9:16",
	"21:9",
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export const FIELD_MODES = [
	"beam",
	"mesh",
	"aurora",
	"halo",
	"edge",
	"silk",
] as const;
export type FieldMode = (typeof FIELD_MODES)[number];
export interface GradientField {
	mode: FieldMode;
	palette: string[];
	angle: number;
	x: number;
	y: number;
	softness: number;
	spread: number;
	curve: number;
	detail: number;
	speed: number;
	seed: number;
	phase: number;
}
export interface GradientLayer {
	id: string;
	name: string;
	type: LayerType;
	color: string;
	color2: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	opacity: number;
	blur: number;
	blendMode: BlendMode;
	visible: boolean;
}
export interface GradientDocument {
	version: 1;
	name: string;
	background: string;
	grain: number;
	aspectRatio: AspectRatio;
	layers: GradientLayer[];
	field?: GradientField;
}
export interface GradientPreset {
	id: string;
	name: string;
	category: string;
	description: string;
	document: GradientDocument;
}
export type CodeFormat = "css" | "tailwind" | "svg" | "html" | "json";
export type ExportFormat = CodeFormat | "png";
