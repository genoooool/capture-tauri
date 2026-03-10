import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { CaptureArea, DpiInfo } from '../types';

// 获取 DPI 信息
export async function getDpiInfo(): Promise<DpiInfo> {
  try {
    return await invoke<DpiInfo>('get_dpi_info');
  } catch (error) {
    console.error('Failed to get DPI info:', error);
    return { scale_x: 1, scale_y: 1 };
  }
}

// 截取屏幕
export async function captureScreen(area: CaptureArea): Promise<string> {
  try {
    return await invoke<string>('capture_screen', { area });
  } catch (error) {
    console.error('Failed to capture screen:', error);
    throw error;
  }
}

// 截取全屏（用于 overlay 背景）
export async function captureFullScreen(): Promise<string> {
  try {
    return await invoke<string>('capture_screen', { area: null });
  } catch (error) {
    console.error('Failed to capture full screen:', error);
    throw error;
  }
}

// 复制到剪贴板
export async function copyToClipboard(imageData: Blob): Promise<void> {
  try {
    // 使用 Clipboard API
    await navigator.clipboard.write([
      new ClipboardItem({
        [imageData.type]: imageData,
      }),
    ]);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

// 保存到文件
export async function saveToFile(imageData: Blob, fileName: string): Promise<string | null> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      title: '保存截图',
      defaultPath: fileName,
      filters: [
        {
          name: 'PNG Image',
          extensions: ['png'],
        },
      ],
    });

    if (filePath) {
      const arrayBuffer = await imageData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(filePath, uint8Array);
      return filePath;
    }
    return null;
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
}

// 监听全局快捷键事件
export function onScreenshotTrigger(callback: () => void): () => void {
  const unlistenPromise = listen('trigger-screenshot', callback);

  return () => {
    unlistenPromise.then((unlistenFn) => unlistenFn());
  };
}

export async function updateShortcut(shortcut: string): Promise<void> {
  try {
    await invoke<void>('update_shortcut', { shortcut });
  } catch (error) {
    console.error('Failed to update shortcut:', error);
    throw error;
  }
}

// 显示选区窗口
export async function showSelectionWindow(): Promise<void> {
  try {
    await invoke<void>('show_selection_window');
  } catch (error) {
    console.error('Failed to show selection window:', error);
    throw error;
  }
}

// 监听选区截图完成事件
export function onSelectionCaptured(callback: (event: any) => void): () => void {
  const unlistenPromise = listen('selection-captured', callback);

  return () => {
    unlistenPromise.then((unlistenFn) => unlistenFn());
  };
}

// 执行选区截图
export async function doSelectionCapture(area: CaptureArea): Promise<void> {
  try {
    await invoke<void>('do_selection_capture', { area });
  } catch (error) {
    console.error('Failed to do selection capture:', error);
    throw error;
  }
}

// 关闭选区窗口（用户放弃截图）
export async function closeSelectionWindow(): Promise<void> {
  try {
    await invoke<void>('close_selection_window');
  } catch (error) {
    console.error('Failed to close selection window:', error);
    throw error;
  }
}

// 监听选区取消事件
export function onSelectionCancelled(callback: () => void): () => void {
  const unlistenPromise = listen('selection-cancelled', callback);

  return () => {
    unlistenPromise.then((unlistenFn) => unlistenFn());
  };
}
