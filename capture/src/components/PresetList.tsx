import { useState } from 'react';
import type { Preset } from '../types';
import { DEFAULT_PRESETS } from '../types';

interface PresetListProps {
  currentPreset: Preset;
  onSelectPreset: (preset: Preset) => void;
  onSavePreset: (name: string) => void;
  customPresets: Preset[];
}

export default function PresetList({ currentPreset, onSelectPreset, onSavePreset, customPresets }: PresetListProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const allPresets = [...DEFAULT_PRESETS, ...customPresets];

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim());
      setNewPresetName('');
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Presets</h3>
        <button
          onClick={() => setIsSaving(true)}
          className="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
        >
          + 保存当前
        </button>
      </div>

      {/* 预设列表 */}
      <div className="space-y-2">
        {allPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              currentPreset.id === preset.id
                ? 'bg-indigo-50 border-2 border-indigo-500'
                : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
            }`}
          >
            {/* 预设缩略图 */}
            <div
              className="w-12 h-10 rounded-lg flex-shrink-0 overflow-hidden"
              style={{
                background:
                  preset.background.type === 'gradient' && preset.background.gradient
                    ? `linear-gradient(${preset.background.gradient.angle}deg, ${preset.background.gradient.start}, ${preset.background.gradient.end})`
                    : preset.background.color,
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  backgroundColor: preset.background.type === 'solid' ? preset.background.color : undefined,
                }}
              >
                <div
                  className="w-6 h-4 rounded-sm shadow-sm"
                  style={{
                    borderRadius: Math.min(preset.borderRadius / 3, 4),
                    backgroundColor: preset.background.type === 'solid' ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  }}
                />
              </div>
            </div>

            {/* 预设名称 */}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-700">{preset.name}</p>
              <p className="text-xs text-slate-400">
                R{preset.borderRadius} · P{preset.padding}
              </p>
            </div>

            {/* 选中标记 */}
            {currentPreset.id === preset.id && (
              <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* 保存预设弹窗 */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">保存为新预设</h4>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="输入预设名称..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePreset();
                } else if (e.key === 'Escape') {
                  setIsSaving(false);
                  setNewPresetName('');
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsSaving(false);
                  setNewPresetName('');
                }}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
