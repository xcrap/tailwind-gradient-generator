// Historical keys intentionally retained to preserve existing drafts and favorites.
// v1 drafts (layered scenes) stay untouched under their old key.
const DRAFT_KEY = "gradient-paradise:draft:v2";
const FAVORITES_KEY = "gradient-paradise:favorites:v1";

function read(key: string): unknown {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): boolean {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

export interface StoredDraft {
	document: unknown;
	presetId: string | null;
}

export function loadDraft(): StoredDraft | null {
	const value = read(DRAFT_KEY);
	if (!value || typeof value !== "object" || !("document" in value)) {
		return null;
	}
	const presetId = (value as { presetId?: unknown }).presetId;
	return {
		document: (value as { document: unknown }).document,
		presetId: typeof presetId === "string" ? presetId : null,
	};
}

export function saveDraft(draft: StoredDraft): boolean {
	return write(DRAFT_KEY, draft);
}

export function loadFavorites(): string[] {
	const value = read(FAVORITES_KEY);
	return Array.isArray(value)
		? value.filter((id): id is string => typeof id === "string")
		: [];
}

export function saveFavorites(ids: string[]): boolean {
	return write(FAVORITES_KEY, ids);
}
