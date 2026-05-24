import Term from "./components/Term.tsx";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {TerminalProfile} from "./types/terminal.ts";
import {useGlobalConfig} from "./hooks/config.tsx";
import {useI18n} from "./hooks/i18n.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import {getCurrentWindow} from "@tauri-apps/api/window";
import TitleBar from "./components/TitleBar.tsx";
import TabBar from "./components/TabBar.tsx";
import {ITheme} from "@xterm/xterm";
import {parseProfileTheme} from "./lib/term.ts";
import {invoke} from "@tauri-apps/api/core";
import CommandPalette, {CommandAction} from "./components/CommandPalette.tsx";
import {isMacOS} from "./lib/utils.ts";
import {isColorDark} from "./hooks/surfaceColors.ts";
import {bindingToShortcut, findBinding, parseBindings} from "./lib/bindings.ts";
import {X, PanelLeftClose, PanelLeftOpen, Terminal as TerminalIcon, Monitor, MonitorOff, Settings as SettingsIcon} from "lucide-react";
import SettingsPage from "./pages/SettingsPage.tsx";
import {SETTINGS_TAB_ID} from "./constants.ts";

function App() {
    const {config, updateConfig} = useGlobalConfig();
    const t = useI18n();
    const [ids, setIds] = useState<string[]>([]);
    const [terminals, setTerminals] = useState<Record<string, TerminalProfile>>({});
    const [currentId, setCurrentId] = useState<string | null>(null);
    const currentProfile = useMemo(() => {
        if (currentId) {
            return terminals[currentId] ?? null;
        } else {
            return null;
        }
    }, [currentId, terminals]);
    const [currentTheme, setCurrentTheme] = useState<ITheme | null>(null);
    const tabBarVisible = config.showTabBar ?? false;
    const parsedBindings = useMemo(() => parseBindings(config.bindings), [config.bindings]);
    const isInitialized = useRef<boolean>(false);
    const closeOnLastTabRef = useRef(config.closeWindowOnLastTab);
    closeOnLastTabRef.current = config.closeWindowOnLastTab;
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    const newTerminal = (profile: TerminalProfile) => {
        const id = crypto.randomUUID();
        setTerminals((prevState) => {
            let newState = {...prevState};
            newState[id] = profile;
            return newState;
        });
        setIds((prevState) => [...prevState, id]);
        setCurrentId(id);
        console.log("New Terminal Profile", profile.name, id);
    };

    const closeTerminal = (id: string) => {
        console.log("[DEBUG] closeTerminal called for", id);

        // Settings tab: no PTY process, just remove from list
        if (id === SETTINGS_TAB_ID) {
            const newIds = ids.filter((i) => i !== id);
            let newCurrentId = currentId;
            if (currentId === id) {
                if (newIds.length > 0) {
                    newCurrentId = newIds[newIds.length - 1];
                } else if (closeOnLastTabRef.current !== false) {
                    getCurrentWindow().close().then();
                    return;
                }
            }
            setIds(newIds);
            setCurrentId(newCurrentId);
            return;
        }
        // Kill the PTY process on the backend
        invoke("kill_terminal", {id}).catch((e) =>
            console.error("Failed to kill terminal:", e)
        );

        // Compute new ID list
        const newIds = ids.filter((i) => i !== id);

        // Determine which tab should become active
        let newCurrentId = currentId;
        if (currentId === id) {
            if (newIds.length > 0) {
                const idx = ids.indexOf(id);
                newCurrentId = newIds[Math.min(idx, newIds.length - 1)];
            } else if (closeOnLastTabRef.current !== false) {
                // No tabs left, close the window (default behavior)
                console.log("[DEBUG] No tabs left, closing window");
                getCurrentWindow().close().then();
                return;
            }
            // If closeWindowOnLastTab is false, fall through to clear state
        }

        setTerminals((prevState) => {
            const newState = {...prevState};
            delete newState[id];
            return newState;
        });
        setIds(newIds);
        setCurrentId(newCurrentId);
        console.log("[DEBUG] closeTerminal done, newIds:", newIds, "newCurrentId:", newCurrentId);
    };

    const switchTab = (id: string) => {
        setCurrentId(id);
    };

    const openSettings = useCallback(() => {
        if (ids.includes(SETTINGS_TAB_ID)) {
            setCurrentId(SETTINGS_TAB_ID);
            return;
        }
        setIds((prevState) => [...prevState, SETTINGS_TAB_ID]);
        setCurrentId(SETTINGS_TAB_ID);
    }, [ids]);

    useEffect(() => {
        if (isInitialized.current) return;
        if (config.profiles.length && ids.length === 0) {
            isInitialized.current = true;
            getCurrentWindow().setResizable(true).then();
            newTerminal(config.profiles[0]);
        }
    }, [config]);

    useEffect(() => {
        if (currentProfile) {
            parseProfileTheme(currentProfile).then((theme) => {
                setCurrentTheme(theme);
            });
        }
    }, [currentProfile]);

    // Sync HeroUI theme class with terminal theme
    useEffect(() => {
        const bg = currentTheme?.background;
        if (!bg) return;
        const dark = isColorDark(bg);
        const root = document.documentElement;
        root.classList.toggle("dark", dark);
        root.classList.toggle("light", !dark);
        root.setAttribute("data-theme", dark ? "dark" : "light");
    }, [currentTheme?.background]);

    // Handle keyboard bindings when settings page is active (no xterm to dispatch)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (currentId !== SETTINGS_TAB_ID) return;

            for (const binding of parsedBindings) {
                const eventKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                const bindingKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
                if (eventKey !== bindingKey) continue;

                let allMatch = true;
                for (const w of binding.with) {
                    switch (w) {
                        case "ctrl": allMatch = allMatch && e.ctrlKey; break;
                        case "shift": allMatch = allMatch && e.shiftKey; break;
                        case "alt": allMatch = allMatch && e.altKey; break;
                        case "command": allMatch = allMatch && e.metaKey; break;
                        case "CtrlOrCommand": allMatch = allMatch && (isMacOS() ? e.metaKey : e.ctrlKey); break;
                    }
                    if (!allMatch) break;
                }

                if (allMatch) {
                    e.preventDefault();
                    e.stopPropagation();
                    switch (binding.action) {
                        case "closeTab":
                            closeTerminal(SETTINGS_TAB_ID);
                            break;
                        case "newTab":
                            newTerminal(config.profiles[0]);
                            break;
                        case "openSettings":
                            openSettings();
                            break;
                        case "openCommandPalette":
                            setIsCommandPaletteOpen(true);
                            break;
                    }
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [currentId, parsedBindings, config.profiles]);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            for (const binding of parsedBindings) {
                // Case-insensitive key match for letter keys
                const eventKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                const bindingKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
                if (eventKey !== bindingKey) continue;

                // Check all modifiers
                let allMatch = true;
                for (const w of binding.with) {
                    switch (w) {
                        case "ctrl":
                            allMatch = allMatch && e.ctrlKey;
                            break;
                        case "shift":
                            allMatch = allMatch && e.shiftKey;
                            break;
                        case "alt":
                            allMatch = allMatch && e.altKey;
                            break;
                        case "command":
                            allMatch = allMatch && e.metaKey;
                            break;
                        case "CtrlOrCommand":
                            allMatch = allMatch && (isMacOS() ? e.metaKey : e.ctrlKey);
                            break;
                    }
                    if (!allMatch) break;
                }

                if (allMatch) {
                    e.preventDefault();
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [parsedBindings]);

    // Build command palette actions
    const commandActions: CommandAction[] = useMemo(() => {
        const actions: CommandAction[] = [];
        if (!config.profiles.length) return actions;

        // New terminal with each profile
        const newLabel = t["New {name}"];
        const newDesc = t['Create a new terminal with profile "{name}"'];
        for (const profile of config.profiles) {
            const isDefault = profile === config.profiles[0];
            const profileArgs = isDefault ? undefined : { profileName: profile.name };
            const profileBinding = findBinding(parsedBindings, "newTab", profileArgs);
            actions.push({
                id: `new-terminal-${profile.name}`,
                label: newLabel.replace("{name}", profile.name),
                description: newDesc.replace("{name}", profile.name),
                icon: <TerminalIcon size={18} />,
                shortcut: profileBinding ? bindingToShortcut(profileBinding) : undefined,
                category: t["Terminal"],
                keywords: ["new", "terminal", "新建", profile.name],
                onSelect: () => newTerminal(profile),
            });
        }

        // Close current tab
        if (currentId) {
            const closeBinding = findBinding(parsedBindings, "closeTab");
            actions.push({
                id: "close-tab",
                label: t["Close Current Tab"],
                description: t["Close the current terminal tab"],
                icon: <X size={18} />,
                shortcut: closeBinding ? bindingToShortcut(closeBinding) : undefined,
                category: t["Terminal"],
                keywords: ["close", "关闭", "tab", "kill"],
                onSelect: () => closeTerminal(currentId),
            });
        }

        // Toggle tab bar
        actions.push({
            id: "toggle-tab-bar",
            label: tabBarVisible ? t["Hide Tab Bar"] : t["Show Tab Bar"],
            description: tabBarVisible
                ? t["Hide the sidebar tab bar"]
                : t["Show the sidebar tab bar"],
            icon: tabBarVisible ? (
                <PanelLeftClose size={18} />
            ) : (
                <PanelLeftOpen size={18} />
            ),
            category: t["View"],
            keywords: ["tab bar", "标签栏", "sidebar", "toggle", "hide", "show", "隐藏", "显示"],
            onSelect: () => updateConfig({ showTabBar: !tabBarVisible }),
        });

        // Toggle close window on last tab
        const closeOnLast = config.closeWindowOnLastTab !== false;
        actions.push({
            id: "toggle-close-window-last-tab",
            label: closeOnLast ? t["Keep Window on Last Tab Closed"] : t["Close Window on Last Tab Closed"],
            description: closeOnLast
                ? t["Keep the window open after closing the last tab"]
                : t["Close the window after closing the last tab"],
            icon: closeOnLast ? (
                <MonitorOff size={18} />
            ) : (
                <Monitor size={18} />
            ),
            category: t["View"],
            keywords: ["window", "窗口", "close", "关闭", "last", "最后", "tab", "exit"],
            onSelect: () => updateConfig({ closeWindowOnLastTab: !closeOnLast }),
        });

        // Open settings
        const settingsBinding = findBinding(parsedBindings, "openSettings");
        actions.push({
            id: "open-settings",
            label: t["Settings"],
            description: t["Open Settings"],
            icon: <SettingsIcon size={18} />,
            shortcut: settingsBinding ? bindingToShortcut(settingsBinding) : undefined,
            category: t["Settings"],
            keywords: ["settings", "设置", "config", "配置", "preferences", "options"],
            onSelect: () => {
                openSettings();
            },
        });

        return actions;
    }, [config.profiles, currentId, tabBarVisible, config.closeWindowOnLastTab, parsedBindings, t, openSettings]);

    // Close command palette when Escape is pressed while it's open
    const handleCommandPaletteOpenChange = useCallback((open: boolean) => {
        setIsCommandPaletteOpen(open);
    }, []);

    if (config.profiles.length) {
        const tabs = ids
            .map((id) => {
                if (id === SETTINGS_TAB_ID) {
                    return { id, name: t["Settings"] };
                }
                if (id in terminals) {
                    return { id, name: terminals[id].name };
                }
                return null;
            })
            .filter(Boolean) as { id: string; name: string }[];

        return (
            <div
                className="w-screen h-screen overflow-hidden flex flex-row"
                style={{background: currentTheme?.background ?? "black"}}
            >
                <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onOpenChange={handleCommandPaletteOpenChange}
                    actions={commandActions}
                />
                <TabBar
                    tabs={tabs}
                    activeId={currentId}
                    onSelect={switchTab}
                    onClose={closeTerminal}
                    onNew={() => newTerminal(config.profiles[0])}
                    backgroundColor={currentTheme?.background ?? "#000000"}
                    foregroundColor={currentTheme?.foreground ?? "#ffffff"}
                    collapsed={!tabBarVisible}
                />
                <div className="flex-1 flex flex-col min-w-0">
                    <TitleBar
                        theme={currentTheme}
                        tabBarVisible={tabBarVisible}
                        onToggleTabBar={() => updateConfig({ showTabBar: !tabBarVisible })}
                        onOpenSettings={openSettings}
                    />
                    <div className="flex-1 relative overflow-hidden">
                        {currentId === SETTINGS_TAB_ID && (
                            <div
                                className="absolute inset-0"
                                style={{ zIndex: 1 }}
                            >
                                <SettingsPage theme={currentTheme} />
                            </div>
                        )}
                        {ids.filter((id) => id in terminals).map((id) => (
                            <div
                                key={id}
                                className="absolute inset-0"
                                style={{
                                    zIndex: id === currentId ? 1 : 0,
                                    pointerEvents: id === currentId ? "auto" : "none",
                                    opacity: id === currentId ? 1 : 0,
                                }}
                            >
                                <Term
                                    id={id}
                                    profile={terminals[id]}
                                    isActive={id === currentId}
                                    onClose={() => closeTerminal(id)}
                                    onNewTab={(profileName?: string) => {
                                        if (profileName) {
                                            const profile = config.profiles.find(p => p.name === profileName);
                                            if (profile) {
                                                newTerminal(profile);
                                            } else {
                                                newTerminal(config.profiles[0]);
                                            }
                                        } else {
                                            newTerminal(config.profiles[0]);
                                        }
                                    }}
                                    onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                                    onOpenSettings={openSettings}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <WelcomePage/>
        );
    }
}

export default App;
