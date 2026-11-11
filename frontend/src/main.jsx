import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PartnerApp from "./patient/App.jsx";
import { isPartnerApp } from "./config/appMode";
import { bootstrapTheme } from "./theme/theme";

bootstrapTheme();

const Root = isPartnerApp() ? PartnerApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
