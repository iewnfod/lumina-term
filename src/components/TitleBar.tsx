import {LucideMaximize, LucideMinimize, LucideMinus, LucideX, PanelLeftClose, PanelLeftOpen, Settings} from "lucide-react";
import {Button} from "@heroui/react";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {useEffect, useState} from "react";
import {ITheme} from "@xterm/xterm";
import {isMacOS} from "../lib/utils.ts";
import {useSurfaceColors} from "../hooks/surfaceColors.ts";

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
    theme,
    tabBarVisible,
    onToggleTabBar,
    onOpenSettings,
} : {
    theme: ITheme | null,
    tabBarVisible: boolean,
    onToggleTabBar: () => void,
    onOpenSettings: () => void,
}) {
    const bg = theme?.background ?? "black";
    const fg = theme?.foreground ?? "white";

    const { borderColor } = useSurfaceColors(bg);

    if (isMacOS()) {
        return (
            <div
                data-tauri-drag-region
                className="w-full flex flex-row items-center select-none shrink-0"
                style={{
                    height: 36,
                    background: bg,
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                <button
                    className="ml-2 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: fg }}
                    onClick={onToggleTabBar}
                >
                    {tabBarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                <div className="flex-1" data-tauri-drag-region />
                <button
                    className="mr-2 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: fg }}
                    onClick={onOpenSettings}
                >
                    <Settings size={18} />
                </button>
            </div>
        );
    }

    return (
        <div
            data-tauri-drag-region
            className="w-full flex flex-row items-center justify-between select-none shrink-0"
            style={{
                height: 36,
                background: bg,
                borderBottom: `1px solid ${borderColor}`,
            }}
        >
            <button
                className="ml-2 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: fg }}
                onClick={onToggleTabBar}
            >
                {tabBarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className="flex-1" data-tauri-drag-region />
            <div className="flex flex-row items-center gap-1">
                <button
                    className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: fg }}
                    onClick={onOpenSettings}
                >
                    <Settings size={18} />
                </button>
                <div style={{ color: fg }}>
                    <WindowControl/>
                </div>
            </div>
        </div>
    );
}
