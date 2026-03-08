import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SelectionMode from "./components/SelectionMode";
import "./index.css";

// 检测是否为 selection-overlay 窗口
async function initApp() {
  const logs: string[] = [];
  logs.push(`[main.tsx] href: ${window.location.href}`);
  logs.push(`[main.tsx] hash: ${window.location.hash}`);
  logs.push(`[main.tsx] pathname: ${window.location.pathname}`);

  // 1. 首先检查 hash 路由
  const isHashSelection = window.location.hash === '#/selection' || window.location.hash === '#selection';

  // 2. 检查 pathname
  const isPathnameSelection = window.location.pathname.includes('selection');

  // 3. 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const isQueryParamSelection = urlParams.get('mode') === 'selection';

  // 4. 尝试通过 Tauri API 获取窗口 label
  let isTauriSelectionWindow = false;
  let tauriLabel = 'unknown';
  try {
    // 动态导入避免在非 Tauri 环境下报错
    const windowApi = await import('@tauri-apps/api/window');
    const currentWindow = windowApi.getCurrentWindow();
    tauriLabel = currentWindow.label;
    isTauriSelectionWindow = tauriLabel === 'selection-overlay';
    logs.push(`[main.tsx] Tauri window label: ${tauriLabel}`);
  } catch (e) {
    logs.push(`[main.tsx] Not running in Tauri or failed to get window info: ${e}`);
  }

  const isSelectionWindow = isHashSelection || isPathnameSelection || isQueryParamSelection || isTauriSelectionWindow;

  logs.push(`[main.tsx] isHashSelection: ${isHashSelection}`);
  logs.push(`[main.tsx] isPathnameSelection: ${isPathnameSelection}`);
  logs.push(`[main.tsx] isQueryParamSelection: ${isQueryParamSelection}`);
  logs.push(`[main.tsx] isTauriSelectionWindow: ${isTauriSelectionWindow}`);
  logs.push(`[main.tsx] isSelectionWindow: ${isSelectionWindow}`);

  // 将所有日志打印到控制台
  logs.forEach(log => console.log(log));

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
