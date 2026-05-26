import {TerminalProfile, TerminalRenderOptions} from "./terminal.ts";
import {Languages} from "../hooks/i18n.tsx";

export type Actions = "newTab" | "openConfigFile" | "closeTab" | "openCommandPalette" | "openSettings" | "toTab";
export type WithKeys = "ctrl" | "shift" | "alt" | "command" | "CtrlOrCommand";

export interface Binding {
    key: string;
    with: WithKeys[];
    action: Actions;
    args?: Record<string, string>;
}

export interface GlobalConfig {
    language: Languages;
    profiles: TerminalProfile[];
    globalProfile?: TerminalRenderOptions;
    showTabBar?: boolean;
    bindings?: Binding[];
    closeWindowOnLastTab?: boolean;
    copyWithCtrl?: boolean;
}
