import { useMemo } from "react";

export function isColorDark(hex: string): boolean {
    hex = hex.replace("#", "");
    if (hex.length < 6) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
}

export function adjustColor(hex: string, amount: number): string {
    hex = hex.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
}

export interface SurfaceColors {
    dark: boolean;
    borderColor: string;
    activeOverlay: string;
    hoverOverlay: string;
    inactiveText: string;
}

export function useSurfaceColors(backgroundColor: string): SurfaceColors {
    return useMemo(() => {
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
}
