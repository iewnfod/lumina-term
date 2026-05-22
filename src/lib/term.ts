import {TerminalProfile} from "../types/terminal.ts";
import {ITheme} from "@xterm/xterm";
import {DEFAULT_TERMINAL_THEME, MACOS_PADDING_OFFSET} from "../constants.ts";
import {invoke} from "@tauri-apps/api/core";
import {isMacOS} from "./utils.ts";

export function parseProfilePadding(profile: TerminalProfile) {
    let paddingLeft = 0, paddingRight = 0, paddingTop = 0, paddingBottom = 0;
    if (profile.padding) {
        if (typeof profile.padding === "number") {
            paddingLeft = profile.padding; paddingRight = profile.padding;
            paddingTop = profile.padding; paddingBottom = profile.padding;
        } else {
            // x, y
            paddingLeft = profile.padding.x ?? paddingLeft; paddingRight = profile.padding.x ?? paddingRight;
            paddingTop = profile.padding.y ?? paddingTop; paddingBottom = profile.padding.y ?? paddingBottom;
            // left, right, top, bottom
            paddingLeft = profile.padding.left ?? paddingLeft;
            paddingRight = profile.padding.right ?? paddingRight;
            paddingTop = profile.padding.top ?? paddingTop;
            paddingBottom = profile.padding.bottom ?? paddingBottom;
        }
    }
    if (isMacOS()) {
        paddingLeft += MACOS_PADDING_OFFSET; paddingRight += MACOS_PADDING_OFFSET;
        paddingTop += MACOS_PADDING_OFFSET; paddingBottom += MACOS_PADDING_OFFSET;
    }
    return {
        left: paddingLeft,
        right: paddingRight,
        top: paddingTop,
        bottom: paddingBottom,
    };
}

export async function parseProfileTheme(profile: TerminalProfile) {
    let theme: ITheme = DEFAULT_TERMINAL_THEME;
    if (profile.themePath) {
        const exists = await invoke("path_exist", {path: profile.themePath});
        if (exists) {
            const readTheme = await invoke<string>("read_file", {path: profile.themePath});
            if (readTheme) {
                try {
                    const t = JSON.parse(readTheme);
                    theme = {...theme, ...t};
                } catch (e) {
                    console.error("Failed to parse theme", e);
                }
            }
        }
    }
    if (profile.theme) {
        theme = {...theme, ...profile.theme};
    }
    return theme;
}
