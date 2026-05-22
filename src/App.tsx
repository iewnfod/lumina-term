import Term from "./components/Term.tsx";
import {useEffect, useMemo, useRef, useState} from "react";
import {TerminalProfile} from "./types/terminal.ts";
import {useGlobalConfig} from "./hooks/config.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import {getCurrentWindow} from "@tauri-apps/api/window";
import TitleBar from "./components/TitleBar.tsx";
import {ITheme} from "@xterm/xterm";
import {parseProfileTheme} from "./lib/term.ts";

function App() {
    const {config} = useGlobalConfig();
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
        return (
            <div className="w-screen h-screen overflow-hidden" style={{background: currentTheme?.background ?? "black"}}>
                <div className="flex flex-col items-center justify-between w-full h-full pb-1">
                    <TitleBar profile={currentProfile} theme={currentTheme}/>
                    {ids.map((id) => (
                        <Term
                            id={id}
                            profile={terminals[id]}
                            key={id}
                        />
                    ))}
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
