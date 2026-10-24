import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ASPECT_RATIOS,
	cloneDocument,
	createLayer,
	DEFAULT_DOCUMENT,
	exportCode,
	FIELD_FRAGMENT,
	FIELD_MODES,
	getDimensions,
	PRESETS,
	randomizeDocument,
	renderSVG,
	svgDataUrl,
	validateDocument,
} from "../src/lib/gradients/index";

const LEGACY_DOCUMENT = {
	...cloneDocument(DEFAULT_DOCUMENT),
	field: undefined,
	layers: [
		createLayer("radial"),
		createLayer("beam"),
		createLayer("aurora"),
		createLayer("ring"),
	],
};

test("all curated scenes validate and every SVG reference resolves", () => {
	assert.ok(PRESETS.length >= 30);
	assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
	for (const preset of PRESETS) {
		const validated = validateDocument(preset.document);
		assert.deepEqual(validated, preset.document, preset.name);
		const svg = renderSVG(preset.document);
		const ids = Array.from(svg.matchAll(/ id="([^"]+)"/g), (match) => match[1]);
		assert.equal(new Set(ids).size, ids.length, preset.name);
		for (const match of svg.matchAll(/url\(#([^)]+)\)/g))
			assert.ok(ids.includes(match[1]), `${preset.name}: ${match[1]}`);
		assert.doesNotMatch(
			svg,
			/NaN|Infinity|undefined|foreignObject|<script|https?:\/\/(?!www.w3.org)/,
		);
	}
});

test("SVG, CSS, and URL exports share exactly the same scene", () => {
	for (const preset of PRESETS) {
		const { field: _field, ...doc } = preset.document;
		const svg = renderSVG(doc);
		assert.equal(exportCode(doc, "svg"), svg);
		assert.equal(
			decodeURIComponent(svgDataUrl(doc).split(",").slice(1).join(",")),
			svg,
		);
		const embedded = exportCode(doc, "css").match(
			/background-image: url\("data:image\/svg\+xml,([^"]+)"\)/,
		)?.[1];
		assert.ok(embedded);
		assert.equal(decodeURIComponent(embedded), svg);
		assert.deepEqual(JSON.parse(exportCode(doc, "json")), doc);
	}
});

test("hidden and zero-opacity layers do not appear in export; ordering stays intact", () => {
	const doc = cloneDocument(LEGACY_DOCUMENT);
	doc.grain = 0;
	doc.layers[0].visible = false;
	doc.layers[1].opacity = 0;
	doc.layers[2].opacity = 25;
	const svg = renderSVG(doc);
	assert.doesNotMatch(svg, /id="gp-[01]-/);
	assert.match(svg, /<g opacity="0.25"/);
	assert.ok(svg.indexOf('id="gp-2-radial"') < svg.indexOf('id="gp-3-radial"'));
});

test("corrupt storage is rejected, numeric extremes are bounded, and identifiers deduplicated", () => {
	for (const bad of [
		null,
		[],
		{},
		{ version: 2, layers: [] },
		{ version: 1, layers: [null] },
		{ version: 1, layers: Array(25).fill({}) },
	])
		assert.equal(validateDocument(bad), null);
	const doc = cloneDocument(LEGACY_DOCUMENT);
	doc.layers[0].x = Infinity;
	doc.layers[0].opacity = -30;
	doc.layers[0].width = 100000;
	doc.layers[1].id = doc.layers[0].id;
	const restored = validateDocument(doc);
	assert.ok(restored);
	assert.equal(restored.layers[0].x, 50);
	assert.equal(restored.layers[0].opacity, 0);
	assert.equal(restored.layers[0].width, 250);
	assert.notEqual(restored.layers[0].id, restored.layers[1].id);
});

test("project text and invalid colors cannot inject SVG or HTML", () => {
	const doc = cloneDocument(LEGACY_DOCUMENT);
	doc.name = '<script>alert("x")</script> & "test"';
	doc.background = '#fff"/><script>alert(1)</script>';
	doc.layers[0].color = "url(https://example.com/tracker)";
	doc.layers[0].id = '"><script>';
	const svg = renderSVG(doc);
	assert.doesNotMatch(svg, /<script|alert\(1\)|https:\/\/example.com/);
	assert.match(svg, /&lt;script&gt;/);
	assert.doesNotMatch(exportCode(doc, "html"), /<script/);
	assert.match(exportCode(doc, "html"), /&lt;script&gt;/);
});

test("all supported aspect ratios produce positive bounded export dimensions", () => {
	for (const ratio of ASPECT_RATIOS) {
		const [x, y] = ratio.split(":").map(Number);
		const result = getDimensions(ratio, 1920);
		assert.equal(result.width, 1920);
		assert.equal(result.height, Math.round((1920 * y) / x));
		assert.ok(getDimensions(ratio, 100000).height <= 7282);
	}
	assert.equal(getDimensions("1:1", -1).width, 64);
	assert.equal(getDimensions("1:1", NaN).width, 1920);
});

test("cloning and shuffle leave presets untouched and generate valid projects", () => {
	const before = JSON.stringify(DEFAULT_DOCUMENT);
	const clone = cloneDocument(DEFAULT_DOCUMENT);
	clone.layers[0].color = "#ff0000";
	assert.equal(JSON.stringify(DEFAULT_DOCUMENT), before);
	for (let index = 0; index < 30; index++)
		assert.ok(validateDocument(randomizeDocument(DEFAULT_DOCUMENT)));
	assert.equal(JSON.stringify(DEFAULT_DOCUMENT), before);
});

test("grain and all layer primitives survive export without external assets", () => {
	const doc = cloneDocument(LEGACY_DOCUMENT);
	doc.grain = 80;
	assert.match(renderSVG(doc), /feTurbulence/);
	doc.grain = 0;
	assert.doesNotMatch(renderSVG(doc), /feTurbulence/);
	const combined = renderSVG(LEGACY_DOCUMENT);
	assert.match(combined, /<path /);
	assert.match(combined, /stroke-width=/);
	assert.match(combined, /<ellipse /);
});

test("procedural presets cover every mode and preserve six validated color stops", () => {
	assert.deepEqual(
		new Set(PRESETS.map((p) => p.document.field?.mode)),
		new Set(FIELD_MODES),
	);
	for (const preset of PRESETS) {
		assert.equal(preset.document.field?.palette.length, 6);
		assert.deepEqual(
			JSON.parse(exportCode(preset.document, "json")),
			preset.document,
		);
	}
	const doc = cloneDocument(DEFAULT_DOCUMENT);
	assert.ok(doc.field);
	doc.field.palette = ["url(https://example.com)", "#123456"];
	doc.field.phase = Infinity;
	doc.field.softness = -1;
	doc.field.x = 1000;
	const safe = validateDocument(doc);
	assert.ok(safe?.field);
	assert.equal(safe.field.palette.length, 6);
	assert.equal(safe.field.palette[1], "#123456");
	assert.equal(safe.field.phase, 0);
	assert.equal(safe.field.softness, 0);
	assert.equal(safe.field.x, 100);
});

test("animated HTML contains the shared shader and escapes project text", () => {
	const doc = cloneDocument(DEFAULT_DOCUMENT);
	doc.name = '</script><script>alert("injected")</script>';
	const html = exportCode(doc, "html");
	assert.ok(html.includes(JSON.stringify(FIELD_FRAGMENT)));
	assert.equal((html.match(/<script>/g) || []).length, 1);
	assert.match(html, /prefers-reduced-motion/);
	assert.match(html, /requestAnimationFrame/);
	assert.doesNotMatch(html, /<script>alert/);
	assert.match(html, /\\u003c/);
});
