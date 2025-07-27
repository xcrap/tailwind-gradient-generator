import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface BlendModeSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const blendModes = [
	{ value: "normal", label: "Normal" },
	{ value: "multiply", label: "Multiply" },
	{ value: "screen", label: "Screen" },
	{ value: "overlay", label: "Overlay" },
	{ value: "soft-light", label: "Soft Light" },
	{ value: "hard-light", label: "Hard Light" },
	{ value: "color-dodge", label: "Color Dodge" },
	{ value: "color-burn", label: "Color Burn" },
	{ value: "darken", label: "Darken" },
	{ value: "lighten", label: "Lighten" },
	{ value: "difference", label: "Difference" },
	{ value: "exclusion", label: "Exclusion" },
];

export const BlendModeSelector = ({
	value,
	onChange,
}: BlendModeSelectorProps) => {
	return (
		<div>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select blend mode" />
				</SelectTrigger>
				<SelectContent>
					{blendModes.map((mode) => (
						<SelectItem key={mode.value} value={mode.value}>
							{mode.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
