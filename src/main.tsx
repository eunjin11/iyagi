import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import "./styles/theme.css.ts";
import { appRoot } from "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<React.StrictMode>
		<div className={appRoot}>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Navigate to="/play" replace />} />
					<Route path="/play" element={<App />} />
				</Routes>
			</BrowserRouter>
		</div>
	</React.StrictMode>,
);
