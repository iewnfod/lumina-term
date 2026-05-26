import {useEffect, useState} from "react";
import {isLinux, isMacOS} from "../lib/utils.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

export function usePaddingOffset() {
    const [offset, setOffset] = useState(0);

    const loadDefaultPadding = () => {
        if (isLinux()) {
            setOffset(15);
        } else if (isMacOS()) {
            setOffset(8);
        } else {
            setOffset(0);
        }
    }

    const loadMaximizedPadding = () => {
        if (isLinux()) {
            setOffset(0);
        }
    }

    useEffect(() => {
        loadDefaultPadding();

        const resizeHandler = () => {
            getCurrentWindow().isMaximized().then((maximized) => {
                if (maximized) {
                    loadMaximizedPadding();
                } else {
                    loadDefaultPadding();
                }
            });
        };

        window.addEventListener("resize", resizeHandler);

        return () => {
            window.removeEventListener("resize", resizeHandler);
        };
    }, []);

    return offset;
}
