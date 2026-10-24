import { Toaster } from "sonner";
import Index from "./pages/Index";

const App = () => (
	<>
		<Index />
		<Toaster
			theme="dark"
			position="bottom-center"
			offset={88}
			mobileOffset={88}
			closeButton
			toastOptions={{ className: "gp-toast" }}
		/>
	</>
);

export default App;
