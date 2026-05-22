import {LucideMaximize, LucideMinimize, LucideMinus, LucideX} from "lucide-react";
import {Button} from "@heroui/react";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {useEffect, useMemo, useState} from "react";
import {ITheme} from "@xterm/xterm";
import {isMacOS} from "../lib/utils.ts";

function adjustColor(hex: string, amount: number): string {
    hex = hex.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
}

function isColorDark(hex: string): boolean {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
}

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
    theme
} : {
    theme: ITheme | null,
}) {
    const bg = theme?.background ?? "black";

    const borderColor = useMemo(() => {
        const dark = isColorDark(bg);
        return adjustColor(bg, dark ? 20 : -20);
    }, [bg]);

    if (isMacOS()) {
        return (
            <div
                data-tauri-drag-region
                className="w-full select-none shrink-0"
                style={{
                    height: 36,
                    background: bg,
                    borderBottom: `1px solid ${borderColor}`,
                }}
            />
        );
    }

    return (
        <div
            data-tauri-drag-region
            className="w-full flex flex-row items-center justify-end select-none shrink-0"
            style={{
                height: 36,
                background: bg,
                borderBottom: `1px solid ${borderColor}`,
            }}
        >
            <div style={{color: theme?.foreground ?? "white"}}>
                <WindowControl/>
            </div>
        </div>
    );
}
