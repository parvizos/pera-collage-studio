import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./index.css";

// Build marker — bump to force a new bundle hash + service-worker update
// (busts any stale/poisoned PWA cache on clients).
const BUILD = "2026-06-09.2";
console.info("PERA build", BUILD);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
