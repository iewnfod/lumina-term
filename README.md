<p align="center">
  <a href="./src/assets/icon.svg">
    <img src="./src/assets/icon.svg" width="120" height="120" alt="logo">
  </a>
  <h3 align="center">Lumina Terminal</h3>
</p>
<p align="center">
  <a href="./README_zh.md">简体中文</a> | English
</p>

A modern, cross-platform terminal emulator built with Tauri, React, and Xterm.js — featuring a sleek UI, command palette, and customizable profiles.

## Screenshots

### Terminal
<p align="center">
  <img src="./assets/terminal-en.png" alt="Terminal" width="800">
</p>

### Command Palette
<p align="center">
  <img src="./assets/command-palette-en.png" alt="Command Palette" width="800">
</p>

### Settings
<p align="center">
  <img src="./assets/settings-en.png" alt="Settings" width="800">
</p>

### Profile
<p align="center">
  <img src="./assets/profile-en.png" alt="Profile" width="800">
</p>

## Features

### Terminal
* Multi-tab terminal backed by [portable-pty](https://docs.rs/portable-pty/latest/portable_pty/) — each tab runs a real shell process
* Configurable shell per profile — use PowerShell, WSL, Git Bash, or any executable
* [WebGL renderer](https://github.com/xtermjs/xterm.js/tree/master/addons/addon-webgl) for GPU-accelerated rendering (optional per-profile)
* Chunked output batching — smoothly handles large text dumps without blocking the UI
* Drag and drop files into the terminal to insert their paths
* Auto-resize terminal dimensions when the window or container changes

### User Interface
* **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) — search and execute commands with keyboard navigation
* **Tab Bar** — sidebar with tab list, drag region, and hover-close buttons, toggleable via title bar or command palette
* **Custom Title Bar** — window controls (minimize/maximize/close) integrated with the terminal theme on Windows & Linux
* **Auto Theme** — UI light/dark mode automatically syncs to the terminal background color

### Keyboard Shortcuts
* Fully customizable keybindings stored in the config file
* Default bindings:
  * `Ctrl/Cmd+T` — New tab
  * `Ctrl/Cmd+W` — Close current tab
  * `Ctrl/Cmd+,` — Open settings
  * `Ctrl/Cmd+Shift+P` — Command palette
  * `Ctrl/Cmd+1–9` — Switch to tab by index
* `Ctrl+C` / `Ctrl+Shift+C` swap (non-macOS) — copy selection with `Ctrl+C`, send SIGINT with `Ctrl+Shift+C`

### Profiles
* Multiple named profiles with per-profile shell, dimensions, fonts, and theme
* Terminal settings per profile:
  * Shell executable path (with file browser)
  * Rows & columns
  * Padding
  * Font family, weight, size, and italic style
  * WebGL renderer toggle
* Custom terminal themes via JSON files (xterm.js ITheme format) with live color preview

### i18n
* English & Simplified Chinese (简体中文)

### Welcome Wizard
* First-run onboarding with language selection, profile creation, and a confetti finish

## Performance

Lumina Terminal's rendering performance is close to [Alacritty](https://alacritty.org/), delivering smooth output even with large text files.

**Benchmark setup:**
```shell
# Generate test file
base64 /dev/urandom | head -c 50000000 > bigfile.txt
# Measure output time
time cat bigfile.txt
```

**Environment:** Windows 11 + WSL2 (Debian) via PowerShell 7

<p align="center">
  <img src="./assets/print-50mb-text-file.png" alt="Performance: Lumina Terminal vs Alacritty" width="800">
</p>

Lumina Terminal completed in **0m4.008s** vs Alacritty's **0m3.223s** — well within the range for high-performance daily use.

## Development
1. Clone the repo and enter it.
```shell
git clone https://github.com/iewnfod/lumina-terminal.git
cd lumina-terminal
```
2. Install dependencies.
```shell
pnpm install
```
3. Run tauri dev.
```shell
pnpm tauri dev
```

## Technology Used
* [Tauri & Tauri Plugins](https://tauri.app/)
* [Rust](https://rust-lang.org/)
* [pnpm](https://pnpm.io/)
* [TypeScript](https://www.typescriptlang.org/)
* [React](https://react.dev/)
* [Vite](https://vite.dev/)
* [HeroUI](https://heroui.com/)
* [portable-pty](https://docs.rs/portable-pty/latest/portable_pty/)
* [Xterm.js & Addons](https://xtermjs.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Lucide Icons](https://lucide.dev/)
* [log](https://docs.rs/log/latest/log/)

## License
[Mozilla Public License Version 2.0](./LICENSE)
