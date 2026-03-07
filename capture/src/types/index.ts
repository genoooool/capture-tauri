// 截图美化预设配置
export interface Preset {
  id: string;
  name: string;
  borderRadius: number;
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  padding: number;
  background: BackgroundConfig;
  scale?: number;
}

// 背景配置
export interface BackgroundConfig {
  type: 'solid' | 'gradient';
  color?: string;
  gradient?: {
    start: string;
    end: string;
    angle: number;
  };
}

// 截图选区
export interface CaptureArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// DPI 信息
export interface DpiInfo {
  scale_x: number;
  scale_y: number;
}

// 应用配置
export interface AppConfig {
  shortcut: string;
  exportPath: string;
  defaultPreset: string;
  exportScale: number;
  autoCopyToClipboard: boolean;
}

// 默认预设
export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'minimal',
    name: '极简白',
    borderRadius: 12,
    shadow: {
      color: 'rgba(0, 0, 0, 0.1)',
      blur: 20,
      offsetX: 0,
      offsetY: 10,
    },
    padding: 40,
    background: {
      type: 'solid',
      color: '#ffffff',
    },
    scale: 1,
  },
  {
    id: 'dark',
    name: '深色模式',
    borderRadius: 16,
    shadow: {
      color: 'rgba(0, 0, 0, 0.3)',
      blur: 30,
      offsetX: 0,
      offsetY: 15,
    },
    padding: 50,
    background: {
      type: 'solid',
      color: '#1e293b',
    },
    scale: 1,
  },
  {
    id: 'gradient',
    name: '渐变紫',
    borderRadius: 20,
    shadow: {
      color: 'rgba(99, 102, 241, 0.3)',
      blur: 40,
      offsetX: 0,
      offsetY: 20,
    },
    padding: 60,
    background: {
      type: 'gradient',
      gradient: {
        start: '#6366f1',
        end: '#a855f7',
        angle: 135,
      },
    },
    scale: 1,
  },
];

// 保存预设到本地存储
export function savePresets(presets: Preset[]) {
  localStorage.setItem('capture-presets', JSON.stringify(presets));
}

// 从本地存储加载预设
export function loadPresets(): Preset[] {
  const stored = localStorage.getItem('capture-presets');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }
  return [];
}
