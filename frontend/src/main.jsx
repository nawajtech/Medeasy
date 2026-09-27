import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PatientApp from "./patient/App.jsx";
import { isPatientApp } from "./config/appMode";
import { bootstrapTheme } from "./theme/theme";

bootstrapTheme();

const Root = isPatientApp() ? PatientApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
