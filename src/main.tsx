import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "@app/App";
import { AppProviders } from "@app/providers/AppProviders";
import { reloadForNewDeploy } from "@shared/components/feedback/chunkError";

// A tab opened before a deploy asks for chunk hashes the new build no longer has
// (nginx 404s them). Vite reports that here before the import rejects; reloading
// once picks up the new build instead of showing an error screen.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewDeploy()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
