const LIMIT = 120;
export type Updater<T> = T | ((previous: T) => T);
export interface HistoryState<T> {
	past: T[];
	present: T;
	future: T[];
	anchor: T | null;
}
export type HistoryAction<T> =
	| { type: "set"; updater: Updater<T>; transient: boolean }
	| { type: "replace"; updater: Updater<T> }
	| { type: "commit" | "undo" | "redo" };
export const initialHistory = <T>(value: T): HistoryState<T> => ({
	past: [],
	present: value,
	future: [],
	anchor: null,
});

export function reduceHistory<T>(
	state: HistoryState<T>,
	action: HistoryAction<T>,
): HistoryState<T> {
	if (action.type === "replace") {
		const present =
			typeof action.updater === "function"
				? (action.updater as (previous: T) => T)(state.present)
				: action.updater;
		return Object.is(present, state.present) ? state : { ...state, present };
	}
	if (action.type === "set") {
		const next =
			typeof action.updater === "function"
				? (action.updater as (previous: T) => T)(state.present)
				: action.updater;
		if (Object.is(next, state.present)) return state;
		if (action.transient)
			return {
				...state,
				present: next,
				anchor: state.anchor ?? state.present,
				future: [],
			};
		return {
			past: [...state.past, state.anchor ?? state.present].slice(-LIMIT),
			present: next,
			future: [],
			anchor: null,
		};
	}
	if (action.type === "commit") {
		if (state.anchor === null) return state;
		if (Object.is(state.anchor, state.present))
			return { ...state, anchor: null };
		return {
			past: [...state.past, state.anchor].slice(-LIMIT),
			present: state.present,
			future: [],
			anchor: null,
		};
	}
	if (action.type === "undo") {
		if (state.anchor !== null)
			return {
				...state,
				present: state.anchor,
				future: [state.present, ...state.future],
				anchor: null,
			};
		const previous = state.past[state.past.length - 1];
		if (previous === undefined) return state;
		return {
			past: state.past.slice(0, -1),
			present: previous,
			future: [state.present, ...state.future],
			anchor: null,
		};
	}
	const [next, ...future] = state.future;
	if (next === undefined) return state;
	return {
		past: [...state.past, state.present].slice(-LIMIT),
		present: next,
		future,
		anchor: null,
	};
}
