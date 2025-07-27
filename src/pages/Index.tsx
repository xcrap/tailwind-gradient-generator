import { useState } from "react";
import { GradientGenerator } from "@/components/GradientGenerator";
import { GradientGeneratorSVG } from "@/components/GradientGeneratorSVG";
import { Button } from "@/components/ui/button";

const Index = () => {
	const [useSVG, setUseSVG] = useState(false);

	return (
		<div>
			<div className="fixed top-4 right-4 z-50">
				<Button
					onClick={() => setUseSVG(!useSVG)}
					variant={useSVG ? "default" : "outline"}
					className="shadow-lg"
				>
					{useSVG ? "Switch to Tailwind" : "Switch to SVG"}
				</Button>
			</div>
			{useSVG ? <GradientGeneratorSVG /> : <GradientGenerator />}
		</div>
	);
};

export default Index;
