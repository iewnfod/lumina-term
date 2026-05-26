import {useEffect, useState} from "react";
import {isLinux, isMacOS} from "../lib/utils.ts";
import {getMaximized} from "./maximized.ts";

export function usePaddingOffset() {
    const isMaximized = getMaximized()
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
        if (isMaximized) {
            loadMaximizedPadding();
        } else {
            loadDefaultPadding();
        }
    }, [isMaximized]);

    return offset;
}
