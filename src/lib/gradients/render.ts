import { validateDocument } from "./model";
import type { AspectRatio, GradientDocument, GradientLayer } from "./types";

const xml = (value: string) =>
	value.replace(
		/[<>&"']/g,
		(character) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[character] ?? character,
	);
const n = (value: number) => Number(value.toFixed(3));

export function getDimensions(aspectRatio: AspectRatio, width = 1920) {
	const [x, y] = aspectRatio.split(":").map(Number);
	const safeWidth = Math.max(
		64,
		Math.min(4096, Number.isFinite(width) ? Math.round(width) : 1920),
	);
	return { width: safeWidth, height: Math.round((safeWidth * y) / x) };
}

function layerMarkup(
	layer: GradientLayer,
	index: number,
	canvasWidth: number,
	canvasHeight: number,
) {
	if (!layer.visible || layer.opacity === 0) return "";
	const id = `gp-${index}`;
	const w = n((canvasWidth * layer.width) / 100);
	const h = n((canvasHeight * layer.height) / 100);
	const x = n((canvasWidth * layer.x) / 100);
	const y = n((canvasHeight * layer.y) / 100);
	const c = layer.color;
	const c2 = layer.color2;
	const radial = `<radialGradient id="${id}-radial"><stop offset="0" stop-color="${c2}"/><stop offset=".18" stop-color="${c}" stop-opacity=".95"/><stop offset=".5" stop-color="${c}" stop-opacity=".48"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
	const linear = `<linearGradient id="${id}-linear" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
	let shape = "";
	let definitions = radial + linear;
	switch (layer.type) {
		case "linear":
			shape = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#${id}-linear)"/>`;
			break;
		case "ring":
			shape = `<ellipse rx="${w / 2}" ry="${h / 2}" fill="none" stroke="url(#${id}-linear)" stroke-width="${n(Math.max(1.5, Math.min(w, h) * 0.028))}"/>`;
			break;
		case "aurora":
			definitions += `<linearGradient id="${id}-curtain" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${c2}" stop-opacity="0"/><stop offset=".28" stop-color="${c2}" stop-opacity=".85"/><stop offset=".52" stop-color="${c}" stop-opacity=".65"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
			shape = `<path d="M ${-w / 2} ${h * 0.1} C ${-w * 0.25} ${-h * 0.9}, ${w * 0.05} ${h * 0.65}, ${w / 2} ${-h * 0.4} L ${w / 2} ${h * 0.35} C ${w * 0.05} ${h * 1.2}, ${-w * 0.25} ${-h * 0.15}, ${-w / 2} ${h * 0.85} Z" fill="url(#${id}-curtain)"/>`;
			break;
		case "beam":
			definitions += `<radialGradient id="${id}-core"><stop stop-color="${c2}" stop-opacity=".95"/><stop offset=".22" stop-color="${c2}" stop-opacity=".8"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
			shape = `<ellipse rx="${w / 2}" ry="${h / 2}" fill="url(#${id}-radial)"/><ellipse rx="${w * 0.44}" ry="${Math.max(0.4, h * 0.085)}" fill="url(#${id}-core)"/>`;
			break;
		default:
			shape = `<ellipse rx="${w / 2}" ry="${h / 2}" fill="url(#${id}-radial)"/>`;
	}
	const filter = layer.blur ? ` filter="url(#${id}-blur)"` : "";
	if (layer.blur) {
		const padding = layer.blur * 4 + Math.min(w, h) * 0.03;
		const top = layer.type === "aurora" ? -h : -h / 2;
		const extent = layer.type === "aurora" ? h * 2.3 : h;
		definitions += `<filter id="${id}-blur" filterUnits="userSpaceOnUse" x="${n(-w / 2 - padding)}" y="${n(top - padding)}" width="${n(w + padding * 2)}" height="${n(extent + padding * 2)}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${n(layer.blur)}"/></filter>`;
	}
	return `<g opacity="${n(layer.opacity / 100)}" style="mix-blend-mode:${layer.blendMode}"><defs>${definitions}</defs><g transform="translate(${x} ${y}) rotate(${n(layer.rotation)})"${filter}>${shape}</g></g>`;
}

/** The preview and every exported format use this same native SVG scene. */
export function renderSVG(input: GradientDocument): string {
	const doc = validateDocument(input);
	if (!doc) throw new Error("This gradient project is invalid.");
	const [rx, ry] = doc.aspectRatio.split(":").map(Number);
	const width = 1000;
	const height = n((width * ry) / rx);
	const { width: outWidth, height: outHeight } = getDimensions(doc.aspectRatio);
	const grain =
		doc.grain > 0
			? `<defs><filter id="gp-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" stitchTiles="stitch" seed="8"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" filter="url(#gp-grain)" opacity="${n((doc.grain / 100) * 0.3)}" style="mix-blend-mode:soft-light"/>`
			: "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" viewBox="0 0 ${width} ${height}" fill="none"><title>${xml(doc.name)}</title><defs><clipPath id="gp-canvas"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#gp-canvas)" style="isolation:isolate"><rect width="${width}" height="${height}" fill="${doc.background}"/>${doc.layers.map((layer, index) => layerMarkup(layer, index, width, height)).join("")}${grain}</g></svg>`;
}

export const svgDataUrl = (doc: GradientDocument) =>
	`data:image/svg+xml,${encodeURIComponent(renderSVG(doc))}`;
