import { useCallback, useState } from "react";
import { initialHistory, reduceHistory, type Updater } from "./history";

export type { Updater } from "./history";

/** Coalesces each slider or pointer gesture into one undo step. */
export function useHistory<T>(initial: () => T) {
	const [state, setState] = useState(() => initialHistory(initial()));
	const set = useCallback(
		(updater: Updater<T>, transient = false) =>
			setState((s) => reduceHistory(s, { type: "set", updater, transient })),
		[],
	);
	const commit = useCallback(
		() => setState((s) => reduceHistory(s, { type: "commit" })),
		[],
	);
	const replace = useCallback(
		(updater: Updater<T>) =>
			setState((s) => reduceHistory(s, { type: "replace", updater })),
		[],
	);
	const undo = useCallback(
		() => setState((s) => reduceHistory(s, { type: "undo" })),
		[],
	);
	const redo = useCallback(
		() => setState((s) => reduceHistory(s, { type: "redo" })),
		[],
	);
	return {
		value: state.present,
		set,
		replace,
		commit,
		undo,
		redo,
		canUndo: state.past.length > 0 || state.anchor !== null,
		canRedo: state.future.length > 0,
	};
}
