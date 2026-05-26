import {useEffect, useState} from "react";
import {getCurrentWindow} from "@tauri-apps/api/window";

export function getMaximized() {
    const [max, setMax] = useState(false);

    useEffect(() => {
        const resizeHandler = () => {
            getCurrentWindow().isMaximized().then((maximized) => {
                setMax(maximized);
            });
        };
        resizeHandler();

        window.addEventListener("resize", resizeHandler);

        return () => {
            window.removeEventListener("resize", resizeHandler);
        };
    }, []);

    return max;
}
