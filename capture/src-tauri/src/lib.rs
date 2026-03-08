use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, Rgba};
use image::codecs::png::PngEncoder;
use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Wry,
};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[cfg(target_os = "windows")]
use windows::{
    Win32::Foundation::*,
    Win32::Graphics::Gdi::*,
    Win32::UI::HiDpi::GetDpiForSystem,
    Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN},
};

// 截图选区结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureArea {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

// DPI 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DpiInfo {
    pub scale_x: f64,
    pub scale_y: f64,
}

// 应用状态
pub struct AppState {
    pub capture_area: Mutex<Option<CaptureArea>>,
    pub screenshot_data: Mutex<Option<Vec<u8>>>,
    pub current_shortcut: Mutex<String>,
    pub selection_screenshot: Mutex<Option<String>>, // 存储全屏截图用于 overlay 显示
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            capture_area: Mutex::new(None),
            screenshot_data: Mutex::new(None),
            current_shortcut: Mutex::new("Ctrl+Shift+Space".to_string()),
            selection_screenshot: Mutex::new(None),
        }
    }
}

// 获取 DPI 缩放比例
#[tauri::command]
#[cfg(target_os = "windows")]
fn get_dpi_info() -> Result<DpiInfo, String> {
    unsafe {
        let dpi = GetDpiForSystem();
        let scale = dpi as f64 / 96.0;
        Ok(DpiInfo {
            scale_x: scale,
            scale_y: scale,
        })
    }
}

#[tauri::command]
#[cfg(not(target_os = "windows"))]
fn get_dpi_info() -> Result<DpiInfo, String> {
    Ok(DpiInfo {
        scale_x: 1.0,
        scale_y: 1.0,
    })
}

// 截取屏幕指定区域（支持全屏，当 area 为 None 时）
#[tauri::command]
#[cfg(target_os = "windows")]
fn capture_screen(area: Option<CaptureArea>) -> Result<String, String> {
    unsafe {
        // 获取屏幕 DC
        let hdc_screen = GetDC(HWND(std::ptr::null_mut()));
        if hdc_screen.is_invalid() {
            return Err("Failed to get screen DC".to_string());
        }

        // 如果没有指定区域，截取全屏
        let (x, y, width, height) = match area {
            Some(a) => (a.x, a.y, a.width, a.height),
            None => {
                // 获取屏幕尺寸
                let screen_width = GetSystemMetrics(SM_CXSCREEN);
                let screen_height = GetSystemMetrics(SM_CYSCREEN);
                (0, 0, screen_width, screen_height)
            }
        };

        // 创建兼容 DC
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            ReleaseDC(HWND(std::ptr::null_mut()), hdc_screen);
            return Err("Failed to create compatible DC".to_string());
        }

        // 创建兼容位图
        let hbitmap = CreateCompatibleBitmap(hdc_screen, width, height);
        if hbitmap.is_invalid() {
            let _ = DeleteDC(hdc_mem);
            ReleaseDC(HWND(std::ptr::null_mut()), hdc_screen);
            return Err("Failed to create compatible bitmap".to_string());
        }

        // 选择位图到内存 DC
        let old_bitmap = SelectObject(hdc_mem, hbitmap);

        // 使用 BitBlt 复制屏幕区域
        let _ = BitBlt(
            hdc_mem,
            0,
            0,
            width,
            height,
            hdc_screen,
            x,
            y,
            SRCCOPY,
        );

        // 恢复旧位图
        SelectObject(hdc_mem, old_bitmap);

        // 释放屏幕 DC
        ReleaseDC(HWND(std::ptr::null_mut()), hdc_screen);

        // 获取位图数据
        let buffer_size = (width * height * 4) as usize;
        let mut buffer: Vec<u8> = vec![0u8; buffer_size.max(1)];

        let mut bitmap_info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // 负值表示从上到下
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [RGBQUAD {
                rgbBlue: 0,
                rgbGreen: 0,
                rgbRed: 0,
                rgbReserved: 0,
            }],
        };

        let result = GetDIBits(
            hdc_mem,
            hbitmap,
            0,
            height as u32,
            Some(buffer.as_mut_ptr().cast()),
            &mut bitmap_info,
            DIB_RGB_COLORS,
        );

        // 清理
        let _ = DeleteObject(hbitmap);
        let _ = DeleteDC(hdc_mem);

        if result == 0 {
            return Err("Failed to get bitmap bits".to_string());
        }

        // Windows BitBlt 返回 BGRA，转换为 RGBA
        for chunk in buffer.chunks_mut(4) {
            chunk.swap(0, 2); // B <-> R
        }

        // 创建 RGBA 图像
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
            ImageBuffer::from_raw(width as u32, height as u32, buffer)
                .ok_or("Failed to create image from buffer")?;

        // 编码为 PNG
        let mut png_data: Vec<u8> = Vec::new();
        let cursor = std::io::Cursor::new(&mut png_data);
        PngEncoder::new(cursor)
            .write_image(
                img.as_raw(),
                width as u32,
                height as u32,
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| format!("Failed to encode PNG: {}", e))?;

        // 转换为 Base64
        let base64_data = general_purpose::STANDARD.encode(&png_data);
        Ok(format!("data:image/png;base64,{}", base64_data))
    }
}

#[tauri::command]
#[cfg(not(target_os = "windows"))]
fn capture_screen(_area: Option<CaptureArea>) -> Result<String, String> {
    Err("Screenshot is only supported on Windows".to_string())
}

// 创建系统托盘
fn create_tray(app: &tauri::AppHandle<Wry>) -> Result<(), tauri::Error> {
    let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
fn update_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // 先注销所有快捷键
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;

    let shortcut_clone = shortcut.clone();

    // 注册新快捷键
    let result = app.global_shortcut()
        .on_shortcut(shortcut.as_str(), move |app, _shortcut, _event| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.emit("trigger-screenshot", ());
            }
        });

    if let Err(e) = result {
        // 注册失败，尝试恢复原快捷键
        eprintln!("Failed to register shortcut '{}': {}", shortcut_clone, e);
        return Err(format!("Failed to register shortcut '{}': {}", shortcut_clone, e));
    }

    // 更新状态
    if let Some(state) = app.try_state::<AppState>() {
        let mut current_shortcut = state.current_shortcut.lock().map_err(|e| e.to_string())?;
        *current_shortcut = shortcut_clone;
    }

    Ok(())
}

// 显示透明全屏选区窗口
#[tauri::command]
fn show_selection_window(app: tauri::AppHandle) -> Result<(), String> {
    // 获取 selection-overlay 窗口并显示
    let window = app.get_webview_window("selection-overlay")
        .ok_or("Selection overlay window not found")?;

    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

// 执行选区截图
#[tauri::command]
fn do_selection_capture(
    app: tauri::AppHandle,
    area: CaptureArea,
) -> Result<(), String> {
    use tauri::Emitter;

    // 获取 DPI 信息
    let dpi_info = get_dpi_info()?;

    // 将 CSS 像素转换为物理像素
    let physical_area = CaptureArea {
        x: (area.x as f64 * dpi_info.scale_x) as i32,
        y: (area.y as f64 * dpi_info.scale_y) as i32,
        width: (area.width as f64 * dpi_info.scale_x) as i32,
        height: (area.height as f64 * dpi_info.scale_y) as i32,
    };

    // 执行截图（传入 Some(area)）
    let screenshot_data = capture_screen(Some(physical_area))?;

    // 获取主窗口
    let main_window = app.get_webview_window("main")
        .ok_or("Main window not found")?;

    // 发送事件到主窗口，包含截图数据
    main_window
        .emit("selection-captured", screenshot_data)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    // 关闭选区窗口
    if let Some(selection_window) = app.get_webview_window("selection-overlay") {
        let _ = selection_window.close();
    }

    // 显示并聚焦主窗口
    let _ = main_window.show();
    let _ = main_window.set_focus();

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::default())
        .setup(|app| {
            // 创建系统托盘
            create_tray(&app.handle())?;

            // 从 AppState 读取保存的快捷键（默认 Ctrl+Shift+Space）
            let state = app.state::<AppState>();
            let shortcut = {
                let current_shortcut = state.current_shortcut.lock().map_err(|e| e.to_string())?;
                current_shortcut.clone()
            };

            // 注册全局快捷键 (v2 API)
            match app.global_shortcut().on_shortcut(shortcut.as_str(), move |app, _shortcut, _event| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("trigger-screenshot", ());
                }
            }) {
                Ok(_) => {}
                Err(e) => {
                    eprintln!("Failed to register shortcut '{}': {}", shortcut, e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_dpi_info,
            capture_screen,
            update_shortcut,
            show_selection_window,
            do_selection_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
