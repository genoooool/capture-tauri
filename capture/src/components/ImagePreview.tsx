import { useRef, useEffect } from 'react';
import type { Preset } from '../types';
import { generateBeautifiedImage } from '../services/imageProcessor';

interface ImagePreviewProps {
  screenshotDataUrl: string | null;
  preset: Preset;
  onImageReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ImagePreview({ screenshotDataUrl, preset, onImageReady }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!screenshotDataUrl || !canvasRef.current) return;

    let cancelled = false;

    async function render() {
      try {
        const canvas = await generateBeautifiedImage(screenshotDataUrl!, preset);
        if (cancelled) return;

        const previewCanvas = canvasRef.current;
        if (!previewCanvas) return;

        // 设置预览 canvas 尺寸（缩小显示）
        const maxWidth = 600;
        const maxHeight = 500;
        const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height);

        previewCanvas.width = canvas.width * scale;
        previewCanvas.height = canvas.height * scale;

        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        }

        onImageReady?.(canvas);
      } catch (error) {
        console.error('Failed to render preview:', error);
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [screenshotDataUrl, preset, onImageReady]);

  if (!screenshotDataUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">暂无截图</p>
          <p className="text-slate-400 text-xs mt-1">按 Ctrl+Shift+Space 开始截图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl overflow-auto">
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
    </div>
  );
}
