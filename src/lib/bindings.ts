import {Terminal} from "@xterm/xterm";
import {Actions, GlobalConfig} from "../types/config.ts";
import {isMacOS} from "./utils.ts";

export function loadBindings(term: Terminal, config: GlobalConfig, onAction: (action: Actions) => void) {
    const bindings = config.bindings ?? [];

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
