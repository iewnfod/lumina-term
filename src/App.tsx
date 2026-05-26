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
import {isColorDark} from "./hooks/surfaceColors.ts";
import {bindingToShortcut, findBinding, parseBindings, useKeyboardBindings, matchBinding} from "./lib/bindings.ts";
import {Actions} from "./types/config.ts";
import {X, PanelLeftClose, PanelLeftOpen, Terminal as TerminalIcon, Monitor, MonitorOff, Settings as SettingsIcon, Info} from "lucide-react";
import SettingsPage from "./pages/SettingsPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import {SETTINGS_TAB_ID, ABOUT_TAB_ID} from "./constants.ts";
import { info, debug, error } from "@tauri-apps/plugin-log";
import {isLinux} from "./lib/utils.ts";
import {usePaddingOffset} from "./hooks/paddingOffset.ts";
import {getMaximized} from "./hooks/maximized.ts";

function InnerApp() {
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
    const defaultProfile = useMemo(() => {
        return config.profiles.find(p => p.default) || config.profiles[0];
    }, [config.profiles]);
    const isInitialized = useRef<boolean>(false);
    const closeOnLastTabRef = useRef(config.closeWindowOnLastTab);
    closeOnLastTabRef.current = config.closeWindowOnLastTab;

    // Refs to avoid stale closures in closeTerminal (called from term-exit listeners)
    const idsRef = useRef(ids);
    idsRef.current = ids;
    const currentIdRef = useRef(currentId);
    currentIdRef.current = currentId;
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
        info(`New terminal: profile=${profile.name} id=${id}`);
    };

    const closeTerminal = (id: string) => {
        debug(`closeTerminal called for id=${id}`);
        const currentIds = idsRef.current;
        const currentActiveId = currentIdRef.current;

        // Settings tab: no PTY process, just remove from list
        if (id === SETTINGS_TAB_ID || id === ABOUT_TAB_ID) {
            info("Closing settings/about tab");
            const newIds = currentIds.filter((i) => i !== id);
            let newCurrentId = currentActiveId;
            if (currentActiveId === id) {
                if (newIds.length > 0) {
                    newCurrentId = newIds[newIds.length - 1];
                } else if (closeOnLastTabRef.current !== false) {
                    info("No tabs left, closing window");
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
            error(`Failed to kill terminal: ${e}`)
        );

        // Compute new ID list
        const newIds = currentIds.filter((i) => i !== id);

        // Determine which tab should become active
        let newCurrentId = currentActiveId;
        if (currentActiveId === id) {
            if (newIds.length > 0) {
                const idx = currentIds.indexOf(id);
                newCurrentId = newIds[Math.min(idx, newIds.length - 1)];
            } else if (closeOnLastTabRef.current !== false) {
                // No tabs left, close the window (default behavior)
                info("No tabs left after close, closing window");
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
        info(`Terminal closed: id=${id}, remaining=${newIds.length}`);
    };

    const switchTab = (id: string) => {
        debug(`Switch tab to ${id}`);
        setCurrentId(id);
    };

    const toTab = useCallback((index: number) => {
        if (ids.length === 0) return;
        const idx = index < 0 ? ids.length - 1 : Math.min(index, ids.length - 1);
        setCurrentId(ids[idx]);
    }, [ids]);

    const openSettings = useCallback(() => {
        info("Opening settings");
        if (ids.includes(SETTINGS_TAB_ID)) {
            setCurrentId(SETTINGS_TAB_ID);
            return;
        }
        setIds((prevState) => [...prevState, SETTINGS_TAB_ID]);
        setCurrentId(SETTINGS_TAB_ID);
    }, [ids]);

    const openAbout = useCallback(() => {
        info("Opening about");
        if (ids.includes(ABOUT_TAB_ID)) {
            setCurrentId(ABOUT_TAB_ID);
            return;
        }
        setIds((prevState) => [...prevState, ABOUT_TAB_ID]);
        setCurrentId(ABOUT_TAB_ID);
    }, [ids]);

    useEffect(() => {
        if (isInitialized.current) return;
        if (config.profiles.length && ids.length === 0) {
            isInitialized.current = true;
            getCurrentWindow().setResizable(true).then();
            newTerminal(defaultProfile);
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

    // Keyboard bindings for non-terminal tabs (Settings, About, etc.)
    const isNonTerminalTab = currentId === SETTINGS_TAB_ID || currentId === ABOUT_TAB_ID;
    const handleNonTerminalAction = useCallback((action: Actions, args?: Record<string, string>) => {
        info(`Keybinding action from non-terminal tab: ${action}`);
        switch (action) {
            case "closeTab":
                if (currentId) closeTerminal(currentId);
                break;
            case "newTab": {
                const profileName = args?.profileName;
                if (profileName) {
                    const profile = config.profiles.find(p => p.name === profileName);
                    if (profile) {
                        newTerminal(profile);
                        break;
                    }
                }
                newTerminal(defaultProfile);
                break;
            }
            case "openSettings":
                openSettings();
                break;
            case "openCommandPalette":
                setIsCommandPaletteOpen(true);
                break;
            case "toTab":
                if (args?.index !== undefined) {
                    const idx = args.index === "last" ? -1 : parseInt(args.index, 10);
                    if (!isNaN(idx)) toTab(idx);
                }
                break;
        }
    }, [currentId, config.profiles, openSettings, toTab]);
    useKeyboardBindings(parsedBindings, handleNonTerminalAction, isNonTerminalTab);

    // Global: prevent browser defaults for configured shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (matchBinding(e, parsedBindings)) {
                e.preventDefault();
            }
            // Prevent Ctrl+Shift+C from opening DevTools "Inspect Element"
            if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "c") {
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [parsedBindings]);

    // Build command palette actions
    const commandActions: CommandAction[] = useMemo(() => {
        const actions: CommandAction[] = [];
        if (!config.profiles.length) return actions;

        // New terminal with each profile
        const newLabel = t["New {name}"];
        const newDesc = t['Create a new terminal with profile "{name}"'];
        for (const profile of config.profiles) {
            const isDefault = profile.default;
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

        // Open about
        actions.push({
            id: "open-about",
            label: t["About"],
            description: t["About"],
            icon: <Info size={18} />,
            category: t["Settings"],
            keywords: ["about", "关于", "info", "version", "版本"],
            onSelect: () => {
                openAbout();
            },
        });

        return actions;
    }, [config.profiles, currentId, tabBarVisible, config.closeWindowOnLastTab, parsedBindings, t, openSettings, openAbout]);

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
                if (id === ABOUT_TAB_ID) {
                    return { id, name: t["About"] };
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
                    onNew={() => newTerminal(defaultProfile)}
                    backgroundColor={currentTheme?.background ?? "#000000"}
                    foregroundColor={currentTheme?.foreground ?? "#ffffff"}
                    collapsed={!tabBarVisible}
                    defaultProfileName={defaultProfile?.name}
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
                        {currentId === ABOUT_TAB_ID && (
                            <div
                                className="absolute inset-0"
                                style={{ zIndex: 1 }}
                            >
                                <AboutPage theme={currentTheme} />
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
                                                newTerminal(defaultProfile);
                                            }
                                        } else {
                                            newTerminal(defaultProfile);
                                        }
                                    }}
                                    onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                                    onOpenSettings={openSettings}
                                    onToTab={toTab}
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

function App() {
    const isMaximized = getMaximized();
    const paddingOffset = usePaddingOffset();

    return (
        <div
            className="w-screen h-screen overflow-hidden"
            style={{
                padding: paddingOffset,
                background: "transparent",
            }}
        >
            <div
                className={`w-full h-full overflow-hidden ${isMaximized ? "" : "rounded-lg"}`}
                style={{
                    boxShadow: isLinux() ? "0 5px 15px rgba(0, 0, 0, 0.3), 0 1px 5px rgba(0, 0, 0, 0.2)" : undefined,
                }}
            >
                <InnerApp/>
            </div>
        </div>
    );
}

export default App;
