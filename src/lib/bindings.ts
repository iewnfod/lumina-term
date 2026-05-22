import {Terminal} from "@xterm/xterm";
import {Actions, Binding} from "../types/config.ts";
import {DEFAULT_BINDINGS} from "../constants.ts";
import {isMacOS} from "./utils.ts";

export function parseBindings(configBindings?: Binding[]): Binding[] {
    const merged = [...DEFAULT_BINDINGS];
    if (!configBindings) return merged;

    for (const userBinding of configBindings) {
        const idx = merged.findIndex((b) => b.action === userBinding.action);
        if (idx !== -1) {
            merged[idx] = userBinding;
        } else {
            merged.push(userBinding);
        }
    }

    return merged;
}

export function loadBindings(
    term: Terminal,
    bindings: Binding[],
    onAction: (action: Actions) => void,
) {
    term.attachCustomKeyEventHandler((event) => {
        for (const binding of bindings) {
            if (binding.key === event.key) {
                let flag = true;
                for (const w of binding.with) {
                    switch (w) {
                        case "ctrl":
                            flag = flag && event.ctrlKey;
                            break;
                        case "shift":
                            flag = flag && event.shiftKey;
                            break;
                        case "alt":
                            flag = flag && event.altKey;
                            break;
                        case "command":
                            flag = flag && event.metaKey;
                            break;
                        case "CtrlOrCommand":
                            if (isMacOS()) {
                                flag = flag && event.metaKey;
                            } else {
                                flag = flag && event.ctrlKey;
                            }
                            break;
                    }
                }
                if (flag) {
                    onAction(binding.action);
                    return false;
                }
            }
        }
        return true;
    });
}
