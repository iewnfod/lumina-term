import {TerminalProfile} from "./terminal.ts";
import {Languages} from "../hooks/i18n.tsx";

export interface GlobalConfig {
    language: Languages;
    profiles: TerminalProfile[];
}
