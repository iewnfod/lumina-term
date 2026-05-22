import {TerminalProfile} from "../types/terminal.ts";
import Icon from "../assets/icon.svg";
import {LucideMaximize, LucideMinimize, LucideMinus, LucideX} from "lucide-react";
import {Button} from "@heroui/react";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {useEffect, useState} from "react";
import {ITheme} from "@xterm/xterm";
import {isMacOS} from "../lib/utils.ts";

function WindowControl() {
    const [isMaximized, setIsMaximized] = useState(false);

    const handleMinimize = () => {
        getCurrentWindow().minimize().then();
    }

    const handleMaximize = () => {
        getCurrentWindow().maximize().then(() => {
            getIsMaximized();
        });
    }

    const handleUnmaximize = () => {
        getCurrentWindow().unmaximize().then(() => {
            getIsMaximized();
        });
    }

    const handleClose = () => {
        getCurrentWindow().close().then();
    }

    const getIsMaximized = () => {
        getCurrentWindow().isMaximized().then((m) => {
            setIsMaximized(m);
        });
    }

    useEffect(() => {
        getIsMaximized();
        const handleResize = () => {
            getIsMaximized();
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <div className="flex flex-row justify-end items-center">
            <Button isIconOnly variant="ghost" onClick={handleMinimize} size="sm" className="rounded-lg">
                <LucideMinus size={20}/>
            </Button>
            {
                isMaximized ? (
                    <Button isIconOnly variant="ghost" onClick={handleUnmaximize} size="sm" className="rounded-lg">
                        <LucideMinimize size={20}/>
                    </Button>
                ) : (
                    <Button isIconOnly variant="ghost" onClick={handleMaximize} size="sm" className="rounded-lg">
                        <LucideMaximize size={20}/>
                    </Button>
                )
            }
            <Button isIconOnly variant="ghost" onClick={handleClose} size="sm" className="rounded-lg">
                <LucideX size={20} className="text-red-500"/>
            </Button>
        </div>
    );
}

export default function TitleBar({
    profile,
    theme
} : {
    profile: TerminalProfile | null,
    theme: ITheme | null,
}) {
    return (
        <div
            data-tauri-drag-region
            className="w-full h-8 flex flex-row items-center justify-between select-none"
            style={{
                background: theme?.background ?? "black",
            }}
        >
            <div
                data-tauri-drag-region
                className={`w-full h-full grow flex flex-col justify-center ${isMacOS() ? "items-center" : "items-start"} pl-2`}
                style={{
                    color: theme?.foreground ?? "white",
                }}
            >
                <div className="flex flex-row justify-items-center gap-1">
                    {!isMacOS() && (
                        <img
                            src={Icon}
                            alt=""
                            className="h-6 w-6 pointer-events-none"
                        />
                    )}
                    <h1 className="leading-tight translate-y-0.5">{profile?.name ?? "Lumina"}</h1>
                </div>
            </div>
            {!isMacOS() && (
                <div className="" style={{color: theme?.foreground ?? "white"}}>
                    <WindowControl/>
                </div>
            )}
        </div>
    );
}
