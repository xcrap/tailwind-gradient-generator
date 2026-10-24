import {
	createFieldProgram,
	FIELD_FRAGMENT,
	FIELD_VERTEX,
	fieldDataUrl,
	fieldPngBlob,
} from "./field";
import { validateDocument } from "./model";
import { getDimensions, renderSVG, svgDataUrl } from "./render";
import type { CodeFormat, ExportFormat, GradientDocument } from "./types";

const escapeHTML = (text: string) =>
	text.replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			] ?? c,
	);

export function exportCode(
	input: GradientDocument,
	format: CodeFormat,
): string {
	const doc = validateDocument(input);
	if (!doc) throw new Error("This gradient project is invalid.");
	if (format === "json") return JSON.stringify(doc, null, 2);
	if (doc.field) return exportFieldCode(doc, format);
	if (format === "svg") return renderSVG(doc);
	const url = svgDataUrl(doc).replace(/'/g, "%27");
	const ratio = doc.aspectRatio.replace(":", " / ");
	const css = `/* Gradient Paradise — SVG-powered CSS preserves every layer and effect. */\n.gradient-paradise {\n  background-color: ${doc.background};\n  background-image: url("${url}");\n  background-size: 100% 100%;\n  background-repeat: no-repeat;\n  aspect-ratio: ${ratio};\n  width: 100%;\n  overflow: hidden;\n}`;
	if (format === "css") return css;
	if (format === "tailwind")
		return `<!-- Tailwind CSS v4. The inline SVG background preserves all layers and effects. -->\n<div class="relative w-full overflow-hidden bg-no-repeat bg-[length:100%_100%]"\n  style="aspect-ratio: ${ratio}; background-color: ${doc.background}; background-image: url('${url}');">\n  <!-- Your content -->\n</div>`;
	return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${escapeHTML(doc.name)}</title>\n  <style>\n    body { margin: 0; background: ${doc.background}; }\n    ${css}\n  </style>\n</head>\n<body>\n  <div class="gradient-paradise"></div>\n</body>\n</html>`;
}

async function pngBlob(doc: GradientDocument, width: number): Promise<Blob> {
	const dimensions = getDimensions(doc.aspectRatio, width);
	if (doc.field) return fieldPngBlob(doc, dimensions.width);
	const source = renderSVG(doc).replace(
		/width="\d+" height="\d+"/,
		`width="${dimensions.width}" height="${dimensions.height}"`,
	);
	const url = URL.createObjectURL(
		new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
	);
	try {
		const image = new Image();
		image.decoding = "async";
		await new Promise<void>((resolve, reject) => {
			const timer = window.setTimeout(
				() =>
					reject(
						new Error(
							"The image took too long to render. Try a smaller export.",
						),
					),
				15000,
			);
			image.onload = () => {
				window.clearTimeout(timer);
				resolve();
			};
			image.onerror = () => {
				window.clearTimeout(timer);
				reject(
					new Error(
						"Your browser could not render this gradient. Try SVG export.",
					),
				);
			};
			image.src = url;
		});
		const canvas = document.createElement("canvas");
		canvas.width = dimensions.width;
		canvas.height = dimensions.height;
		const context = canvas.getContext("2d");
		if (!context)
			throw new Error(
				"PNG export is not available in this browser. Use SVG instead.",
			);
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) =>
					blob
						? resolve(blob)
						: reject(
								new Error("Could not create the PNG. Try a smaller size."),
							),
				"image/png",
			),
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function exportDownload(
	input: GradientDocument,
	format: ExportFormat,
	width = 1920,
): Promise<void> {
	const doc = validateDocument(input);
	if (!doc) throw new Error("This gradient project is invalid.");
	const mime = {
		svg: "image/svg+xml",
		css: "text/css",
		html: "text/html",
		tailwind: "text/html",
		json: "application/json",
	};
	let blob: Blob;
	if (format === "png") blob = await pngBlob(doc, width);
	else {
		let code = exportCode(doc, format);
		if (format === "svg") {
			const size = getDimensions(doc.aspectRatio, width);
			code = code.replace(
				/width="\d+" height="\d+"/,
				`width="${size.width}" height="${size.height}"`,
			);
		}
		blob = new Blob([code], { type: `${mime[format]};charset=utf-8` });
	}
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${
		doc.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "gradient"
	}${format === "tailwind" ? "-tailwind" : ""}.${format === "tailwind" ? "html" : format}`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFieldCode(
	doc: GradientDocument,
	format: Exclude<CodeFormat, "json">,
): string {
	const ratio = doc.aspectRatio.replace(":", " / ");
	if (format === "html") {
		// The factory has no module-scope dependencies, so its compiled function can
		// ship alongside the exact same shaders without a bundler or CDN dependency.
		const config = JSON.stringify(doc).replace(/</g, "\\u003c");
		return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(doc.name)}</title>
<style>html,body{margin:0;height:100%;background:${doc.background}}canvas{display:block;width:100%;height:100%}p{color:#eee;font:16px system-ui;padding:2rem}</style></head>
<body><canvas id="gradient" role="img" aria-label="${escapeHTML(doc.name)}">A softly moving gradient.</canvas>
<script>
const createProgram=${createFieldProgram.toString()};
const vertex=${JSON.stringify(FIELD_VERTEX)};
const fragment=${JSON.stringify(FIELD_FRAGMENT)};
const scene=${config};
const canvas=document.getElementById('gradient');
try{
 const renderer=createProgram(canvas,vertex,fragment);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let last=0,elapsed=0;
 function draw(now){
  if(last&&!document.hidden&&!reduced.matches)elapsed+=Math.min((now-last)/1000,.1);last=now;
  const dpr=Math.min(devicePixelRatio||1,2);
  renderer.render(scene,scene.field.phase+elapsed*scene.field.speed/100*.65,Math.round(canvas.clientWidth*dpr),Math.round(canvas.clientHeight*dpr));
  requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
}catch(error){canvas.outerHTML='<p>This background requires WebGL graphics acceleration.</p>';}
</script></body></html>`;
	}
	const size = getDimensions(doc.aspectRatio, format === "svg" ? 1920 : 1280);
	const url = fieldDataUrl(doc, size.width);
	if (format === "svg")
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><title>${escapeHTML(doc.name)}</title><desc>Still frame from a procedural gradient. The artwork is an embedded PNG image.</desc><image width="100%" height="100%" href="${url}"/></svg>`;
	if (format === "tailwind")
		return `<!-- Tailwind CSS v4. Still frame from Gradient Paradise. Use HTML export for a live animated canvas. -->\n<div class="relative w-full bg-cover bg-center" style="aspect-ratio:${ratio};background-image:url('${url}')">\n  <!-- Your content -->\n</div>`;
	return `/* Gradient Paradise: a captured still frame. Use HTML export for animation. */\n.gradient-paradise {\n  width: 100%;\n  aspect-ratio: ${ratio};\n  background: ${doc.background} url("${url}") center / cover no-repeat;\n}`;
}
