import type { Preset, BackgroundConfig } from '../types';

interface ConfigPanelProps {
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  onAiSuggest?: () => void;
}

export default function ConfigPanel({ preset, onPresetChange, onAiSuggest }: ConfigPanelProps) {
  const updatePreset = <K extends keyof Preset>(key: K, value: Preset[K]) => {
    onPresetChange({ ...preset, [key]: value });
  };

  const updateShadow = <K extends keyof Preset['shadow']>(key: K, value: Preset['shadow'][K]) => {
    updatePreset('shadow', { ...preset.shadow, [key]: value });
  };

  const updateBackground = (background: BackgroundConfig) => {
    updatePreset('background', background);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Layout 布局 */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Layout</h3>
        <div className="space-y-4">
          {/* 内边距 */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">内边距 (Padding)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.padding}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preset.padding}
              onChange={(e) => updatePreset('padding', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 缩放 */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">缩放 (Scale)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.scale?.toFixed(1) || '1.0'}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={preset.scale || 1}
              onChange={(e) => updatePreset('scale', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Style 样式 */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Style</h3>
        <div className="space-y-4">
          {/* 圆角 */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">圆角 (Border Radius)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.borderRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={preset.borderRadius}
              onChange={(e) => updatePreset('borderRadius', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 阴影模糊 */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">阴影模糊 (Shadow Blur)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.shadow.blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preset.shadow.blur}
              onChange={(e) => updateShadow('blur', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 阴影偏移 X */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">阴影水平偏移 (Offset X)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.shadow.offsetX}px</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={preset.shadow.offsetX}
              onChange={(e) => updateShadow('offsetX', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 阴影偏移 Y */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-slate-500">阴影垂直偏移 (Offset Y)</label>
              <span className="text-xs text-slate-700 font-medium">{preset.shadow.offsetY}px</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={preset.shadow.offsetY}
              onChange={(e) => updateShadow('offsetY', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 阴影颜色 */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">阴影颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexFromRgba(preset.shadow.color)}
                onChange={(e) => {
                  const [, , , alpha] = parseRgba(preset.shadow.color);
                  updateShadow('color', `rgba(${hexToRgb(e.target.value)}, ${alpha})`);
                }}
                className="w-10 h-10"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={parseRgba(preset.shadow.color)[3]}
                onChange={(e) => {
                  const [r, g, b] = parseRgba(preset.shadow.color);
                  updateShadow('color', `rgba(${r}, ${g}, ${b}, ${e.target.value})`);
                }}
                className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                title="Alpha"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Background 背景 */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Background</h3>
        <div className="space-y-4">
          {/* 背景类型 */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                updateBackground({
                  type: 'solid',
                  color: preset.background.color || '#ffffff',
                })
              }
              className={`flex-1 py-2 text-sm rounded-xl transition-colors ${
                preset.background.type === 'solid'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              纯色
            </button>
            <button
              onClick={() =>
                updateBackground({
                  type: 'gradient',
                  gradient: preset.background.gradient || {
                    start: '#6366f1',
                    end: '#a855f7',
                    angle: 135,
                  },
                })
              }
              className={`flex-1 py-2 text-sm rounded-xl transition-colors ${
                preset.background.type === 'gradient'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              渐变
            </button>
          </div>

          {/* 纯色背景颜色 */}
          {preset.background.type === 'solid' && (
            <div>
              <label className="text-xs text-slate-500 block mb-2">背景颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={preset.background.color || '#ffffff'}
                  onChange={(e) =>
                    updateBackground({
                      type: 'solid',
                      color: e.target.value,
                    })
                  }
                  className="w-10 h-10"
                />
                <input
                  type="text"
                  value={preset.background.color || '#ffffff'}
                  onChange={(e) =>
                    updateBackground({
                      type: 'solid',
                      color: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* 渐变背景配置 */}
          {preset.background.type === 'gradient' && preset.background.gradient && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={preset.background.gradient.start}
                  onChange={(e) =>
                    updateBackground({
                      type: 'gradient',
                      gradient: {
                        ...preset.background.gradient!,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-10 h-10"
                />
                <span className="text-xs text-slate-500">起始色</span>
                <input
                  type="color"
                  value={preset.background.gradient.end}
                  onChange={(e) =>
                    updateBackground({
                      type: 'gradient',
                      gradient: {
                        ...preset.background.gradient!,
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-10 h-10"
                />
                <span className="text-xs text-slate-500">结束色</span>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-slate-500">渐变角度</label>
                  <span className="text-xs text-slate-700 font-medium">{preset.background.gradient.angle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={preset.background.gradient.angle}
                  onChange={(e) =>
                    updateBackground({
                      type: 'gradient',
                      gradient: {
                        ...preset.background.gradient!,
                        angle: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* AI 配色按钮 */}
          <button
            onClick={onAiSuggest}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
          >
            ✨ AI 智能配色
          </button>
        </div>
      </section>
    </div>
  );
}

// 辅助函数
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function parseRgba(rgba: string): [number, number, number, number] {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (match) {
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
      parseFloat(match[4] ?? '1'),
    ];
  }
  return [0, 0, 0, 1];
}

function hexFromRgba(rgba: string): string {
  const [r, g, b] = parseRgba(rgba);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
