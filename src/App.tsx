import Term from "./components/Term.tsx";
import {useEffect, useMemo, useRef, useState} from "react";
import {TerminalProfile} from "./types/terminal.ts";
import {useGlobalConfig} from "./hooks/config.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import {getCurrentWindow} from "@tauri-apps/api/window";
import TitleBar from "./components/TitleBar.tsx";
import TabBar from "./components/TabBar.tsx";
import {ITheme} from "@xterm/xterm";
import {parseProfileTheme} from "./lib/term.ts";
import {invoke} from "@tauri-apps/api/core";

function App() {
    const {config, updateConfig} = useGlobalConfig();
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
    const isInitialized = useRef<boolean>(false);

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
            } else {
                // No tabs left, close the window
                getCurrentWindow().close().then();
                return;
            }
        }

        setTerminals((prevState) => {
            const newState = {...prevState};
            delete newState[id];
            return newState;
        });
        setIds(newIds);
        setCurrentId(newCurrentId);
    };

    const switchTab = (id: string) => {
        setCurrentId(id);
    };

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

    if (config.profiles.length) {
        const tabs = ids
            .filter((id) => id in terminals)
            .map((id) => ({id, name: terminals[id].name}));

        return (
            <div
                className="w-screen h-screen overflow-hidden flex flex-row"
                style={{background: currentTheme?.background ?? "black"}}
            >
                <TabBar
                    tabs={tabs}
                    activeId={currentId}
                    onSelect={switchTab}
                    onClose={closeTerminal}
                    onNew={() => newTerminal(config.profiles[0])}
                    backgroundColor={currentTheme?.background ?? "#000000"}
                    foregroundColor={currentTheme?.foreground ?? "#ffffff"}
                    profileName={currentProfile?.name ?? "Lumina"}
                    collapsed={!tabBarVisible}
                />
                <div className="flex-1 flex flex-col min-w-0">
                    <TitleBar
                        theme={currentTheme}
                        tabBarVisible={tabBarVisible}
                        onToggleTabBar={() => updateConfig({ showTabBar: !tabBarVisible })}
                    />
                    <div className="flex-1 relative overflow-hidden">
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
                                    onClose={() => closeTerminal(id)}
                                    onNewTab={() => newTerminal(config.profiles[0])}
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
