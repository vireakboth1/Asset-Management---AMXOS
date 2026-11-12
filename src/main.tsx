import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LedgerProvider } from "./store";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <LedgerProvider>
      <App />
    </LedgerProvider>
  </StrictMode>,
);
