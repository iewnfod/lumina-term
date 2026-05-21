use std::thread;

use portable_pty::{CommandBuilder, PtySize};
use tauri::{AppHandle, Emitter, State};

use crate::state::TerminalState;

#[tauri::command]
pub fn start_terminal(
    app: AppHandle,
    id: String,
    exe_path: String,
    state: State<TerminalState>,
    cols: Option<u16>,
    rows: Option<u16>,
) {
    {
        let terminals = state
            .terminals
            .try_lock()
            .expect("Failed to lock terminals");
        if terminals.contains_key(&id) {
            println!("Terminal with id {} already exists", id);
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

    let mut cmd = CommandBuilder::new(exe_path);
    cmd.args(&["--login", "-i"]);
    let mut _child = pty_pair
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

    {
        let mut terminals = state
            .terminals
            .try_lock()
            .expect("Failed to lock terminals");
        terminals.insert(id.clone(), (pty_pair, _child, writer));
    }

    let term_write_event_name = format!("term-write-{}", id);
    thread::spawn(move || {
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    println!("Terminal {} closed", id);
                    break;
                }
                Ok(n) => {
                    let bytes = &buffer[..n];
                    if let Ok(text) = std::str::from_utf8(bytes) {
                        // println!("Terminal {} output: {}", id, text);
                        app.emit(&term_write_event_name, text.to_string())
                            .expect("Failed to emit event");
                    }
                }
                Err(e) => {
                    eprintln!("Error reading from terminal: {}", e);
                    break;
                }
            }
        }
    });
}

#[tauri::command]
pub fn kill_terminal(id: String, state: State<TerminalState>) {
    let mut terminals = state
        .terminals
        .try_lock()
        .expect("Failed to lock terminals");
    if let Some((_, mut child, _)) = terminals.remove(&id) {
        child.kill().expect("Failed to kill terminal");
    } else {
        println!("Terminal with id {} not found", id);
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
        println!(
            "Resizing terminal {} to {} cols and {} rows",
            id, cols, rows
        );
        pty_pair
            .master
            .resize(size)
            .expect("Failed to resize terminal");
    }
}
