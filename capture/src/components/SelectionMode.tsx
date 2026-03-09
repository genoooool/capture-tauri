import { useState, useRef, useCallback, useEffect } from 'react';
import { doSelectionCapture } from '../services/tauriCommands';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function SelectionMode() {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听 Escape 键关闭窗口
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const win = getCurrentWindow();
        win.close().catch(console.error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !startPos) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const endX = e.clientX - bounds.left;
    const endY = e.clientY - bounds.top;
    setCurrentPos({ x: endX, y: endY });
  }, [startPos]);

  const handleMouseUp = useCallback(async () => {
    if (!containerRef.current || !startPos || !currentPos) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // 最小尺寸限制
    if (width < 50 || height < 50) {
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    // 调用 Rust 命令执行截图
    await doSelectionCapture({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });

    setStartPos(null);
    setCurrentPos(null);
  }, [startPos, currentPos]);

  const getSelectionRect = () => {
    if (!startPos || !currentPos) return null;
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return { x, y, width, height };
  };

  const selectionRect = getSelectionRect();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 cursor-crosshair bg-transparent"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">拖动鼠标选择截图区域</span>
          <span className="text-xs text-slate-400">Esc 取消</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const win = getCurrentWindow();
            win.close().catch(console.error);
          }}
          className="ml-4 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          取消
        </button>
      </div>

      {/* 选区 */}
      {selectionRect && (
        <>
          {/* 4 个半透明遮罩 - 覆盖选区外的区域 */}
          {/* 上方遮罩 */}
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              left: 0,
              top: 0,
              right: 0,
              height: selectionRect.y,
            }}
          />
          {/* 下方遮罩 */}
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              left: 0,
              top: selectionRect.y + selectionRect.height,
              right: 0,
              bottom: 0,
            }}
          />
          {/* 左方遮罩 */}
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              left: 0,
              top: selectionRect.y,
              width: selectionRect.x,
              height: selectionRect.height,
            }}
          />
          {/* 右方遮罩 */}
          <div
            className="absolute bg-black/50 pointer-events-none"
            style={{
              left: selectionRect.x + selectionRect.width,
              top: selectionRect.y,
              right: 0,
              height: selectionRect.height,
            }}
          />

          {/* 选区边框 */}
          <div
            className="absolute border-2 border-indigo-500 pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          >
            {/* 角落标记 */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-500" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-indigo-500" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-500" />
          </div>

          {/* 尺寸显示 */}
          <div
            className="absolute bg-indigo-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
            style={{
              left: selectionRect.x,
              top: selectionRect.y - 28,
            }}
          >
            {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
          </div>
        </>
      )}
    </div>
  );
}
