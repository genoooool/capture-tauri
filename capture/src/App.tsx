import { useState, useEffect, useCallback } from 'react';
import type { Preset, CaptureArea } from './types';
import { DEFAULT_PRESETS, loadPresets, savePresets } from './types';
import { canvasToPng } from './services/imageProcessor';
import { getDpiInfo, captureScreen, copyToClipboard, saveToFile } from './services/tauriCommands';
import SelectionOverlay from './components/SelectionOverlay';
import ImagePreview from './components/ImagePreview';
import ConfigPanel from './components/ConfigPanel';
import PresetList from './components/PresetList';

function App() {
  // 状态管理
  const [showOverlay, setShowOverlay] = useState(false);
  const [baseScreenshot, setBaseScreenshot] = useState<string | null>(null);
  const [currentPreset, setCurrentPreset] = useState<Preset>(DEFAULT_PRESETS[0]);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [finalCanvas, setFinalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 加载自定义预设
  useEffect(() => {
    const stored = loadPresets();
    if (stored.length > 0) {
      setCustomPresets(stored);
    }
  }, []);

  // 显示通知
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 处理截图完成
  const handleCapture = useCallback(async (area: CaptureArea) => {
    setShowOverlay(false);
    setIsProcessing(true);

    try {
      // 获取截图数据
      const screenshotData = await captureScreen(area);
      setBaseScreenshot(screenshotData);
    } catch (error) {
      console.error('Failed to capture screen:', error);
      showNotification('截图失败，请重试', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [showNotification]);

  // 处理预设变更
  const handlePresetChange = useCallback((newPreset: Preset) => {
    setCurrentPreset(newPreset);
  }, []);

  // 处理预设选择
  const handleSelectPreset = useCallback((preset: Preset) => {
    setCurrentPreset(preset);
  }, []);

  // 处理保存预设
  const handleSavePreset = useCallback((name: string) => {
    const newPreset: Preset = {
      ...currentPreset,
      id: `custom-${Date.now()}`,
      name,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    savePresets(updated);
    showNotification(`已保存预设 "${name}"`);
  }, [currentPreset, customPresets, showNotification]);

  // 处理 AI 配色
  const handleAiSuggest = useCallback(async () => {
    if (!baseScreenshot) {
      showNotification('请先进行截图', 'error');
      return;
    }

    showNotification('正在分析截图颜色...', 'success');

    // TODO: 实现 AI 配色功能
    // 暂时随机生成一个渐变背景作为演示
    const colors = [
      { start: '#6366f1', end: '#a855f7', angle: 135 },
      { start: '#f472b6', end: '#fbbf24', angle: 45 },
      { start: '#34d399', end: '#60a5fa', angle: 90 },
      { start: '#f87171', end: '#fbbf24', angle: 180 },
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setCurrentPreset((prev: Preset) => ({
      ...prev,
      background: {
        type: 'gradient',
        gradient: randomColor,
      },
    }));

    showNotification('已应用推荐配色方案');
  }, [baseScreenshot, showNotification]);

  // 处理导出 PNG
  const handleExport = useCallback(async () => {
    if (!finalCanvas) {
      showNotification('没有可导出的图片', 'error');
      return;
    }

    try {
      const blob = await canvasToPng(finalCanvas);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      await saveToFile(blob, `screenshot-${timestamp}.png`);
      showNotification('已保存图片');
    } catch (error) {
      console.error('Failed to export:', error);
      showNotification('导出失败', 'error');
    }
  }, [finalCanvas, showNotification]);

  // 处理复制到剪贴板
  const handleCopyToClipboard = useCallback(async () => {
    if (!finalCanvas) {
      showNotification('没有可复制的图片', 'error');
      return;
    }

    try {
      const blob = await canvasToPng(finalCanvas);
      await copyToClipboard(blob);
      showNotification('已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('复制失败', 'error');
    }
  }, [finalCanvas, showNotification]);

  // 处理图片就绪
  const handleImageReady = useCallback((canvas: HTMLCanvasElement) => {
    setFinalCanvas(canvas);
  }, []);

  // 开始截图
  const startCapture = useCallback(async () => {
    try {
      // 先截取整个屏幕作为选区背景
      const dpiInfo = await getDpiInfo();
      const screenWidth = window.screen.width * dpiInfo.scale_x;
      const screenHeight = window.screen.height * dpiInfo.scale_y;

      const fullScreenshot = await captureScreen({
        x: 0,
        y: 0,
        width: Math.round(screenWidth),
        height: Math.round(screenHeight),
      });

      setBaseScreenshot(fullScreenshot);
      setShowOverlay(true);
    } catch (error) {
      console.error('Failed to start capture:', error);
      showNotification('无法启动截图', 'error');
    }
  }, [showNotification]);

  // 取消选区
  const handleCancelOverlay = useCallback(() => {
    setShowOverlay(false);
    setBaseScreenshot(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Capture</h1>
            <span className="text-xs text-slate-400">截图美化工具</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={startCapture}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              截图 (Ctrl+Shift+Space)
            </button>
            {finalCanvas && (
              <>
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  复制
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  导出 PNG
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-[1800px] mx-auto p-6">
        <div className="flex gap-6">
          {/* 左侧预览区 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-3xl shadow-sm p-6 h-[calc(100vh-180px)] sticky top-20">
              <ImagePreview
                screenshotDataUrl={showOverlay ? baseScreenshot : baseScreenshot}
                preset={currentPreset}
                onImageReady={handleImageReady}
              />
            </div>
          </div>

          {/* 右侧配置面板 */}
          <div className="w-80 flex-shrink-0">
            <div className="space-y-4">
              <ConfigPanel
                preset={currentPreset}
                onPresetChange={handlePresetChange}
                onAiSuggest={handleAiSuggest}
              />
              <PresetList
                currentPreset={currentPreset}
                onSelectPreset={handleSelectPreset}
                onSavePreset={handleSavePreset}
                customPresets={customPresets}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 截图选区遮罩 */}
      {showOverlay && baseScreenshot && (
        <SelectionOverlay
          onCapture={handleCapture}
          onCancel={handleCancelOverlay}
          screenshotDataUrl={baseScreenshot}
        />
      )}

      {/* 通知 */}
      {notification && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 transition-all ${
            notification.type === 'success'
              ? 'bg-slate-800 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default App;
