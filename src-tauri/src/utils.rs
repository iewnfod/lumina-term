use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn path_exist(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn read_file(path: String) -> String {
    std::fs::read_to_string(&path).unwrap_or_default()
}

#[tauri::command]
pub fn get_log_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_log_dir()
        .map(|p: std::path::PathBuf| p.to_string_lossy().to_string())
        .map_err(|e: tauri::Error| e.to_string())
}

#[cfg(debug_assertions)]
#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[tauri::command]
pub fn is_debug() -> bool {
    cfg!(debug_assertions)
}
