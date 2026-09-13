import { createRoot } from "react-dom/client";
import { GameApp } from "@/components/game/GameApp";
import "@/styles.css";

const rootEl = document.getElementById("app");
if (!rootEl) throw new Error("Missing #app root element");

createRoot(rootEl).render(<GameApp />);
