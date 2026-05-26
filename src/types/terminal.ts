import {ITerminalOptions} from "@xterm/xterm";

export type TerminalPadding = number | {x?: number, y?: number, left?: number, right?: number, top?: number, bottom?: number};
export type FontStyle = "normal" | "italic";

export interface TerminalRenderOptions extends ITerminalOptions {
    cols?: number; rows?: number;
    webgl?: boolean;
    padding?: TerminalPadding;
    themePath?: string;
    fontStyle?: FontStyle;
}

export interface TerminalProfile extends TerminalRenderOptions {
    name: string;
    exePath: string;
    default?: boolean;
}
