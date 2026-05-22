import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {GlobalConfig} from "../types/config.ts";
import {LazyStore} from "@tauri-apps/plugin-store";
import {TerminalProfile} from "../types/terminal.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {CONFIG_SAVE_PATH, DEFAULT_CONFIG} from "../constants.ts";
import {isMacOS} from "../lib/utils.ts";

const store = new LazyStore(CONFIG_SAVE_PATH);

interface GlobalConfigContextType {
    config: GlobalConfig;
    updateConfig: (newConfig: Partial<GlobalConfig>) => void;
    newProfile: (profile: TerminalProfile) => void;
    isLoading: boolean;
}

export const GlobalConfigContext = createContext<GlobalConfigContextType | null>(null);

export function useGlobalConfig() {
    const context = useContext(GlobalConfigContext);
    if (!context) {
        throw new Error("useGlobalConfig must be used within a GlobalConfigProvider");
    }
    return context;
}

export function GlobalConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await store.get<GlobalConfig>("config");
            let loadedConfig = DEFAULT_CONFIG;
            if (savedConfig) {
                loadedConfig = { ...loadedConfig, ...savedConfig };
            }
            setConfig(loadedConfig);
            store.set("config", loadedConfig).then();
            setIsLoading(false);
        };
        loadConfig().then();
    }, []);

    const saveConfig = (newConfig: GlobalConfig) => {
        store.set("config", newConfig).then(() => {
            store.save().then();
        });
    };

    const updateConfig = (newConfig: Partial<GlobalConfig>) => {
        console.log("updateConfig", newConfig);
        setConfig((prevState) => {
            const updated: GlobalConfig = {...prevState, ...newConfig};
            saveConfig(updated);
            return updated;
        });
    };

    const newProfile = (profile: TerminalProfile) => {
        setConfig((prevState) => {
            const updatedProfiles = [...prevState.profiles, profile];
            const updated: GlobalConfig = {...prevState, profiles: updatedProfiles};
            saveConfig(updated);
            return updated;
        });
    };

    useEffect(() => {
        if (!isLoading) {
            const window = getCurrentWindow();
            window.show().then(() => {
                window.setFocus().then();
                console.log("Data loaded");
            });
        }
    }, [isLoading]);

    useEffect(() => {
        if (isMacOS()) {
            const window = getCurrentWindow();
            window.setDecorations(true).then();
            window.setTitleBarStyle("overlay").then();
        }
    }, []);

    return (
        <GlobalConfigContext.Provider value={{config, updateConfig, newProfile, isLoading}}>
            {children}
        </GlobalConfigContext.Provider>
    );
}
