import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SelectionMode from "./components/SelectionMode";
import "./index.css";

// 检测是否为 selection-overlay 窗口
// Tauri v2 中通过 window.__TAURI__ 获取窗口信息
async function initApp() {
  console.log('[main.tsx] window.location:', window.location.href, window.location.hash);

  // 1. 首先检查 hash 路由
  const isHashSelection = window.location.hash === '#/selection' || window.location.hash === '#selection';

  // 2. 检查 pathname
  const isPathnameSelection = window.location.pathname.includes('selection');

  // 3. 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const isQueryParamSelection = urlParams.get('mode') === 'selection';

  // 4. 尝试通过 Tauri API 获取窗口 label
  let isTauriSelectionWindow = false;
  try {
    const { getCurrent } = await import('@tauri-apps/api/window');
    const currentWindow = getCurrent();
    const label = await currentWindow?.label;
    isTauriSelectionWindow = label === 'selection-overlay';
    console.log('[main.tsx] Tauri window label:', label);
  } catch (e) {
    console.log('[main.tsx] Not running in Tauri or failed to get window info');
  }

  const isSelectionWindow = isHashSelection || isPathnameSelection || isQueryParamSelection || isTauriSelectionWindow;

  console.log('[main.tsx] isSelectionWindow:', isSelectionWindow);

  // 渲染应用
  const root = document.getElementById("root") as HTMLElement;
  if (!root) {
    console.error('[main.tsx] Root element not found');
    return;
  }

  if (isSelectionWindow) {
    // 渲染选区窗口
    console.log('[main.tsx] Rendering SelectionMode');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <SelectionMode />
      </React.StrictMode>
    );
  } else {
    // 渲染主应用
    console.log('[main.tsx] Rendering App');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

initApp().catch(console.error);
