import assert from "node:assert/strict";
import { test } from "node:test";
import {
	loadDraft,
	loadFavorites,
	saveDraft,
	saveFavorites,
} from "../src/components/studio/storage";
import { DEFAULT_DOCUMENT, validateDocument } from "../src/lib/gradients/index";

test("drafts and favorites round trip without losing editable scene data", () => {
	const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
	const values = new Map<string, string>();
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			localStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value),
			},
		},
	});
	try {
		assert.equal(
			saveDraft({ document: DEFAULT_DOCUMENT, presetId: "cobalt-veil" }),
			true,
		);
		assert.deepEqual(validateDocument(loadDraft()?.document), DEFAULT_DOCUMENT);
		assert.equal(loadDraft()?.presetId, "cobalt-veil");
		assert.equal(saveFavorites(["afterglow", "borealis"]), true);
		assert.deepEqual(loadFavorites(), ["afterglow", "borealis"]);
		values.set("gradient-paradise:draft:v1", "old layered draft");
		assert.deepEqual(validateDocument(loadDraft()?.document), DEFAULT_DOCUMENT);
		assert.equal(values.get("gradient-paradise:draft:v1"), "old layered draft");
		values.set("gradient-paradise:draft:v2", "broken json");
		assert.equal(loadDraft(), null);
		values.set("gradient-paradise:favorites:v1", '[null,42,"afterglow"]');
		assert.deepEqual(loadFavorites(), ["afterglow"]);
	} finally {
		if (previous) Object.defineProperty(globalThis, "window", previous);
		else Reflect.deleteProperty(globalThis, "window");
	}
});

test("blocked or full browser storage fails gracefully", () => {
	const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			get localStorage() {
				throw new Error("Storage denied");
			},
		},
	});
	try {
		assert.equal(loadDraft(), null);
		assert.deepEqual(loadFavorites(), []);
		assert.equal(
			saveDraft({ document: DEFAULT_DOCUMENT, presetId: null }),
			false,
		);
		assert.equal(saveFavorites(["afterglow"]), false);
	} finally {
		if (previous) Object.defineProperty(globalThis, "window", previous);
		else Reflect.deleteProperty(globalThis, "window");
	}
});
