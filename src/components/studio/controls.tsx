import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	type ReactNode,
	useEffect,
	useId,
	useState,
} from "react";

interface RangeFieldProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	/** `transient` is true while the user is still scrubbing. */
	onChange: (value: number, transient: boolean) => void;
	onCommit: () => void;
}

export function RangeField({
	label,
	value,
	min,
	max,
	step = 1,
	unit = "",
	onChange,
	onCommit,
}: RangeFieldProps) {
	const id = useId();
	const progress = ((value - min) / (max - min)) * 100;
	const display = Number.isInteger(step) ? Math.round(value) : value.toFixed(1);

	return (
		<div className="gp-range">
			<div className="gp-range__head">
				<label htmlFor={id}>{label}</label>
				<output htmlFor={id}>
					{display}
					{unit}
				</output>
			</div>
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				style={{ "--progress": `${progress}%` } as CSSProperties}
				onChange={(event) => onChange(Number(event.target.value), true)}
				onPointerUp={onCommit}
				onPointerCancel={onCommit}
				onKeyUp={onCommit}
				onBlur={onCommit}
			/>
		</div>
	);
}

const HEX = /^#[0-9a-f]{6}$/i;

function normalizeHex(input: string): string | null {
	let value = input.trim();
	if (!value.startsWith("#")) value = `#${value}`;
	if (/^#[0-9a-f]{3}$/i.test(value)) {
		value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
	}
	return HEX.test(value) ? value.toLowerCase() : null;
}

interface ColorFieldProps {
	label: string;
	value: string;
	onChange: (value: string, transient: boolean) => void;
	onCommit: () => void;
}

export function ColorField({
	label,
	value,
	onChange,
	onCommit,
}: ColorFieldProps) {
	const id = useId();
	const [draft, setDraft] = useState(value);

	useEffect(() => setDraft(value), [value]);

	const applyDraft = () => {
		const hex = normalizeHex(draft);
		if (hex) {
			if (hex !== value) onChange(hex, false);
		} else {
			setDraft(value);
		}
	};

	return (
		<div className="gp-color">
			<span className="gp-color__swatch" style={{ background: value }}>
				<input
					type="color"
					aria-label={`${label} picker`}
					value={HEX.test(value) ? value : "#000000"}
					onChange={(event) => onChange(event.target.value, true)}
					onBlur={onCommit}
				/>
			</span>
			<label htmlFor={id} className="gp-color__label">
				{label}
			</label>
			<input
				id={id}
				className="gp-color__hex"
				value={draft}
				spellCheck={false}
				autoComplete="off"
				maxLength={7}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={applyDraft}
				onKeyDown={(event) => {
					if (event.key === "Enter") applyDraft();
					if (event.key === "Escape") setDraft(value);
				}}
			/>
		</div>
	);
}

interface SegmentedProps<T extends string> {
	label: string;
	value: T;
	options: readonly { value: T; label: ReactNode; title?: string }[];
	onChange: (value: T) => void;
	hideLabel?: boolean;
	className?: string;
}

export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
	hideLabel,
	className = "",
}: SegmentedProps<T>) {
	const labelId = useId();
	return (
		<div className={`gp-segmented-wrap ${className}`}>
			<span id={labelId} className={hideLabel ? "sr-only" : "gp-label"}>
				{label}
			</span>
			<fieldset className="gp-segmented" aria-labelledby={labelId}>
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						title={option.title}
						aria-pressed={option.value === value}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</button>
				))}
			</fieldset>
		</div>
	);
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
	children: ReactNode;
	shortcut?: string;
}

export function IconButton({
	label,
	children,
	shortcut,
	className = "",
	...props
}: IconButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			title={shortcut ? `${label} (${shortcut})` : label}
			className={`gp-icon-button ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}
