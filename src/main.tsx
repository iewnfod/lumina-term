import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css";
import {GlobalConfigProvider} from "./hooks/config.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <GlobalConfigProvider>
            <App/>
        </GlobalConfigProvider>
    </React.StrictMode>,
);
