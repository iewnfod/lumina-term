import {ITheme} from "@xterm/xterm";
import {Tooltip} from "@heroui/react";

export default function ThemePreview({ theme }: { theme: ITheme | null }) {
    if (!theme) return null;
    return (
        <div className="flex flex-col gap-1 shrink-0 pr-3">
            <div className="flex flex-row gap-1">
                {([["black", "Black"], ["red", "Red"], ["green", "Green"], ["yellow", "Yellow"]] as const).map(([key, label]) => (
                    <Tooltip key={key} delay={300} closeDelay={0}>
                        <Tooltip.Trigger>
                            <div
                                className="w-5 h-5 rounded-sm cursor-pointer"
                                style={{ background: theme[key] ?? "#000" }}
                            />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p className="text-xs">{label} {theme[key]}</p>
                        </Tooltip.Content>
                    </Tooltip>
                ))}
            </div>
            <div className="flex flex-row gap-1">
                {([["blue", "Blue"], ["magenta", "Magenta"], ["cyan", "Cyan"], ["white", "White"]] as const).map(([key, label]) => (
                    <Tooltip key={key} delay={300} closeDelay={0}>
                        <Tooltip.Trigger>
                            <div
                                className="w-5 h-5 rounded-sm cursor-pointer"
                                style={{ background: theme[key] ?? "#000" }}
                            />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p className="text-xs">{label} {theme[key]}</p>
                        </Tooltip.Content>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}
