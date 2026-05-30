use std::sync::Arc;
use std::thread;
use std::time::Duration;

use portable_pty::{CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::state::{CommandChild, SharedChild, TerminalState};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConfig {
    pub host: String,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub identity_file: Option<String>,
}

#[tauri::command]
pub fn start_terminal(
    app: AppHandle,
    id: String,
    exe_path: String,
    state: State<TerminalState>,
    cols: Option<u16>,
    rows: Option<u16>,
    profile_type: Option<String>,
    ssh_config: Option<SshConfig>,
) {
    {
        let terminals = state
            .terminals
            .try_lock()
            .expect("Failed to lock terminals");
        if terminals.contains_key(&id) {
            log::warn!("Terminal with id {} already exists", id);
            return;
        }
    }

    let pty_system = portable_pty::native_pty_system();
    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };
    let pty_pair = pty_system.openpty(size).unwrap();

    let cmd = if profile_type.as_deref() == Some("remote") {
        let ssh = ssh_config.as_ref().expect("SSH config required for remote profile");
        let ssh_exe = if exe_path.is_empty() { "ssh".to_string() } else { exe_path };
        let mut c = CommandBuilder::new(ssh_exe);
        let user_host = if let Some(ref user) = ssh.user {
            format!("{}@{}", user, ssh.host)
        } else {
            ssh.host.clone()
        };
        c.arg(&user_host);
        if let Some(port) = ssh.port {
            c.args(&["-p", &port.to_string()]);
        }
        if let Some(ref identity_file) = ssh.identity_file {
            c.args(&["-i", identity_file]);
        } else {
            c.args(&["-o", "PubkeyAuthentication=no", "-o", "PreferredAuthentications=password"]);
        }
        c.env("TERM", "xterm-256color");
        c
    } else {
        let mut c = CommandBuilder::new(exe_path);
        c.args(&["--login", "-i"]);
        c.env("TERM", "xterm-256color");
        c
    };
    let child: CommandChild = pty_pair
        .slave
        .spawn_command(cmd)
        .expect("Failed to spawn terminal");

    pty_pair.master.resize(size).expect("Failed to resize pty");

    let mut reader = pty_pair
        .master
        .try_clone_reader()
        .expect("Failed to clone reader");
    let writer = pty_pair
        .master
        .take_writer()
        .expect("Failed to clone writer");

    let shared_child: SharedChild = Arc::new(std::sync::Mutex::new(child));

    // Store in state
    {
        let mut terminals = state
            .terminals
            .try_lock()
            .expect("Failed to lock terminals");
        terminals.insert(id.clone(), (pty_pair, shared_child.clone(), writer));
    }

    // Reader thread: forwards terminal output to frontend
    let term_write_event_name = format!("term-write-{}", id);
    let app_reader = app.clone();
    let id_reader = id.clone();
    thread::spawn(move || {
        log::debug!("Reader thread started for {}", id_reader);
        let mut buffer = [0u8; 1024*8];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    log::debug!("Terminal {} reader got EOF", id_reader);
                    break;
                }
                Ok(n) => {
                    let bytes = &buffer[..n];
                    if let Ok(text) = std::str::from_utf8(bytes) {
                        let _ = app_reader.emit(&term_write_event_name, text.to_string());
                    }
                }
                Err(e) => {
                    log::error!("Terminal {} reader error: {}", id_reader, e);
                    break;
                }
            }
        }
        log::debug!("Reader thread ended for {}", id_reader);
    });

    // Watcher thread: polls child process exit, then cleans up
    let term_exit_event_name = format!("term-exit-{}", id);
    let app_watcher = app.clone();
    let state_watcher = state.inner().clone();
    let id_watcher = id.clone();
    thread::spawn(move || {
        log::debug!("Watcher thread started for {}", id_watcher);
        loop {
            let exited = {
                let mut child_guard = shared_child
                    .try_lock()
                    .expect("Failed to lock child in watcher");
                match child_guard.try_wait() {
                    Ok(Some(status)) => {
                        log::info!(
                            "Child process {} exited with {:?}",
                            id_watcher, status
                        );
                        true
                    }
                    Ok(None) => false,
                    Err(e) => {
                        log::error!("Child process {} wait error: {}", id_watcher, e);
                        true
                    }
                }
            };
            if exited {
                break;
            }
            thread::sleep(Duration::from_millis(200));
        }

        // Clean up terminal state
        log::debug!("Cleaning up state for terminal {}", id_watcher);
        {
            let mut terminals = state_watcher
                .terminals
                .try_lock()
                .expect("Failed to lock terminals in watcher");
            let removed = terminals.remove(&id_watcher);
            log::debug!(
                "Terminal {} removed from state: {:?}",
                id_watcher,
                removed.is_some()
            );
        }

        // Notify frontend
        log::debug!("Emitting term-exit event for {}", id_watcher);
        app_watcher
            .emit(&term_exit_event_name, ())
            .expect("Failed to emit exit event");
        log::debug!("term-exit event emitted for {}", id_watcher);
    });
}

#[tauri::command]
pub fn kill_terminal(id: String, state: State<TerminalState>) {
    let mut terminals = state
        .terminals
        .try_lock()
        .expect("Failed to lock terminals");
    if let Some((_, shared_child, _)) = terminals.remove(&id) {
        log::info!("Killing terminal {}", id);
        let mut child = shared_child
            .try_lock()
            .expect("Failed to lock child in kill_terminal");
        let _ = child.kill();
    } else {
        log::warn!("Terminal with id {} not found", id);
    }
}

#[tauri::command]
pub fn write_to_terminal(id: String, content: &[u8], state: State<TerminalState>) {
    let mut terminals = state
        .terminals
        .try_lock()
        .expect("Failed to lock terminals");
    if let Some((_, _, writer)) = terminals.get_mut(&id) {
        writer
            .write_all(content)
            .expect("Failed to write to terminal");
        writer.flush().expect("Failed to flush writer");
    }
}

#[tauri::command]
pub fn resize_terminal(id: String, cols: u16, rows: u16, state: State<TerminalState>) {
    let mut terminals = state
        .terminals
        .try_lock()
        .expect("Failed to lock terminals");
    if let Some((pty_pair, _, _)) = terminals.get_mut(&id) {
        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        pty_pair
            .master
            .resize(size)
            .expect("Failed to resize terminal");
    }
}
