import {useI18n} from "../../hooks/i18n.tsx";
import {useEffect, useState} from "react";
import {getConfigFilePath, openConfigFile} from "../../lib/utils.ts";
import {invoke} from "@tauri-apps/api/core";
import {Button, Label} from "@heroui/react";
import {Bug, FolderOpen} from "lucide-react";
import {openPath} from "@tauri-apps/plugin-opener";
import {debug} from "@tauri-apps/plugin-log";

export default function DeveloperSettings() {
    const t = useI18n();
    const [configPath, setConfigPath] = useState("");
    const [logDir, setLogDir] = useState("");
    const [isDebug, setIsDebug] = useState(false);

    useEffect(() => {
        getConfigFilePath().then(setConfigPath).catch(() => setConfigPath(""));
        invoke<string>("get_log_dir").then(setLogDir).catch(() => setLogDir(""));
        invoke<boolean>("is_debug").then(setIsDebug).catch(() => setIsDebug(false));
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pb-4 px-1">
                <h2 className="text-lg font-semibold mb-6">{t["Developer"]}</h2>

                <div className="flex flex-col gap-5">
                    {/* Config File Path */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["Config File Path"]}</Label>
                            <p className="text-xs text-muted truncate flex-1" title={configPath}>
                                {configPath || "—"}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onPress={() => openConfigFile().catch(console.error)}
                        >
                            <FolderOpen size={15} />
                            {t["Open"]}
                        </Button>
                    </div>

                    {/* Log Directory */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["Log Directory"]}</Label>
                            <p className="text-xs text-muted truncate flex-1" title={logDir}>
                                {logDir || "—"}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onPress={() => {
                                if (logDir) {
                                    openPath(logDir).catch(() => {
                                        debug(`Failed to open log directory: ${logDir}`);
                                    });
                                }
                            }}
                        >
                            <FolderOpen size={15} />
                            {t["Open"]}
                        </Button>
                    </div>

                    {/* DevTools */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["DevTools"]}</Label>
                            <p className="text-xs text-muted">
                                Open the webview developer tools
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            isDisabled={!isDebug}
                            onPress={() => invoke("open_devtools").catch(() => {
                                console.log("DevTools command not available, use Ctrl+Shift+I");
                            })}
                        >
                            <Bug size={15} />
                            {t["Open"]}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
