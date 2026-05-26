mod state;
mod terminal;
mod utils;

use crate::state::TerminalState;
use crate::terminal::*;
use crate::utils::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log::info!("Lumina Terminal starting up");

    let state = TerminalState::default();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("lumina_terminal_lib", log::LevelFilter::Debug)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("lumina-terminal".to_string()),
                    },
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .max_file_size(1_000_000)
                .build(),
        )
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
            find_shells,
            path_exist,
            read_file,
            is_debug,
            get_log_dir,
            get_commit_hash,
            #[cfg(debug_assertions)]
            open_devtools,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to startup Lumina Terminal");
}
