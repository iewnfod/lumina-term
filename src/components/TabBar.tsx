import { Plus, X } from "lucide-react";
import { useMemo } from "react";
import Icon from "../assets/icon.svg";
import { isMacOS } from "../lib/utils.ts";

export interface TabInfo {
    id: string;
    name: string;
}

interface TabBarProps {
    tabs: TabInfo[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onNew: () => void;
    backgroundColor: string;
    foregroundColor: string;
    collapsed: boolean;
}

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

export default function TabBar(props: TabBarProps) {
    const { tabs, activeId, onSelect, onClose, onNew, backgroundColor, foregroundColor, collapsed } = props;

    const colors = useMemo(() => {
        const dark = isColorDark(backgroundColor);
        const borderColor = adjustColor(backgroundColor, dark ? 20 : -20);
        const activeOverlay = dark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.08)";
        const hoverOverlay = dark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.04)";
        const inactiveText = dark
            ? "rgba(255,255,255,0.5)"
            : "rgba(0,0,0,0.45)";
        return { dark, borderColor, activeOverlay, hoverOverlay, inactiveText };
    }, [backgroundColor]);

    const borderStyle = collapsed ? "none" : `1px solid ${colors.borderColor}`;

    return (
        <div
            className="flex flex-col h-full select-none transition-all duration-300 ease-in-out overflow-hidden"
            style={{
                width: collapsed ? 0 : 180,
                minWidth: collapsed ? 0 : 180,
                background: backgroundColor,
            }}
        >
            <div
                data-tauri-drag-region
                className="shrink-0 px-3 py-2 border-b"
                style={{
                    borderColor: colors.borderColor,
                    color: foregroundColor,
                }}
            >
                <div className="flex flex-row items-center gap-1.5" data-tauri-drag-region>
                    {!isMacOS() && (
                        <img
                            src={Icon}
                            alt=""
                            className="h-5 w-5 pointer-events-none"
                        />
                    )}
                    <span className="text-sm font-medium truncate leading-tight translate-y-px">
                        Lumina
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden" data-tauri-drag-region style={{
                borderRight: borderStyle,
            }}>
                {tabs.map((tab) => {
                    const isActive = tab.id === activeId;
                    return (
                        <div
                            key={tab.id}
                            className="flex flex-row items-center justify-between px-3 py-2.5 cursor-pointer group transition-colors"
                            style={{
                                background: isActive ? colors.activeOverlay : "transparent",
                            }}
                            onClick={() => onSelect(tab.id)}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = colors.hoverOverlay;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "transparent";
                                }
                            }}
                            title={tab.name}
                        >
                            <span
                                className="text-sm truncate flex-1"
                                style={{
                                    color: isActive ? foregroundColor : colors.inactiveText,
                                }}
                            >
                                {tab.name}
                            </span>
                            <button
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 shrink-0 transition-all ml-1"
                                style={{
                                    color: isActive ? foregroundColor : colors.inactiveText,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(tab.id);
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.activeOverlay;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div
                className="border-t shrink-0"
                style={{
                    borderColor: colors.borderColor,
                    borderRight: borderStyle,
                }}
            >
                <button
                    className="flex flex-row items-center gap-2 w-full px-3 py-2.5 transition-colors cursor-pointer"
                    style={{
                        color: colors.inactiveText,
                    }}
                    onClick={onNew}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverOverlay)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                    <Plus size={16} />
                    <span className="text-sm">New Tab</span>
                </button>
            </div>
        </div>
    );
}
