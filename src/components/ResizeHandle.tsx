import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";

type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';

interface ResizeHandleProps {
    size: number;
}

export default function ResizeHandle({ size }: ResizeHandleProps) {
    if (size <= 0) return null;

    const handleMouseDown = useCallback(
        (direction: ResizeDirection) => (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            getCurrentWindow().startResizeDragging(direction);
        },
        [],
    );

    return (
        <>
            {/* Edges */}
            <div
                className="absolute z-40"
                style={{ top: 0, left: 0, right: 0, height: size, cursor: "n-resize" }}
                onMouseDown={handleMouseDown("North")}
            />
            <div
                className="absolute z-40"
                style={{ bottom: 0, left: 0, right: 0, height: size, cursor: "s-resize" }}
                onMouseDown={handleMouseDown("South")}
            />
            <div
                className="absolute z-40"
                style={{ left: 0, top: 0, bottom: 0, width: size, cursor: "w-resize" }}
                onMouseDown={handleMouseDown("West")}
            />
            <div
                className="absolute z-40"
                style={{ right: 0, top: 0, bottom: 0, width: size, cursor: "e-resize" }}
                onMouseDown={handleMouseDown("East")}
            />
            {/* Corners — higher z-index to take priority over edges */}
            <div
                className="absolute z-50"
                style={{ top: 0, left: 0, width: size, height: size, cursor: "nw-resize" }}
                onMouseDown={handleMouseDown("NorthWest")}
            />
            <div
                className="absolute z-50"
                style={{ top: 0, right: 0, width: size, height: size, cursor: "ne-resize" }}
                onMouseDown={handleMouseDown("NorthEast")}
            />
            <div
                className="absolute z-50"
                style={{ bottom: 0, left: 0, width: size, height: size, cursor: "sw-resize" }}
                onMouseDown={handleMouseDown("SouthWest")}
            />
            <div
                className="absolute z-50"
                style={{ bottom: 0, right: 0, width: size, height: size, cursor: "se-resize" }}
                onMouseDown={handleMouseDown("SouthEast")}
            />
        </>
    );
}
