import {TerminalProfile} from "./terminal.ts";
import {Languages} from "../hooks/i18n.tsx";

export type Actions = "newTab" | "openConfig" | "closeTab";
export type WithKeys = "ctrl" | "shift" | "alt" | "command" | "CtrlOrCommand";

export interface GlobalConfig {
    language: Languages;
    profiles: TerminalProfile[];
    bindings?: {
        key: string;
        with: WithKeys[];
        action: Actions;
    }[];
}
