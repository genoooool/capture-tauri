import { useState, useRef, useCallback } from 'react';
import type { CaptureArea } from '../types';

type AspectRatio = 'free' | '3:4' | '4:3' | '9:16' | '16:9';

interface SelectionOverlayProps {
  onCapture: (area: CaptureArea) => void;
  onCancel: () => void;
  screenshotDataUrl: string;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; ratio: number | null }[] = [
  { value: 'free', label: '自由', ratio: null },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
];

export default function SelectionOverlay({ onCapture, onCancel, screenshotDataUrl }: SelectionOverlayProps) {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const containerRef = useRef<HTMLDivElement>(null);

  const applyAspectRatio = useCallback((startX: number, startY: number, endX: number, endY: number, ratio: number | null) => {
    if (ratio === null) return { x: endX, y: endY };

    const dx = endX - startX;
    const dy = endY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let newWidth: number;
    let newHeight: number;

    if (absDx / ratio > absDy) {
      newHeight = absDy;
      newWidth = newHeight * ratio;
    } else {
      newWidth = absDx;
      newHeight = newWidth / ratio;
    }

    return {
      x: startX + (dx > 0 ? newWidth : -newWidth),
      y: startY + (dy > 0 ? newHeight : -newHeight),
    };
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
    let endX = e.clientX - bounds.left;
    let endY = e.clientY - bounds.top;

    const selectedRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.ratio ?? null;
    if (selectedRatio !== null) {
      const adjusted = applyAspectRatio(startPos.x, startPos.y, endX, endY, selectedRatio);
      endX = adjusted.x;
      endY = adjusted.y;
    }

    setCurrentPos({ x: endX, y: endY });
  }, [startPos, aspectRatio, applyAspectRatio]);

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

    onCapture({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
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
        backgroundSize: '100% 100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundRepeat: 'no-repeat',
      }}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">宽高比:</span>
          <select
            value={aspectRatio}
            onChange={(e) => {
              e.stopPropagation();
              setAspectRatio(e.target.value as AspectRatio);
            }}
            onClick={(e) => e.stopPropagation()}
            className='bg-slate-700 text-white text-xs rounded-md px-2 py-1 border-0 outline-none'
          >
            <option value='free'>自由 (跟随截图)</option>
            <option value='3:4'>3:4</option>
            <option value='4:3'>4:3</option>
            <option value='9:16'>9:16</option>
            <option value='16:9'>16:9</option>
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="ml-4 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
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
            className="absolute border-2 border-white pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          >
            {/* 角落标记 */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white" />
          </div>

          {/* 尺寸显示 */}
          <div
            className="absolute bg-slate-900/80 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
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
