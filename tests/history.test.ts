import assert from "node:assert/strict";
import { test } from "node:test";
import {
	initialHistory,
	reduceHistory,
} from "../src/components/studio/history";

test("a continuous drag creates exactly one undo entry", () => {
	let state = initialHistory(0);
	for (let value = 1; value <= 100; value++)
		state = reduceHistory(state, {
			type: "set",
			updater: value,
			transient: true,
		});
	assert.equal(state.past.length, 0);
	state = reduceHistory(state, { type: "commit" });
	assert.deepEqual(state.past, [0]);
	assert.equal(state.present, 100);
	state = reduceHistory(state, { type: "undo" });
	assert.equal(state.present, 0);
	state = reduceHistory(state, { type: "redo" });
	assert.equal(state.present, 100);
});

test("undo during an uncommitted gesture restores its anchor, not the previous edit", () => {
	let state = initialHistory("start");
	state = reduceHistory(state, {
		type: "set",
		updater: "first edit",
		transient: false,
	});
	state = reduceHistory(state, {
		type: "set",
		updater: "dragging",
		transient: true,
	});
	state = reduceHistory(state, { type: "undo" });
	assert.equal(state.present, "first edit");
	assert.deepEqual(state.past, ["start"]);
	state = reduceHistory(state, { type: "redo" });
	assert.equal(state.present, "dragging");
});

test("new edits invalidate redo immediately, including transient changes", () => {
	let state = initialHistory(0);
	state = reduceHistory(state, { type: "set", updater: 1, transient: false });
	state = reduceHistory(state, { type: "undo" });
	state = reduceHistory(state, { type: "set", updater: 2, transient: true });
	assert.deepEqual(state.future, []);
	assert.equal(reduceHistory(state, { type: "redo" }).present, 2);
});

test("document and preset selection undo atomically", () => {
	const a = { doc: { name: "Afterglow" }, presetId: "afterglow" };
	const b = { doc: { name: "Borealis" }, presetId: "borealis" };
	let state = initialHistory(a);
	state = reduceHistory(state, { type: "set", updater: b, transient: false });
	assert.deepEqual(reduceHistory(state, { type: "undo" }).present, a);
});

test("history stays bounded and no-op edits do not add entries", () => {
	let state = initialHistory(0);
	assert.equal(
		reduceHistory(state, { type: "set", updater: 0, transient: false }),
		state,
	);
	for (let i = 1; i <= 150; i++)
		state = reduceHistory(state, { type: "set", updater: i, transient: false });
	assert.equal(state.past.length, 120);
	assert.equal(state.past[0], 30);
});

test("freezing a frame preserves the next undo and redo operation", () => {
	let state = initialHistory({ color: "blue", phase: 0 });
	state = reduceHistory(state, {
		type: "set",
		updater: { color: "amber", phase: 0 },
		transient: false,
	});
	state = reduceHistory(state, {
		type: "replace",
		updater: (current) => ({ ...current, phase: 1.2345 }),
	});
	assert.equal(state.past.length, 1);
	assert.equal(state.present.phase, 1.2345);
	state = reduceHistory(state, { type: "undo" });
	assert.equal(state.present.color, "blue");
	state = reduceHistory(state, {
		type: "replace",
		updater: (current) => ({ ...current, phase: 3 }),
	});
	state = reduceHistory(state, { type: "redo" });
	assert.equal(state.present.color, "amber");
	assert.equal(state.present.phase, 1.2345);
});
