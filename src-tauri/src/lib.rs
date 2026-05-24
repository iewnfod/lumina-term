mod state;
mod terminal;
mod utils;

use crate::state::TerminalState;
use crate::terminal::*;
use crate::utils::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = TerminalState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            start_terminal,
            kill_terminal,
            write_to_terminal,
            resize_terminal,
            path_exist,
            read_file,
            is_debug,
            #[cfg(debug_assertions)]
            open_devtools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
