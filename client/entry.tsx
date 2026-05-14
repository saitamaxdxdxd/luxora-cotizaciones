import "./global.css";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root")!;
// Reuse an existing root during HMR to avoid "already passed to createRoot" warning
const root = ((rootEl as any).__luxoraRoot ??= createRoot(rootEl));
root.render(<App />);
