import {useCallback, useEffect, useMemo, useRef} from "react";
import {Terminal} from "@xterm/xterm";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {TerminalProfile} from "../types/terminal.ts";
import {FitAddon} from "@xterm/addon-fit";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";
import {parseProfilePadding, parseProfileTheme} from "../lib/term.ts";
import {loadBindings} from "../lib/bindings.ts";
import {Actions} from "../types/config.ts";
import {openConfigFile} from "../lib/utils.ts";
import {useGlobalConfig} from "../hooks/config.tsx";

interface TermProps {
    id: string;
    profile: TerminalProfile;
    onClose?: () => void;
    onNewTab?: () => void;
}

export default function Term(props : TermProps) {
    const {id, profile} = props;
    const term = useRef<Terminal>(new Terminal({
        allowProposedApi: true,
        ...profile,
    }));
    const termRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef<boolean>(false);
    const padding = useMemo(() => parseProfilePadding(profile), [profile]);
    const {config} = useGlobalConfig();

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

    const handleActions = (action: Actions) => {
        switch (action) {
            case "closeTab":
                props.onClose?.();
                break;
            case "newTab":
                props.onNewTab?.();
                break;
            case "openConfigFile":
                openConfigFile().then();
                break;
        }
    };

    useEffect(() => {
        loadBindings(term.current, config, handleActions);
    }, [config]);

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
