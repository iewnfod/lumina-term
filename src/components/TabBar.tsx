import { Plus, X, Settings } from "lucide-react";
import Icon from "../assets/icon.svg";
import { isMacOS } from "../lib/utils.ts";
import { SETTINGS_TAB_ID } from "../constants.ts";
import { useSurfaceColors } from "../hooks/surfaceColors.ts";
import {useI18n} from "../hooks/i18n.tsx";

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

export default function TabBar(props: TabBarProps) {
    const { tabs, activeId, onSelect, onClose, onNew, backgroundColor, foregroundColor, collapsed } = props;
    const t = useI18n();

    const colors = useSurfaceColors(backgroundColor);

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
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {tab.id === SETTINGS_TAB_ID && (
                                    <Settings size={14} className="shrink-0" />
                                )}
                                <span
                                    className="text-sm truncate"
                                    style={{
                                        color: isActive ? foregroundColor : colors.inactiveText,
                                    }}
                                >
                                    {tab.name}
                                </span>
                            </div>
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
                    <span className="text-sm">{t["New Tab"]}</span>
                </button>
            </div>
        </div>
    );
}
