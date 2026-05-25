<p align="center">
  <a href="./src/assets/icon.svg">
    <img src="./src/assets/icon.svg" width="120" height="120" alt="logo">
  </a>
  <h3 align="center">Lumina Terminal</h3>
</p>
<p align="center">
  简体中文 | <a href="./README.md">English</a>
</p>

一个基于 Tauri、React 和 Xterm.js 构建的现代跨平台终端模拟器，拥有精美的界面、命令面板和可自定义的配置文件。

## 截图

### 终端
<p align="center">
  <img src="./assets/terminal-zh.png" alt="终端" width="800">
</p>

### 命令面板
<p align="center">
  <img src="./assets/command-palette-zh.png" alt="命令面板" width="800">
</p>

### 设置
<p align="center">
  <img src="./assets/settings-zh.png" alt="设置" width="800">
</p>

### 配置文件
<p align="center">
  <img src="./assets/profile-zh.png" alt="配置文件" width="800">
</p>

## 性能

Lumina Terminal 的渲染性能已接近 [Alacritty](https://alacritty.org/)，在处理大文本文件时也能保持流畅输出。

**测试方案：**
```shell
# 生成测试文件
base64 /dev/urandom | head -c 50000000 > bigfile.txt
# 测量输出耗时
time cat bigfile.txt
```

**测试环境：** Windows 11 + WSL2 (Debian)，通过 PowerShell 7 运行

<p align="center">
  <img src="./assets/print-50mb-text-file.png" alt="性能对比：Lumina Terminal vs Alacritty" width="800">
</p>

Lumina Terminal 耗时 **0m4.008s**，Alacritty 耗时 **0m3.223s** — 性能已完全达到日常高频使用的标准。

## 开发
1. 克隆此仓库并进入目录
```shell
git clone https://github.com/iewnfod/lumina-terminal.git
cd lumina-terminal
```
2. 安装依赖
```shell
pnpm install
```
3. 运行 tauri dev
```shell
pnpm tauri dev
```

## 使用的技术
* [Tauri & Tauri Plugins](https://tauri.app/)
* [Rust](https://rust-lang.org/)
* [pnpm](https://pnpm.io/)
* [TypeScript](https://www.typescriptlang.org/)
* [React](https://zh-hans.react.dev/)
* [Vite](https://cn.vite.dev/)
* [HeroUI](https://heroui.com/)
* [portable-pty](https://docs.rs/portable-pty/latest/portable_pty/)
* [Xterm.js & Addons](https://xtermjs.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Lucide Icons](https://lucide.dev/)
* [log](https://docs.rs/log/latest/log/)

## 开源协议
[Mozilla Public License Version 2.0](./LICENSE)
