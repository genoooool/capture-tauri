# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Windows screenshot beautification tool built with Tauri v2, React 19, TypeScript, and Vite. Similar to Xnapper - captures screenshots and automatically applies styling (rounded corners, shadows, backgrounds, padding).

## Development Commands

All commands run from the `capture` directory:

```bash
# Install dependencies
npm install

# Start dev server (Vite on port 7000) + Tauri dev
npm run tauri dev

# Build for production
npm run build          # TypeScript compile + Vite build
npm run tauri build    # Build native Windows executable

# Preview production build
npm run preview
```

## Architecture

### Project Structure
```
capture/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ImagePreview.tsx    # Screenshot preview with beautification
│   │   ├── ConfigPanel.tsx     # Style configuration panel
│   │   ├── PresetList.tsx      # Preset management
│   │   └── SelectionOverlay.tsx # Full-screen selection UI
│   ├── services/
│   │   ├── imageProcessor.ts   # Canvas-based image beautification
│   │   └── tauriCommands.ts    # Tauri IPC commands
│   ├── types/
│   │   └── index.ts            # TypeScript types & preset definitions
│   └── App.tsx             # Main application
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Tauri commands (Rust backend)
│   │   └── main.rs         # Entry point
│   └── Cargo.toml          # Rust dependencies
└── package.json
```

### Frontend-Backend Communication

**Tauri Commands** (defined in `lib.rs`, called via `tauriCommands.ts`):
- `get_dpi_info()` - Get Windows DPI scaling info
- `capture_screen(area)` - Capture screen region using BitBlt API
- `update_shortcut(shortcut)` - Update global shortcut
- `show_selection_window()` - Show transparent overlay for area selection
- `do_selection_capture(area)` - Execute screenshot after area selection

**Event System**:
- `trigger-screenshot` - Emitted when global shortcut pressed
- `selection-captured` - Emitted with Base64 PNG after screenshot completes

### Key Modules

**imageProcessor.ts**: Canvas-based image processing
- `generateBeautifiedImage()` - Applies preset styling (rounded corners, shadows, backgrounds)
- Uses offscreen canvas for shadow rendering to avoid clip interference
- Supports solid color and gradient backgrounds

**types/index.ts**: Shared type definitions
- `Preset` - Style configuration (borderRadius, shadow, padding, background)
- `DEFAULT_PRESETS` - Built-in presets: "极简白", "深色模式", "渐变紫"

### Rust Backend (lib.rs)

- Uses Windows GDI API (`BitBlt`, `CreateCompatibleBitmap`) for screenshots
- DPI-aware: converts CSS pixels to physical pixels via `GetDpiForSystem`
- BGRA to RGBA conversion for correct color output
- PNG encoding via `image` crate, Base64 encoding for frontend transfer

## Tech Stack Details

| Layer | Technology |
|-------|-----------|
| Shell | Tauri v2 |
| Frontend | React 19 + TypeScript 5.8 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3.4 |
| State | React hooks (no external state library) |
| Storage | localStorage for presets/shortcuts |

## Platform Notes

- Windows only (GDI screenshot API)
- Default shortcut: `Ctrl+Shift+Space`
- DPI scaling handled automatically
- System tray integration with show/quit menu

## CI/CD - Build & Release

After making changes, push to GitHub for automated Windows build:

```bash
# Push to trigger CI build
git add .
git commit -m "feat: your changes here"
git push origin main
```

**Remote**: `https://github.com/genoooool/capture-tauri/`

The GitHub Actions workflow will:
1. Build the Tauri application for Windows
2. Generate the executable and installer
3. (Optional) Create a release with artifacts
