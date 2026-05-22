import {TerminalProfile} from "./terminal.ts";
import {Languages} from "../hooks/i18n.tsx";

export type Actions = "newTab" | "openConfigFile" | "closeTab" | "openCommandPalette";
export type WithKeys = "ctrl" | "shift" | "alt" | "command" | "CtrlOrCommand";

export interface GlobalConfig {
    language: Languages;
    profiles: TerminalProfile[];
    showTabBar?: boolean;
    bindings?: {
        key: string;
        with: WithKeys[];
        action: Actions;
    }[];
}
