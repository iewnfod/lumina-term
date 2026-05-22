import {ITerminalOptions} from "@xterm/xterm";

export interface TerminalProfile extends ITerminalOptions {
    name: string;
    exePath: string;
    cols: number; rows: number;
    padding?: number | {x?: number, y?: number, left?: number, right?: number, top?: number, bottom?: number};
    themePath?: string;
}
