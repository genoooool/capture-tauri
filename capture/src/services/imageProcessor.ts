import type { Preset, BackgroundConfig } from '../types';

// 将十六进制颜色转换为 RGBA
function hexToRgba(hex: string, alpha: number = 1): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, alpha];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    alpha,
  ];
}

// 解析阴影颜色（支持 rgba 和 hex）
function parseShadowColor(color: string): [number, number, number, number] {
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return [
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3]),
        parseFloat(match[4] ?? '1'),
      ];
    }
  }
  return hexToRgba(color);
}

// 绘制渐变背景
function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  start: string,
  end: string,
  angle: number
) {
  const rad = (angle * Math.PI) / 180;
  const x1 = width / 2 - (width / 2) * Math.cos(rad) - (height / 2) * Math.sin(rad);
  const y1 = height / 2 - (width / 2) * Math.sin(rad) + (height / 2) * Math.cos(rad);
  const x2 = width / 2 + (width / 2) * Math.cos(rad) + (height / 2) * Math.sin(rad);
  const y2 = height / 2 + (width / 2) * Math.sin(rad) - (height / 2) * Math.cos(rad);

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// 绘制纯色背景
function drawSolidBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

// 绘制背景
function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundConfig
) {
  if (background.type === 'gradient' && background.gradient) {
    drawGradientBackground(
      ctx,
      width,
      height,
      background.gradient.start,
      background.gradient.end,
      background.gradient.angle
    );
  } else {
    drawSolidBackground(ctx, width, height, background.color || '#ffffff');
  }
}

// 绘制圆角矩形路径
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// 绘制阴影
function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number,
  shadow: { color: string; blur: number; offsetX: number; offsetY: number }
) {
  const [r, g, b, a] = parseShadowColor(shadow.color);

  ctx.save();
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${a})`;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;

  roundRectPath(ctx, x, y, width, height, borderRadius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
  ctx.fill();
  ctx.restore();
}

// 主函数：生成美化后的图像
export function generateBeautifiedImage(
  screenshotDataUrl: string,
  preset: Preset
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const { borderRadius, shadow, padding, background, scale = 1 } = preset;

      // 计算最终尺寸
      const contentWidth = img.width * scale;
      const contentHeight = img.height * scale;
      const canvasWidth = contentWidth + padding * 2;
      const canvasHeight = contentHeight + padding * 2;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 1. 绘制背景
      drawBackground(ctx, canvasWidth, canvasHeight, background);

      // 2. 绘制阴影（在内容下方）
      drawShadow(
        ctx,
        padding,
        padding,
        contentWidth,
        contentHeight,
        borderRadius,
        shadow
      );

      // 3. 绘制圆角裁剪区域并放置截图
      ctx.save();
      roundRectPath(ctx, padding, padding, contentWidth, contentHeight, borderRadius);
      ctx.clip();

      ctx.drawImage(img, padding, padding, contentWidth, contentHeight);
      ctx.restore();

      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error('Failed to load screenshot image'));
    };

    img.src = screenshotDataUrl;
  });
}

// 导出为 PNG Blob
export async function canvasToPng(canvas: HTMLCanvasElement, quality: number = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png',
      quality
    );
  });
}

// 导出为 Base64
export function canvasToBase64(canvas: HTMLCanvasElement, mimeType: string = 'image/png'): string {
  return canvas.toDataURL(mimeType);
}
