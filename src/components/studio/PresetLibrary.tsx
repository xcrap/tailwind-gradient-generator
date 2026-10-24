import { Heart, Search, X } from "lucide-react";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
	CATEGORIES,
	type GradientPreset,
	PRESETS,
	previewDataUrl,
} from "@/lib/gradients";

/* ---------- Thumbnails ----------
 * Rendered once each by the shared engine, one per idle slot, then cached
 * for the session. Never more than one snapshot in flight.
 */

const THUMB_WIDTH = 160;
const thumbCache = new Map<string, string | null>();
const thumbRequests = new Map<string, Promise<string | null>>();
let thumbChain: Promise<unknown> = Promise.resolve();

const idle = () =>
	new Promise<void>((resolve) => {
		if (typeof window.requestIdleCallback === "function") {
			window.requestIdleCallback(() => resolve(), { timeout: 400 });
		} else {
			window.setTimeout(resolve, 16);
		}
	});

function requestThumbnail(preset: GradientPreset): Promise<string | null> {
	if (thumbCache.has(preset.id)) {
		return Promise.resolve(thumbCache.get(preset.id) ?? null);
	}
	let request = thumbRequests.get(preset.id);
	if (!request) {
		request = thumbChain.then(async () => {
			await idle();
			try {
				const url = await previewDataUrl(
					{ ...preset.document, grain: 0 },
					THUMB_WIDTH,
				);
				thumbCache.set(preset.id, url || null);
			} catch {
				thumbCache.set(preset.id, null);
			}
			return thumbCache.get(preset.id) ?? null;
		});
		thumbChain = request;
		thumbRequests.set(preset.id, request);
	}
	return request;
}

function useThumbnail(preset: GradientPreset) {
	const [url, setUrl] = useState(() => thumbCache.get(preset.id) ?? null);
	useEffect(() => {
		let live = true;
		requestThumbnail(preset).then((next) => {
			if (live) setUrl(next);
		});
		return () => {
			live = false;
		};
	}, [preset]);
	return url;
}

/* ---------- Library ---------- */

const ALL = "All";
const FAVORITES = "Favorites";

interface PresetLibraryProps {
	activePresetId: string | null;
	favorites: string[];
	onApply: (preset: GradientPreset) => void;
	onToggleFavorite: (id: string) => void;
}

export function PresetLibrary({
	activePresetId,
	favorites,
	onApply,
	onToggleFavorite,
}: PresetLibraryProps) {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState(ALL);
	const deferredQuery = useDeferredValue(query);

	const results = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		return PRESETS.filter((preset) => {
			if (category === FAVORITES && !favorites.includes(preset.id))
				return false;
			if (
				category !== ALL &&
				category !== FAVORITES &&
				preset.category !== category
			) {
				return false;
			}
			if (!needle) return true;
			return `${preset.name} ${preset.category} ${preset.description}`
				.toLowerCase()
				.includes(needle);
		});
	}, [deferredQuery, category, favorites]);

	const filters = [ALL, FAVORITES, ...CATEGORIES];

	return (
		<section className="gp-library" aria-labelledby="gp-library-title">
			<div className="gp-section__head">
				<h2 id="gp-library-title" className="gp-overline">
					Presets
				</h2>
				<span className="gp-note">{PRESETS.length}</span>
			</div>

			<div className="gp-search">
				<Search aria-hidden="true" size={14} />
				<label htmlFor="gp-preset-search" className="sr-only">
					Search presets
				</label>
				<input
					id="gp-preset-search"
					type="search"
					placeholder="Search light, silk, dusk…"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				{query && (
					<button
						type="button"
						className="gp-search__clear"
						aria-label="Clear search"
						onClick={() => setQuery("")}
					>
						<X size={13} aria-hidden="true" />
					</button>
				)}
			</div>

			<fieldset className="gp-chips" aria-label="Filter presets by category">
				{filters.map((name) => (
					<button
						key={name}
						type="button"
						className="gp-chip"
						aria-pressed={category === name}
						onClick={() => setCategory(name)}
					>
						{name === FAVORITES && <Heart size={11} aria-hidden="true" />}
						{name}
						{name === FAVORITES && favorites.length > 0 && (
							<span className="gp-chip__count">{favorites.length}</span>
						)}
					</button>
				))}
			</fieldset>

			<p className="sr-only" aria-live="polite">
				{results.length} presets shown
			</p>

			{results.length === 0 ? (
				<div className="gp-empty">
					{category === FAVORITES && !deferredQuery ? (
						<p>
							Use the heart on any preset to keep it here. Favorites stay in
							this browser.
						</p>
					) : (
						<p>Nothing matches “{deferredQuery}”. Try a colour or a mood.</p>
					)}
				</div>
			) : (
				<ul className="gp-preset-list">
					{results.map((preset) => (
						<PresetRow
							key={preset.id}
							preset={preset}
							active={preset.id === activePresetId}
							favorite={favorites.includes(preset.id)}
							onApply={onApply}
							onToggleFavorite={onToggleFavorite}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

interface PresetRowProps {
	preset: GradientPreset;
	active: boolean;
	favorite: boolean;
	onApply: (preset: GradientPreset) => void;
	onToggleFavorite: (id: string) => void;
}

const PresetRow = memo(function PresetRow({
	preset,
	active,
	favorite,
	onApply,
	onToggleFavorite,
}: PresetRowProps) {
	const thumbnail = useThumbnail(preset);
	const fallback = preset.document.field?.palette ?? [
		preset.document.background,
		preset.document.background,
	];
	return (
		<li className="gp-preset" data-active={active ? "" : undefined}>
			<button
				type="button"
				className="gp-preset__apply"
				aria-pressed={active}
				aria-label={`${preset.name}, ${preset.category}. ${preset.description}`}
				onClick={() => onApply(preset)}
			>
				<span
					className="gp-preset__thumb"
					style={{
						background: `linear-gradient(135deg, ${fallback.join(", ")})`,
					}}
				>
					{thumbnail && <img src={thumbnail} alt="" draggable={false} />}
				</span>
				<span className="gp-preset__name">{preset.name}</span>
				<span className="gp-preset__category">{preset.category}</span>
			</button>
			<button
				type="button"
				className="gp-preset__fav"
				aria-pressed={favorite}
				aria-label={
					favorite
						? `Remove ${preset.name} from favorites`
						: `Add ${preset.name} to favorites`
				}
				onClick={() => onToggleFavorite(preset.id)}
			>
				<Heart
					size={13}
					aria-hidden="true"
					fill={favorite ? "currentColor" : "none"}
				/>
			</button>
		</li>
	);
});
