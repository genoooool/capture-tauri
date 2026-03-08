import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SelectionMode from "./components/SelectionMode";
import "./index.css";

// 检测是否为 selection-overlay 窗口
// Tauri v2 使用 URL hash 路由来区分窗口
const isSelectionWindow = window.location.hash === '#/selection';

if (isSelectionWindow) {
  // 渲染选区窗口
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <SelectionMode />
    </React.StrictMode>
  );
} else {
  // 渲染主应用
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
