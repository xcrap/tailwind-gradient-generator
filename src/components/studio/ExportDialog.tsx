import { Check, Copy, Download, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	type CodeFormat,
	type ExportFormat,
	exportCode,
	exportDownload,
	type GradientDocument,
	getDimensions,
	previewDataUrl,
} from "@/lib/gradients";

/** Field scenes are WebGL: stills are raster, only HTML keeps the motion. */
const FIELD_HINTS: Record<ExportFormat, string> = {
	css: "A still of the current frame as an embedded PNG background.",
	tailwind:
		"Tailwind v4 markup with the current frame as an inline PNG background.",
	html: "A self-contained page that plays the animated field with WebGL.",
	svg: "An SVG wrapping a high-resolution still of the current frame (raster, not editable vectors).",
	json: "Every field setting, to restore or share this exact look.",
	png: "A full-resolution snapshot of the frozen frame.",
};

const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
	{
		value: "css",
		label: "CSS",
		hint: "A background declaration for any element.",
	},
	{
		value: "tailwind",
		label: "Tailwind v4",
		hint: "Tailwind utility classes with an inline SVG background.",
	},
	{
		value: "html",
		label: "HTML",
		hint: "A complete HTML page with your gradient background.",
	},
	{ value: "svg", label: "SVG", hint: "Editable native SVG with every layer." },
	{
		value: "json",
		label: "JSON",
		hint: "The artwork document, for saving or sharing.",
	},
	{
		value: "png",
		label: "PNG",
		hint: "A full-resolution bitmap rendered from the SVG.",
	},
];

const PNG_WIDTHS = [1280, 1920, 2560, 3840];

const EXTENSIONS: Record<ExportFormat, string> = {
	css: "CSS",
	tailwind: "Tailwind",
	html: "HTML",
	svg: "SVG",
	json: "JSON",
	png: "PNG",
};

function usePreview(doc: GradientDocument, enabled: boolean) {
	const [url, setUrl] = useState<string | undefined>();
	useEffect(() => {
		if (!enabled) return;
		let live = true;
		Promise.resolve()
			.then(() => previewDataUrl(doc, 960))
			.then((next) => {
				if (live) setUrl(next || undefined);
			})
			.catch(() => {
				if (live) setUrl(undefined);
			});
		return () => {
			live = false;
		};
	}, [doc, enabled]);
	return url;
}

interface ExportDialogProps {
	open: boolean;
	doc: GradientDocument;
	onClose: () => void;
}

export function ExportDialog({ open, doc, onClose }: ExportDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [format, setFormat] = useState<ExportFormat>("css");
	const [pngWidth, setPngWidth] = useState(1920);
	const [busy, setBusy] = useState(false);
	const [copiedCode, setCopiedCode] = useState<string | null>(null);
	const titleId = useId();
	const widthId = useId();
	const codeId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			try {
				dialog.showModal();
			} catch {
				dialog.setAttribute("open", "");
			}
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	const code = useMemo(() => {
		if (!open || format === "png") return "";
		try {
			return exportCode(doc, format as CodeFormat);
		} catch {
			return "";
		}
	}, [open, doc, format]);

	const copied = !!code && copiedCode === code;
	const dimensions = getDimensions(
		doc.aspectRatio,
		format === "png" ? pngWidth : undefined,
	);
	const current = FORMATS.find((item) => item.value === format) ?? FORMATS[0];
	const hint = doc.field ? FIELD_HINTS[format] : current.hint;
	const preview = usePreview(doc, open && format === "png");

	const copy = async () => {
		if (!code) return;
		try {
			if (!navigator.clipboard?.writeText)
				throw new Error("Clipboard unavailable");
			await navigator.clipboard.writeText(code);
			setCopiedCode(code);
			toast.success(`${EXTENSIONS[format]} copied to clipboard`);
		} catch {
			toast.error("Couldn't access the clipboard", {
				description:
					"Select the code and copy it manually, or download the file.",
			});
		}
	};

	const download = async () => {
		setBusy(true);
		try {
			await exportDownload(
				doc,
				format,
				format === "png" ? pngWidth : undefined,
			);
			toast.success(`${EXTENSIONS[format]} downloaded`);
		} catch (error) {
			toast.error(`${EXTENSIONS[format]} export failed`, {
				description:
					error instanceof Error && error.message
						? error.message
						: "Your browser blocked the download. Try another format.",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape already dismisses the native dialog via onCancel.
		<dialog
			ref={dialogRef}
			className="gp-dialog"
			aria-labelledby={titleId}
			onClose={onClose}
			onCancel={onClose}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			{open && (
				<div className="gp-dialog__body">
					<header className="gp-dialog__head">
						<div>
							<h2 id={titleId} className="gp-dialog__title">
								Export <em>{doc.name}</em>
							</h2>
							<p className="gp-dialog__lede">
								{doc.field
									? "Motion is paused on this frame for still formats. HTML keeps it moving."
									: "SVG-powered backgrounds preserve every layer and effect."}
							</p>
						</div>
						<button
							type="button"
							className="gp-icon-button"
							aria-label="Close export"
							onClick={onClose}
						>
							<X size={18} aria-hidden="true" />
						</button>
					</header>

					<fieldset className="gp-formats" aria-label="Export format">
						{FORMATS.map((item) => (
							<button
								key={item.value}
								type="button"
								className="gp-chip"
								aria-pressed={format === item.value}
								onClick={() => setFormat(item.value)}
							>
								{item.label}
							</button>
						))}
					</fieldset>

					<p className="gp-hint">{hint}</p>

					{format === "png" ? (
						<div className="gp-png">
							<div
								className="gp-png__preview"
								style={{ aspectRatio: doc.aspectRatio.replace(":", " / ") }}
							>
								{preview && <img src={preview} alt="" draggable={false} />}
							</div>
							<div className="gp-field">
								<label htmlFor={widthId} className="gp-label">
									Width
								</label>
								<select
									id={widthId}
									className="gp-select"
									value={pngWidth}
									onChange={(event) => setPngWidth(Number(event.target.value))}
								>
									{PNG_WIDTHS.map((width) => {
										const size = getDimensions(doc.aspectRatio, width);
										return (
											<option key={width} value={width}>
												{size.width} × {size.height} px
											</option>
										);
									})}
								</select>
							</div>
						</div>
					) : (
						<div className="gp-code">
							<label htmlFor={codeId} className="sr-only">
								{EXTENSIONS[format]} code
							</label>
							<textarea
								id={codeId}
								readOnly
								spellCheck={false}
								value={code || "This format couldn't be generated."}
								onFocus={(event) => event.currentTarget.select()}
							/>
						</div>
					)}

					<footer className="gp-dialog__foot">
						<span className="gp-dialog__meta">
							{doc.aspectRatio} · {dimensions.width} × {dimensions.height}
						</span>
						<div className="gp-dialog__actions">
							{format !== "png" && (
								<button
									type="button"
									className="gp-button"
									onClick={copy}
									disabled={!code}
								>
									{copied ? (
										<Check size={15} aria-hidden="true" />
									) : (
										<Copy size={15} aria-hidden="true" />
									)}
									{copied ? "Copied" : "Copy"}
								</button>
							)}
							<button
								type="button"
								className="gp-button gp-button--primary"
								onClick={download}
								disabled={busy}
								aria-busy={busy}
							>
								<Download size={15} aria-hidden="true" />
								{busy ? "Preparing…" : `Download ${EXTENSIONS[format]}`}
							</button>
						</div>
					</footer>
				</div>
			)}
		</dialog>
	);
}
