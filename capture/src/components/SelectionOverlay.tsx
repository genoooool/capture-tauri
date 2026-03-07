import { useState, useRef, useCallback } from 'react';
import type { CaptureArea } from '../types';

interface SelectionOverlayProps {
  onCapture: (area: CaptureArea) => void;
  onCancel: () => void;
  screenshotDataUrl: string;
}

export default function SelectionOverlay({ onCapture, onCancel, screenshotDataUrl }: SelectionOverlayProps) {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setCurrentPos({
      x: e.clientX - containerRef.current.getBoundingClientRect().left,
      y: e.clientY - containerRef.current.getBoundingClientRect().top,
    });
  }, [startPos]);

  const handleMouseUp = useCallback(() => {
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

    // 获取屏幕 DPI 缩放比例
    const dpr = window.devicePixelRatio || 1;

    onCapture({
      x: Math.round(x * dpr),
      y: Math.round(y * dpr),
      width: Math.round(width * dpr),
      height: Math.round(height * dpr),
    });

    setStartPos(null);
    setCurrentPos(null);
  }, [startPos, currentPos, onCapture]);

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
      className="fixed inset-0 cursor-crosshair"
      style={{
        backgroundImage: `url(${screenshotDataUrl})`,
        backgroundSize: 'contain',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundRepeat: 'no-repeat',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 顶部提示栏 */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">拖动鼠标选择截图区域</span>
          <span className="text-xs text-slate-400">Esc 取消</span>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          取消
        </button>
      </div>

      {/* 选区 */}
      {selectionRect && (
        <>
          {/* 半透明遮罩 - 使用 inset 实现挖空效果 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              background: `rgba(0, 0, 0, 0.5)`,
              clipPath: `polygon(
                0 0, 100% 0, 100% 100%, 0 100%,
                ${selectionRect.x}px ${selectionRect.y}px,
                ${selectionRect.x + selectionRect.width}px ${selectionRect.y}px,
                ${selectionRect.x + selectionRect.width}px ${selectionRect.y + selectionRect.height}px,
                ${selectionRect.x}px ${selectionRect.y + selectionRect.height}px
              )`,
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
