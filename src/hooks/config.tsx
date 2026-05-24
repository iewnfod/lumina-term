import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {GlobalConfig} from "../types/config.ts";
import {LazyStore} from "@tauri-apps/plugin-store";
import {TerminalProfile} from "../types/terminal.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {CONFIG_SAVE_PATH, DEFAULT_CONFIG} from "../constants.ts";
import {isMacOS} from "../lib/utils.ts";
import { info, debug } from "@tauri-apps/plugin-log";

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
            info("Loading config...");
            const savedConfig = await store.get<GlobalConfig>("config");
            let loadedConfig = DEFAULT_CONFIG;
            if (savedConfig) {
                loadedConfig = { ...loadedConfig, ...savedConfig };
            }
            setConfig(loadedConfig);
            store.set("config", loadedConfig).then();
            info(`Config loaded: language=${loadedConfig.language}, profiles=${loadedConfig.profiles.length}`);
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
        debug(`updateConfig: ${JSON.stringify(newConfig)}`);
        setConfig((prevState) => {
            const updated: GlobalConfig = {...prevState, ...newConfig};
            saveConfig(updated);
            return updated;
        });
    };

    const newProfile = (profile: TerminalProfile) => {
        setConfig((prevState) => {
            const isFirst = prevState.profiles.length === 0 && !profile.default;
            const updatedProfile = isFirst ? { ...profile, default: true } : profile;
            const updatedProfiles = [...prevState.profiles, updatedProfile];
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
                info("Window shown, config loaded");
            });
        }
    }, [isLoading]);

    useEffect(() => {
        if (!isMacOS()) {
            const window = getCurrentWindow();
            window.setDecorations(false).then();
        }
    }, []);

    return (
        <GlobalConfigContext.Provider value={{config, updateConfig, newProfile, isLoading}}>
            {children}
        </GlobalConfigContext.Provider>
    );
}
