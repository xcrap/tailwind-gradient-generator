import {
	Download,
	Frame,
	Maximize2,
	Minimize2,
	Pause,
	Play,
	Redo2,
	RotateCcw,
	Shuffle,
	Type,
	Undo2,
} from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import {
	cloneDocument,
	createLayer,
	DEFAULT_DOCUMENT,
	type GradientDocument,
	type GradientPreset,
	type LayerType,
	PRESETS,
	randomizeDocument,
	validateDocument,
} from "@/lib/gradients";
import { Canvas, type TextInk } from "./Canvas";
import { IconButton } from "./controls";
import { ExportDialog } from "./ExportDialog";
import { FieldCanvas } from "./FieldCanvas";
import {
	FIELD_MODE_LABELS,
	type FieldDocumentPatch,
	FieldInspector,
	type FieldPatch,
} from "./FieldInspector";
import { type DocumentPatch, Inspector, type LayerPatch } from "./Inspector";
import { PresetLibrary } from "./PresetLibrary";
import { loadDraft, loadFavorites, saveDraft, saveFavorites } from "./storage";
import { type Updater, useHistory } from "./useHistory";

type MobileTab = "presets" | "edit";
type EditorEntry = { doc: GradientDocument; presetId: string | null };

const MAX_PHASE = 1_000_000;

const DEFAULT_PRESET_ID =
	PRESETS.find((preset) => preset.document.name === DEFAULT_DOCUMENT.name)
		?.id ??
	PRESETS[0]?.id ??
	null;

interface Initial {
	doc: GradientDocument;
	presetId: string | null;
	restored: boolean;
}

function loadInitial(): Initial {
	const draft = loadDraft();
	const doc = draft ? validateDocument(draft.document) : null;
	// Field-less drafts are the retired layered scenes: start on the new default.
	if (doc?.field) {
		const presetId = PRESETS.some((p) => p.id === draft?.presetId)
			? (draft?.presetId ?? null)
			: null;
		return { doc, presetId, restored: true };
	}
	return {
		doc: cloneDocument(DEFAULT_DOCUMENT),
		presetId: DEFAULT_PRESET_ID,
		restored: false,
	};
}

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	if (
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	) {
		return true;
	}
	return target instanceof HTMLInputElement && target.type !== "range";
}

const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function Studio() {
	const initial = useMemo(loadInitial, []);
	const history = useHistory<EditorEntry>(() => ({
		doc: initial.doc,
		presetId: initial.presetId,
	}));
	const { doc, presetId } = history.value;
	const { set: setEntry, replace: replaceEntry, commit, undo, redo } = history;
	const set = useCallback(
		(update: Updater<GradientDocument>, transient = false) => {
			setEntry(
				(current) => ({
					...current,
					doc: typeof update === "function" ? update(current.doc) : update,
				}),
				transient,
			);
		},
		[setEntry],
	);

	const [activeId, setActiveId] = useState<string | null>(
		initial.doc.layers[initial.doc.layers.length - 1]?.id ?? null,
	);
	const [favorites, setFavorites] = useState<string[]>(() =>
		loadFavorites().filter((id) => PRESETS.some((preset) => preset.id === id)),
	);
	const [showText, setShowText] = useState(false);
	const [textInk, setTextInk] = useState<TextInk>("light");
	const [focusMode, setFocusMode] = useState(false);
	const [framed, setFramed] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const [tab, setTab] = useState<MobileTab>("presets");
	const [playing, setPlaying] = useState(() => !prefersReducedMotion());

	// The live phase is reported every frame by FieldCanvas; keep it out of state.
	const timeRef = useRef<number | null>(null);
	const handleTime = useCallback((phase: number) => {
		timeRef.current = phase;
	}, []);
	const playingRef = useRef(playing);
	playingRef.current = playing;

	/** Bakes the moving phase into a document so edits don't rewind motion. */
	const withLivePhase = useCallback(
		(current: GradientDocument): GradientDocument => {
			const phase = timeRef.current;
			if (!current.field || !playingRef.current || phase === null) {
				return current;
			}
			return {
				...current,
				field: { ...current.field, phase: phase % MAX_PHASE },
			};
		},
		[],
	);

	const freezePhase = useCallback(() => {
		const phase = timeRef.current;
		if (!playingRef.current || phase === null) return;
		replaceEntry((current) =>
			current.doc.field && current.doc.field.phase !== phase % MAX_PHASE
				? {
						...current,
						doc: {
							...current.doc,
							field: { ...current.doc.field, phase: phase % MAX_PHASE },
						},
					}
				: current,
		);
	}, [replaceEntry]);

	const activeLayer =
		doc.layers.find((layer) => layer.id === activeId) ??
		doc.layers[doc.layers.length - 1] ??
		null;

	const restoredToast = useRef(initial.restored);
	useEffect(() => {
		if (restoredToast.current) {
			restoredToast.current = false;
			toast("Draft restored", {
				description: "Picked up where you left off.",
				action: {
					label: "Start fresh",
					onClick: () => {
						setEntry({
							doc: cloneDocument(DEFAULT_DOCUMENT),
							presetId: DEFAULT_PRESET_ID,
						});
					},
				},
			});
		}
	}, [setEntry]);

	// Debounced local draft.
	const storageWarned = useRef(false);
	useEffect(() => {
		const persist = () => {
			if (!saveDraft({ document: doc, presetId }) && !storageWarned.current) {
				storageWarned.current = true;
				toast.warning("Drafts can't be saved in this browser", {
					description: "Storage is full or disabled. Export to keep your work.",
				});
			}
		};
		const flushWhenHidden = () => {
			if (document.visibilityState === "hidden") persist();
		};
		const timer = window.setTimeout(persist, 450);
		window.addEventListener("pagehide", persist);
		document.addEventListener("visibilitychange", flushWhenHidden);
		return () => {
			window.clearTimeout(timer);
			window.removeEventListener("pagehide", persist);
			document.removeEventListener("visibilitychange", flushWhenHidden);
		};
	}, [doc, presetId]);

	/* ---------- Field edits ---------- */

	const updateField = useCallback(
		(patch: FieldPatch, transient = false) => {
			set((current) => {
				if (!current.field) return current;
				const live = withLivePhase(current);
				return {
					...live,
					field: { ...(live.field ?? current.field), ...patch },
				};
			}, transient);
		},
		[set, withLivePhase],
	);

	const updateFieldDocument = useCallback(
		(patch: FieldDocumentPatch, transient = false) => {
			set((current) => ({ ...withLivePhase(current), ...patch }), transient);
		},
		[set, withLivePhase],
	);

	/* ---------- Legacy layered scenes ---------- */

	const updateLayer = useCallback(
		(id: string, patch: LayerPatch, transient = false) => {
			set(
				(current) => ({
					...current,
					layers: current.layers.map((layer) =>
						layer.id === id ? { ...layer, ...patch } : layer,
					),
				}),
				transient,
			);
		},
		[set],
	);

	const updateDocument = useCallback(
		(patch: DocumentPatch, transient = false) => {
			set((current) => ({ ...current, ...patch }), transient);
		},
		[set],
	);

	const addLayer = (type: LayerType) => {
		if (doc.layers.length >= 24) {
			toast.info("You can use up to 24 layers per artwork.");
			return;
		}
		const layer = createLayer(type);
		set((current) => ({ ...current, layers: [...current.layers, layer] }));
		setActiveId(layer.id);
	};

	const duplicateLayer = (id: string) => {
		if (doc.layers.length >= 24) {
			toast.info("You can use up to 24 layers per artwork.");
			return;
		}
		const source = doc.layers.find((layer) => layer.id === id);
		if (!source) return;
		const copy = {
			...source,
			id: createLayer(source.type).id,
			name: `${source.name} copy`.slice(0, 40),
		};
		set((current) => {
			const index = current.layers.findIndex((layer) => layer.id === id);
			const layers = [...current.layers];
			layers.splice(index + 1, 0, copy);
			return { ...current, layers };
		});
		setActiveId(copy.id);
	};

	const removeLayer = (id: string) => {
		if (doc.layers.length <= 1) return;
		const index = doc.layers.findIndex((layer) => layer.id === id);
		set((current) => ({
			...current,
			layers: current.layers.filter((layer) => layer.id !== id),
		}));
		const fallback = doc.layers[index - 1] ?? doc.layers[index + 1];
		setActiveId(fallback?.id ?? null);
	};

	const moveLayer = (id: string, direction: 1 | -1) => {
		set((current) => {
			const index = current.layers.findIndex((layer) => layer.id === id);
			const target = index + direction;
			if (index < 0 || target < 0 || target >= current.layers.length) {
				return current;
			}
			const layers = [...current.layers];
			[layers[index], layers[target]] = [layers[target], layers[index]];
			return { ...current, layers };
		});
	};

	/* ---------- Document-wide actions ---------- */

	const applyPreset = useCallback(
		(preset: GradientPreset) => {
			const next = cloneDocument(preset.document);
			timeRef.current = null;
			setEntry({ doc: next, presetId: preset.id });
			setActiveId(next.layers[next.layers.length - 1]?.id ?? null);
		},
		[setEntry],
	);

	const toggleFavorite = useCallback((id: string) => {
		setFavorites((current) => {
			const next = current.includes(id)
				? current.filter((item) => item !== id)
				: [...current, id];
			if (!saveFavorites(next)) {
				toast.error("Favorites couldn't be saved", {
					description: "They'll last until you close this tab.",
				});
			}
			return next;
		});
	}, []);

	const shuffle = () => {
		set((current) => randomizeDocument(withLivePhase(current)));
		toast("Remixed colours", { description: "Undo to step back." });
	};

	const reset = () => {
		const preset = PRESETS.find((item) => item.id === presetId);
		const next = cloneDocument(preset ? preset.document : DEFAULT_DOCUMENT);
		timeRef.current = null;
		set(next);
		setActiveId(next.layers[next.layers.length - 1]?.id ?? null);
		toast(`Reset to “${preset ? preset.name : DEFAULT_DOCUMENT.name}”`);
	};

	const togglePlaying = () => {
		if (playing) freezePhase();
		setPlaying((value) => !value);
	};

	const resumeAfterExport = useRef(false);
	const openExport = () => {
		resumeAfterExport.current = playing && !!doc.field;
		freezePhase();
		setPlaying(false);
		setExportOpen(true);
	};
	const closeExport = () => {
		setExportOpen(false);
		if (resumeAfterExport.current) {
			resumeAfterExport.current = false;
			timeRef.current = null;
			setPlaying(true);
		}
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && focusMode && !exportOpen) {
				setFocusMode(false);
				return;
			}
			const mod = event.metaKey || event.ctrlKey;
			if (!mod || isTypingTarget(event.target)) return;
			const key = event.key.toLowerCase();
			if (key === "z" && !event.shiftKey) {
				event.preventDefault();
				undo();
			} else if ((key === "z" && event.shiftKey) || key === "y") {
				event.preventDefault();
				redo();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [undo, redo, focusMode, exportOpen]);

	const activePreset = PRESETS.find((item) => item.id === presetId);
	const field = doc.field;
	const [ratioW, ratioH] = doc.aspectRatio.split(":").map(Number);
	const subtitle = field
		? FIELD_MODE_LABELS[field.mode]
		: (activePreset?.category ?? "Layered scene");

	return (
		<div
			className="gp-app"
			data-focus={focusMode ? "" : undefined}
			data-tab={tab}
		>
			<main
				className="gp-main"
				aria-label="Artwork"
				data-frame={framed ? "" : undefined}
				data-legacy={field ? undefined : ""}
				style={{ "--canvas-ratio": ratioW / ratioH } as CSSProperties}
			>
				{field ? (
					<FieldCanvas
						doc={doc}
						playing={playing}
						showText={showText}
						textInk={textInk}
						onChange={updateField}
						onCommit={commit}
						onTime={handleTime}
					/>
				) : (
					<Canvas
						doc={doc}
						activeId={activeLayer?.id ?? null}
						showHandles={!focusMode}
						showText={showText}
						textInk={textInk}
						onSelect={setActiveId}
						onLayerChange={updateLayer}
						onCommit={commit}
					/>
				)}
			</main>

			<header className="gp-toolbar">
				<div className="gp-brand gp-float">
					<span className="gp-brand__mark" aria-hidden="true" />
					<h1 className="gp-brand__name">Gradient Paradise</h1>
				</div>

				<div className="gp-toolbar__tools">
					<div className="gp-toolgroup gp-float">
						<IconButton
							label="Undo"
							shortcut="⌘Z"
							onClick={undo}
							disabled={!history.canUndo}
						>
							<Undo2 size={16} aria-hidden="true" />
						</IconButton>
						<IconButton
							label="Redo"
							shortcut="⇧⌘Z"
							onClick={redo}
							disabled={!history.canRedo}
						>
							<Redo2 size={16} aria-hidden="true" />
						</IconButton>
					</div>
					<div className="gp-toolgroup gp-float">
						<IconButton label="Shuffle colours" onClick={shuffle}>
							<Shuffle size={16} aria-hidden="true" />
						</IconButton>
						<IconButton
							label={
								activePreset
									? `Reset to ${activePreset.name}`
									: `Reset to ${DEFAULT_DOCUMENT.name}`
							}
							onClick={reset}
						>
							<RotateCcw size={16} aria-hidden="true" />
						</IconButton>
					</div>
					<div className="gp-toolgroup gp-float">
						<IconButton
							label="Preview headline text"
							aria-pressed={showText}
							onClick={() => setShowText((value) => !value)}
						>
							<Type size={16} aria-hidden="true" />
						</IconButton>
						<IconButton
							label={`Frame to ${doc.aspectRatio} export ratio`}
							aria-pressed={framed}
							onClick={() => setFramed((value) => !value)}
						>
							<Frame size={16} aria-hidden="true" />
						</IconButton>
						<IconButton
							label={focusMode ? "Exit clean preview" : "Clean preview"}
							shortcut={focusMode ? "Esc" : undefined}
							aria-pressed={focusMode}
							onClick={() => setFocusMode((value) => !value)}
						>
							{focusMode ? (
								<Minimize2 size={16} aria-hidden="true" />
							) : (
								<Maximize2 size={16} aria-hidden="true" />
							)}
						</IconButton>
					</div>
					<button
						type="button"
						className="gp-button gp-button--primary gp-toolbar__export"
						aria-label="Export"
						onClick={openExport}
					>
						<Download size={15} aria-hidden="true" />
						<span>Export</span>
					</button>
				</div>
			</header>

			<aside
				className="gp-panel gp-panel--left gp-float"
				aria-label="Preset library"
			>
				<PresetLibrary
					activePresetId={presetId}
					favorites={favorites}
					onApply={applyPreset}
					onToggleFavorite={toggleFavorite}
				/>
			</aside>

			<aside
				className="gp-panel gp-panel--right gp-float"
				aria-label="Inspector"
			>
				{field ? (
					<FieldInspector
						doc={doc}
						field={field}
						textInk={textInk}
						onTextInk={setTextInk}
						onFieldChange={updateField}
						onDocumentChange={updateFieldDocument}
						onCommit={commit}
						onShufflePalette={shuffle}
					/>
				) : (
					<Inspector
						doc={doc}
						activeLayer={activeLayer}
						textInk={textInk}
						onTextInk={setTextInk}
						onSelect={setActiveId}
						onLayerChange={updateLayer}
						onDocumentChange={updateDocument}
						onCommit={commit}
						onAddLayer={addLayer}
						onDuplicate={duplicateLayer}
						onRemove={removeLayer}
						onMove={moveLayer}
					/>
				)}
			</aside>

			<div className="gp-dock gp-float">
				{field && (
					<IconButton
						label={playing ? "Pause motion" : "Play motion"}
						aria-pressed={playing}
						onClick={togglePlaying}
						className="gp-dock__play"
					>
						{playing ? (
							<Pause size={15} aria-hidden="true" fill="currentColor" />
						) : (
							<Play size={15} aria-hidden="true" fill="currentColor" />
						)}
					</IconButton>
				)}
				<p className="gp-dock__title" aria-live="polite">
					<span className="gp-dock__name">{doc.name}</span>
					<span className="gp-dock__meta">{subtitle}</span>
				</p>
			</div>

			<nav className="gp-tabs gp-float" aria-label="Panels">
				<button
					type="button"
					aria-pressed={tab === "presets"}
					onClick={() => setTab("presets")}
				>
					Presets
				</button>
				<button
					type="button"
					aria-pressed={tab === "edit"}
					onClick={() => setTab("edit")}
				>
					Adjust
				</button>
			</nav>

			{focusMode && (
				<button
					type="button"
					className="gp-button gp-focus-exit"
					onClick={() => setFocusMode(false)}
				>
					<Minimize2 size={15} aria-hidden="true" />
					Exit preview <kbd>Esc</kbd>
				</button>
			)}

			<ExportDialog open={exportOpen} doc={doc} onClose={closeExport} />
		</div>
	);
}
