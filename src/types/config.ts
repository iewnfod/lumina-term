import {TerminalProfile} from "./terminal.ts";
import {Languages} from "../hooks/i18n.tsx";

export type Actions = "newTab" | "openConfigFile" | "closeTab" | "openCommandPalette" | "openSettings";
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
    showTabBar?: boolean;
    bindings?: Binding[];
    closeWindowOnLastTab?: boolean;
    copyWithCtrl?: boolean;
}
