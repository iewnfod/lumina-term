import {useCallback, useEffect, useMemo, useRef} from "react";
import {ITheme, Terminal} from "@xterm/xterm";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {TerminalProfile} from "../types/terminal.ts";
import {FitAddon} from "@xterm/addon-fit";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";
import {DEFAULT_TERMINAL_THEME} from "../constants.ts";

export function parseProfilePadding(profile: TerminalProfile) {
    let paddingLeft = 0, paddingRight = 0, paddingTop = 0, paddingBottom = 0;
    if (profile.padding) {
        if (typeof profile.padding === "number") {
            paddingLeft = profile.padding; paddingRight = profile.padding;
            paddingTop = profile.padding; paddingBottom = profile.padding;
        } else {
            paddingLeft = profile.padding.left ?? 0;
            paddingRight = profile.padding.right ?? 0;
            paddingTop = profile.padding.top ?? 0;
            paddingBottom = profile.padding.bottom ?? 0;
        }
    }
    return {
        left: paddingLeft,
        right: paddingRight,
        top: paddingTop,
        bottom: paddingBottom,
    };
}

export async function parseProfileTheme(profile: TerminalProfile) {
    let theme: ITheme = DEFAULT_TERMINAL_THEME;
    if (profile.themePath) {
        const exists = await invoke("path_exist", {path: profile.themePath});
        if (exists) {
            const readTheme = await invoke<string>("read_file", {path: profile.themePath});
            if (readTheme) {
                try {
                    const t = JSON.parse(readTheme);
                    theme = {...theme, ...t};
                } catch (e) {
                    console.error("Failed to parse theme", e);
                }
            }
        }
    }
    if (profile.theme) {
        theme = {...theme, ...profile.theme};
    }
    return theme;
}

export default function Term({id, profile} : {id: string, profile: TerminalProfile}) {
    const term = useRef<Terminal>(new Terminal({
        allowProposedApi: true,
        ...profile,
    }));
    const termRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef<boolean>(false);
    const padding = useMemo(() => parseProfilePadding(profile), [profile]);

    const getWindowSizeFromRowsAndColumns = useCallback(() => {
        const term = new Terminal({...profile});
        const dummyDiv = document.createElement("div");
        dummyDiv.style.position = "absolute";
        dummyDiv.style.visibility = "hidden"; // 隐形，用户看不到
        dummyDiv.style.top = "-9999px";
        dummyDiv.style.width = "500px";
        dummyDiv.style.height = "500px";
        document.body.appendChild(dummyDiv);
        term.open(dummyDiv);
        // @ts-ignore
        if (term._core?._charSizeService) {
            // @ts-ignore
            term._core._charSizeService.measure();
        }
        const renderDimensions = (term as any)._core?._renderService?.dimensions;
        const charSizeService = (term as any)._core?._charSizeService;
        let charWidth = renderDimensions?.actualCellWidth || charSizeService?.width;
        let charHeight = renderDimensions?.actualCellHeight || charSizeService?.height;
        console.log(charWidth, charHeight);
        term.dispose();
        let widthOffset = 0; let heightOffset = 0;
        if (termRef.current) {
            widthOffset = window.innerWidth - termRef.current.clientWidth;
            heightOffset = window.innerHeight - termRef.current.clientHeight;
        }
        const padding = parseProfilePadding(profile);
        const pixelWidth = Math.floor(profile.cols * charWidth) + widthOffset + padding.left + padding.right;
        const pixelHeight = Math.floor(profile.rows * charHeight) + heightOffset + padding.top + padding.bottom;
        return {width: pixelWidth, height: pixelHeight};
    }, [profile]);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const windowSize = getWindowSizeFromRowsAndColumns();
        getCurrentWindow().setSize(new LogicalSize(windowSize)).then();

        parseProfileTheme(profile).then((theme) => {
            term.current.options.theme = theme;
        });

        const fitAddon = new FitAddon();
        term.current.loadAddon(fitAddon);

        if (termRef.current) {
            term.current.open(termRef.current);
            fitAddon.fit();
            console.log("FitAddon loaded");
        }

        term.current.onData((data) => {
            invoke("write_to_terminal", {id, content: data}).then();
        });
        term.current.onResize(({cols, rows}) => {
            invoke("resize_terminal", {id, cols, rows}).then(() => {
                console.log("Resizing terminal");
            });
        });
        listen<string>(`term-write-${id}`, (event) => {
            if (term.current && event.payload) {
                term.current.write(event.payload);
            }
        }).then(() => {
            invoke("start_terminal", {
                id,
                ...profile,
            }).then(() => {
                console.log("Starting terminal", id);
                invoke("resize_terminal", {id, cols: term.current.cols, rows: term.current.rows}).then();
            });
        });

        const handleResize = () => {
            fitAddon.fit();
        };
        const observer = new ResizeObserver(handleResize);
        if (termRef.current) {
            observer.observe(termRef.current);
        }
    }, [id]);

    return (
        <div ref={termRef} className="w-full h-full overflow-hidden" style={{
            paddingLeft: padding.left,
            paddingRight: padding.right,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
        }}/>
    );
}
