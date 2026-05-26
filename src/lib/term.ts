import {TerminalProfile, TerminalRenderOptions} from "../types/terminal.ts";
import {ITheme} from "@xterm/xterm";
import {DEFAULT_TERMINAL_THEME} from "../constants.ts";
import {invoke} from "@tauri-apps/api/core";
import {appDataDir, join} from "@tauri-apps/api/path";

export function parseProfilePadding(profile: TerminalProfile, paddingOffset: number) {
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
    paddingLeft += paddingOffset; paddingRight += paddingOffset;
    paddingTop += paddingOffset; paddingBottom += paddingOffset;
    return {
        left: paddingLeft,
        right: paddingRight,
        top: paddingTop,
        bottom: paddingBottom,
    };
}

export async function parseProfileTheme(profile: TerminalRenderOptions, defaultTheme?: ITheme) {
    let theme: ITheme = defaultTheme ?? DEFAULT_TERMINAL_THEME;
    if (profile.themePath) {
        const basePath = await appDataDir();
        const fullPath = await join(basePath, profile.themePath);
        const paths = [
            fullPath,
            profile.themePath,
        ];
        for (const path of paths) {
            const exists = await invoke<boolean>("path_exist", {path: path});
            if (exists) {
                const readTheme = await invoke<string>("read_file", {path: path});
                if (readTheme) {
                    try {
                        const t = JSON.parse(readTheme);
                        theme = {...theme, ...t};
                    } catch (e) {
                        console.error("Failed to parse theme", e);
                    }
                }
                break;
            }
        }
    }
    if (profile.theme) {
        theme = {...theme, ...profile.theme};
    }
    return theme;
}

export async function parseProfile(profile: TerminalProfile, globalProfile?: TerminalRenderOptions): Promise<TerminalProfile> {
    const p = {...globalProfile, ...profile};
    if (globalProfile) {
        let globalTheme = await parseProfileTheme(globalProfile);
        p.theme = await parseProfileTheme(profile, globalTheme);
    } else {
        p.theme = await parseProfileTheme(p);
    }
    delete p.themePath;
    return p;
}
