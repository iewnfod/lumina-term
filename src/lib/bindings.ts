import {Terminal} from "@xterm/xterm";
import {Actions, GlobalConfig} from "../types/config.ts";
import {platform} from "@tauri-apps/plugin-os";

export function loadBindings(term: Terminal, config: GlobalConfig, onAction: (action: Actions) => void) {
    const bindings = config.bindings ?? [];
    const os = platform();

    term.attachCustomKeyEventHandler((event) => {
        for (const binding of bindings) {
            if (binding.key === event.key) {
                let flag = true;
                for (const w of binding.with) {
                    switch (w) {
                        case "ctrl":
                            flag = event.ctrlKey;
                            break;
                        case "shift":
                            flag = event.shiftKey;
                            break;
                        case "alt":
                            flag = event.altKey;
                            break;
                        case "command":
                            flag = event.metaKey;
                            break;
                        case "CtrlOrCommand":
                            if (os == "macos" || os == "ios") {
                                flag = event.metaKey;
                            } else {
                                flag = event.ctrlKey;
                            }
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
