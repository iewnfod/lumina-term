use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn find_shells() -> Vec<String> {
    let mut shells: Vec<String> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // Common Windows shells
        let candidates = [
            "powershell.exe",
            "pwsh.exe",
            "cmd.exe",
            "bash.exe",
            "wsl.exe",
            "zsh.exe",
            "fish.exe",
            "nu.exe",
        ];
        // Check PATH
        if let Ok(path) = std::env::var("PATH") {
            for dir in path.split(';') {
                for name in &candidates {
                    let full = PathBuf::from(dir).join(name);
                    if full.is_file() && !shells.contains(&full.to_string_lossy().to_string()) {
                        shells.push(full.to_string_lossy().to_string());
                    }
                }
            }
        }
        // Also check known install directories
        let extra_dirs = [
            r"C:\Program Files\PowerShell\7\pwsh.exe",
            r"C:\Program Files (x86)\PowerShell\7\pwsh.exe",
            r"C:\Program Files\Git\bin\bash.exe",
            r"C:\Program Files\Git\usr\bin\bash.exe",
            r"C:\msys64\usr\bin\bash.exe",
            r"C:\msys64\usr\bin\zsh.exe",
            r"C:\cygwin64\bin\bash.exe",
            r"C:\cygwin64\bin\zsh.exe",
            r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
            r"C:\Windows\System32\cmd.exe",
            r"C:\Windows\SysWOW64\cmd.exe",
        ];
        for path in &extra_dirs {
            let p = PathBuf::from(path);
            if p.is_file() && !shells.contains(&p.to_string_lossy().to_string()) {
                shells.push(p.to_string_lossy().to_string());
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Unix-like: common shells
        let candidates = [
            "bash", "zsh", "fish", "sh", "dash", "tcsh", "csh", "ksh", "nu", "elvish",
        ];
        if let Ok(path) = std::env::var("PATH") {
            for dir in path.split(':') {
                for name in &candidates {
                    let full = PathBuf::from(dir).join(name);
                    if full.is_file() && !shells.contains(&full.to_string_lossy().to_string()) {
                        shells.push(full.to_string_lossy().to_string());
                    }
                }
            }
        }
        // Also check common install directories
        let extra_dirs = [
            "/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash",
            "/bin/zsh", "/usr/bin/zsh", "/usr/local/bin/zsh",
            "/bin/fish", "/usr/bin/fish", "/usr/local/bin/fish",
            "/bin/sh", "/usr/bin/sh",
            "/opt/homebrew/bin/bash", "/opt/homebrew/bin/zsh", "/opt/homebrew/bin/fish",
            "/home/linuxbrew/.linuxbrew/bin/bash",
            "/home/linuxbrew/.linuxbrew/bin/zsh",
            "/home/linuxbrew/.linuxbrew/bin/fish",
        ];
        for path in &extra_dirs {
            let p = PathBuf::from(path);
            if p.is_file() && !shells.contains(&p.to_string_lossy().to_string()) {
                shells.push(p.to_string_lossy().to_string());
            }
        }
    }

    shells
}

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

#[tauri::command]
pub fn get_commit_hash() -> String {
    env!("GIT_HASH").to_string()
}
