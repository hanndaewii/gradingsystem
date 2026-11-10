/* WO-1 dev-only preview entry (D19) — served at /kit-preview.html in
   `npm run dev`. NOT part of `vite build`, which only reads index.html. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import UiGallery from "./UiGallery";
import "../styles/index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <UiGallery />
    </StrictMode>,
  );
}
