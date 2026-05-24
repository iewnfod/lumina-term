import {Terminal} from "@xterm/xterm";
import {Actions, Binding} from "../types/config.ts";
import {DEFAULT_BINDINGS} from "../constants.ts";
import {isMacOS} from "./utils.ts";
import {debug} from "@tauri-apps/plugin-log";
import {useEffect} from "react";

function actionSignature(b: Binding): string {
    const args = b.args
        ? JSON.stringify(Object.keys(b.args).sort().map((k) => [k, b.args![k]]))
        : "";
    return `${b.action}|${args}`;
}

export function parseBindings(configBindings?: Binding[]): Binding[] {
    if (!configBindings?.length) return [...DEFAULT_BINDINGS];

    const merged = [...configBindings];
    const seen = new Set(configBindings.map(actionSignature));

    for (const def of DEFAULT_BINDINGS) {
        if (!seen.has(actionSignature(def))) {
            merged.push(def);
        }
    }

    return merged;
}

export function bindingToShortcut(
    b: Binding,
): { abbr?: string; content: string }[] {
    const shortcut: { abbr?: string; content: string }[] = [];
    for (const w of b.with) {
        switch (w) {
            case "ctrl":
                shortcut.push({ abbr: "ctrl", content: "Ctrl" });
                break;
            case "shift":
                shortcut.push({ content: "Shift" });
                break;
            case "alt":
                shortcut.push({ abbr: "alt", content: "Alt" });
                break;
            case "command":
                shortcut.push({ abbr: "cmd", content: "Cmd" });
                break;
            case "CtrlOrCommand":
                shortcut.push({
                    abbr: isMacOS() ? "cmd" : "ctrl",
                    content: isMacOS() ? "Cmd" : "Ctrl",
                });
                break;
        }
    }
    shortcut.push({ content: b.key.length === 1 ? b.key.toUpperCase() : b.key });
    return shortcut;
}

export function findBinding(
    bindings: Binding[],
    action: Actions,
    args?: Record<string, string>,
): Binding | undefined {
    return bindings.find((b) => {
        if (b.action !== action) return false;
        const bKeys = b.args ? Object.keys(b.args) : [];
        const aKeys = args ? Object.keys(args) : [];
        if (bKeys.length !== aKeys.length) return false;
        return aKeys.every((k) => b.args![k] === args![k]);
    });
}
function keySignature(key: string, withKeys: string[]): string {
    return `${key}|${[...withKeys].sort().join(",")}`;
}

export function loadBindings(
    term: Terminal,
    bindings: Binding[],
    onAction: (action: Actions, args?: Record<string, string>) => void,
) {
    const held = new Set<string>();

    term.attachCustomKeyEventHandler((event) => {
        if (event.type === "keyup") {
            for (const binding of bindings) {
                if (binding.key === event.key) {
                    held.delete(keySignature(binding.key, binding.with));
                }
            }
            return true;
        }

        if (event.type !== "keydown") return true;

        debug(`XTerm Custom Key with key ${event.key} and type ${event.type}`);

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
                    const sig = keySignature(binding.key, binding.with);
                    if (held.has(sig)) return false;
                    held.add(sig);
                    onAction(binding.action, binding.args);
                    return false;
                }
            }
        }
        return true;
    });
}

function checkModifiers(e: KeyboardEvent | { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }, withKeys: string[]): boolean {
    for (const w of withKeys) {
        switch (w) {
            case "ctrl":
                if (!e.ctrlKey) return false;
                break;
            case "shift":
                if (!e.shiftKey) return false;
                break;
            case "alt":
                if (!e.altKey) return false;
                break;
            case "command":
                if (!e.metaKey) return false;
                break;
            case "CtrlOrCommand":
                if (isMacOS() ? !e.metaKey : !e.ctrlKey) return false;
                break;
        }
    }
    return true;
}

export function matchBinding(e: KeyboardEvent, bindings: Binding[]): Binding | null {
    const eventKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    for (const binding of bindings) {
        const bindingKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
        if (eventKey !== bindingKey) continue;
        if (checkModifiers(e, binding.with)) {
            return binding;
        }
    }
    return null;
}

export function useKeyboardBindings(
    bindings: Binding[],
    onAction: (action: Actions, args?: Record<string, string>) => void,
    enabled: boolean,
) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const matched = matchBinding(e, bindings);
            if (matched) {
                e.preventDefault();
                e.stopPropagation();
                onAction(matched.action, matched.args);
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [bindings, onAction, enabled]);
}
