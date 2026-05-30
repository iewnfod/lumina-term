use std::path::PathBuf;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
pub struct SshHostEntry {
    pub host: String,
    pub config: crate::terminal::SshConfig,
}

#[tauri::command]
pub fn parse_ssh_config() -> Vec<SshHostEntry> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    let config_path = PathBuf::from(&home).join(".ssh").join("config");
    let content = match std::fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut entries: Vec<SshHostEntry> = vec![];
    let mut current_hosts: Vec<String> = vec![];
    let mut current_hostname: Option<String> = None;
    let mut current_port: Option<u16> = None;
    let mut current_user: Option<String> = None;
    let mut current_identity_file: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let keyword = parts.next().unwrap_or("");
        let rest: Vec<&str> = parts.collect();
        let value = rest.join(" ");

        match keyword.to_lowercase().as_str() {
            "host" => {
                // Save previous entry
                if !current_hosts.is_empty() && current_hostname.is_some() {
                    let host = current_hosts[0].clone();
                    let config = crate::terminal::SshConfig {
                        host: current_hostname.unwrap_or_default(),
                        port: current_port,
                        user: current_user.clone(),
                        identity_file: current_identity_file.clone(),
                    };
                    entries.push(SshHostEntry { host, config });
                }
                // Start new entry (skip wildcards like *)
                let hosts: Vec<String> = value
                    .split_whitespace()
                    .filter(|h| *h != "*" && !h.contains('*') && !h.contains('?'))
                    .map(|h| h.to_string())
                    .collect();
                current_hosts = hosts;
                current_hostname = None;
                current_port = None;
                current_user = None;
                current_identity_file = None;
            }
            "hostname" => {
                current_hostname = Some(value);
            }
            "port" => {
                current_port = value.parse().ok();
            }
            "user" => {
                current_user = Some(value);
            }
            "identityfile" => {
                current_identity_file = Some(value);
            }
            _ => {}
        }
    }
    // Save last entry
    if !current_hosts.is_empty() && current_hostname.is_some() {
        let host = current_hosts[0].clone();
        let config = crate::terminal::SshConfig {
            host: current_hostname.unwrap_or_default(),
            port: current_port,
            user: current_user.clone(),
            identity_file: current_identity_file.clone(),
        };
        entries.push(SshHostEntry { host, config });
    }

    entries
}

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

        // Scan MSYS2 directories
        let msys2_roots = [
            r"C:\msys64",
            r"C:\msys2",
        ];
        // Also check Scoop-installed MSYS2
        let scoop_msys2 = std::env::var("USERPROFILE")
            .map(|home| PathBuf::from(home).join(r"scoop\apps\msys2\current"))
            .ok();

        let shell_names = ["bash.exe", "zsh.exe", "fish.exe", "sh.exe"];

        for root in &msys2_roots {
            let usr_bin = PathBuf::from(root).join(r"usr\bin");
            if usr_bin.is_dir() {
                for name in &shell_names {
                    let full = usr_bin.join(name);
                    if full.is_file() && !shells.contains(&full.to_string_lossy().to_string()) {
                        shells.push(full.to_string_lossy().to_string());
                    }
                }
            }
        }

        if let Some(ref scoop_path) = scoop_msys2 {
            let usr_bin = scoop_path.join(r"usr\bin");
            if usr_bin.is_dir() {
                for name in &shell_names {
                    let full = usr_bin.join(name);
                    if full.is_file() && !shells.contains(&full.to_string_lossy().to_string()) {
                        shells.push(full.to_string_lossy().to_string());
                    }
                }
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
