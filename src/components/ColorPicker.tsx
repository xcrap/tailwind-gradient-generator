import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ColorPickerProps {
	color: string;
	onChange: (color: string) => void;
}

const presetColors = [
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#6366f1",
	"#8b5a2b",
	"#059669",
	"#dc2626",
	"#7c3aed",
	"#db2777",
	"#0891b2",
	"#16a34a",
	"#ca8a04",
	"#dc2625",
	"#9333ea",
	"#be185d",
];

export const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
	const [isOpen, setIsOpen] = useState(false);

	const handleColorChange = (newColor: string) => {
		onChange(newColor);
	};

	const colorInputId = `color-input-${Math.random().toString(36).substr(2, 9)}`;
	const colorPickerId = `color-picker-${Math.random().toString(36).substr(2, 9)}`;

	return (
		<div>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="w-full justify-start text-left font-normal"
					>
						<div className="flex items-center gap-2">
							<div
								className="w-4 h-4 rounded border border-border"
								style={{ backgroundColor: color }}
							/>
							<span>{color}</span>
						</div>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64 p-3">
					<div className="space-y-3">
						<div>
							<label
								htmlFor={colorInputId}
								className="text-xs font-medium mb-1 block"
							>
								Hex Color
							</label>
							<Input
								id={colorInputId}
								type="text"
								value={color}
								onChange={(e) => handleColorChange(e.target.value)}
								placeholder="#000000"
								className="font-mono text-sm"
							/>
						</div>

						<div>
							<div className="grid grid-cols-6 gap-1">
								{presetColors.map((presetColor) => (
									<button
										key={presetColor}
										type="button"
										className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
										style={{ backgroundColor: presetColor }}
										onClick={() => handleColorChange(presetColor)}
										aria-label={`Select color ${presetColor}`}
									/>
								))}
							</div>
						</div>

						<div>
							<label
								htmlFor={colorPickerId}
								className="text-xs font-medium mb-1 block"
							>
								Color Picker
							</label>
							<input
								id={colorPickerId}
								type="color"
								value={color}
								onChange={(e) => handleColorChange(e.target.value)}
								className="w-full h-10 border border-border rounded cursor-pointer"
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};
