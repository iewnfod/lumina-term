import {ITheme} from "@xterm/xterm";
import {Binding, GlobalConfig} from "./types/config.ts";

export const DEFAULT_TERMINAL_THEME: ITheme = {
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    cursorAccent: "#000000",
    selectionBackground: "rgba(255, 255, 255, 0.3)",

    // 标准 16 色 ANSI 工具盘
    black: "#000000",
    red: "#cd0000",
    green: "#00cd00",
    yellow: "#cdcd00",
    blue: "#0000ee",
    magenta: "#cd00cd",
    cyan: "#00cdcd",
    white: "#e5e5e5",

    // Bright (高亮) 16 色 ANSI
    brightBlack: "#7f7f7f",
    brightRed: "#ff0000",
    brightGreen: "#00ff00",
    brightYellow: "#ffff00",
    brightBlue: "#5c5cff",
    brightMagenta: "#ff00ff",
    brightCyan: "#00ffff",
    brightWhite: "#ffffff",
};

export const CONFIG_SAVE_PATH = "config.json";

export const DEFAULT_BINDINGS: Binding[] = [
    {
        key: "t",
        with: ["CtrlOrCommand"],
        action: "newTab",
    },
    {
        key: "w",
        with: ["CtrlOrCommand"],
        action: "closeTab",
    },
    {
        key: ",",
        with: ["CtrlOrCommand"],
        action: "openSettings",
    },
    {
        key: "P",
        with: ["CtrlOrCommand", "shift"],
        action: "openCommandPalette",
    },
    {
        key: "1",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "0" },
    },
    {
        key: "2",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "1" },
    },
    {
        key: "3",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "2" },
    },
    {
        key: "4",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "3" },
    },
    {
        key: "5",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "4" },
    },
    {
        key: "6",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "5" },
    },
    {
        key: "7",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "6" },
    },
    {
        key: "8",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "7" },
    },
    {
        key: "9",
        with: ["CtrlOrCommand"],
        action: "toTab",
        args: { index: "last" },
    },
];

export const DEFAULT_CONFIG: GlobalConfig = {
    language: 'en-us',
    profiles: [],
    showTabBar: false,
    copyWithCtrl: false,
};

export const SETTINGS_TAB_ID = "__lum__settings__";

export const ABOUT_TAB_ID = "__lum__about__";
