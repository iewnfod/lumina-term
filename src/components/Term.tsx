import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Terminal} from "@xterm/xterm";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {TerminalProfile} from "../types/terminal.ts";
import {FitAddon} from "@xterm/addon-fit";
import {WebglAddon} from "@xterm/addon-webgl";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";
import {parseProfilePadding, parseProfileTheme} from "../lib/term.ts";
import {loadBindings, parseBindings} from "../lib/bindings.ts";
import {Actions} from "../types/config.ts";
import {isMacOS, openConfigFile} from "../lib/utils.ts";
import {useGlobalConfig} from "../hooks/config.tsx";
import {useI18n} from "../hooks/i18n.tsx";
import { info, debug } from "@tauri-apps/plugin-log";
import {getCurrentWebview} from "@tauri-apps/api/webview";
import {usePaddingOffset} from "../hooks/paddingOffset.ts";
import {WebLinksAddon} from "@xterm/addon-web-links/src/WebLinksAddon.ts";
import {openUrl} from "@tauri-apps/plugin-opener";

let hasAppliedInitialWindowSize = false;

interface TermProps {
    id: string;
    profile: TerminalProfile;
    isActive?: boolean;
    onClose?: () => void;
    onNewTab?: (profileName?: string) => void;
    onOpenCommandPalette?: () => void;
    onOpenSettings?: () => void;
    onToTab?: (index: number) => void;
}

export default function Term(props : TermProps) {
    const {id, profile, isActive} = props;
    const term = useRef<Terminal | null>(null);
    const termRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef<boolean>(false);
    const paddingOffset = usePaddingOffset();
    const padding = useMemo(() => parseProfilePadding(profile, paddingOffset), [profile, paddingOffset]);
    const {config} = useGlobalConfig();
    const t = useI18n();
    const [isDragOver, setIsDragOver] = useState(false);
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;

    const getWindowSizeFromRowsAndColumns = useCallback(() => {
        const term = new Terminal({...profile});
        const dummyDiv = document.createElement("div");
        dummyDiv.style.position = "absolute";
        dummyDiv.style.visibility = "hidden"; // 隐形，用户看不到
        dummyDiv.style.top = "-9999px";
        dummyDiv.style.width = "500px";
        dummyDiv.style.height = "500px";
        dummyDiv.style.fontStyle = profile.fontStyle ?? "normal";
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
        debug(`Char size measured: ${charWidth}x${charHeight}`);
        term.dispose();
        let widthOffset = 0; let heightOffset = 0;
        if (termRef.current) {
            widthOffset = window.innerWidth - termRef.current.clientWidth;
            heightOffset = window.innerHeight - termRef.current.clientHeight;
        }
        const padding = parseProfilePadding(profile, paddingOffset);
        const pixelWidth = Math.floor((profile.cols ?? 80) * charWidth) + widthOffset + padding.left + padding.right;
        const pixelHeight = Math.floor((profile.rows ?? 24) * charHeight) + heightOffset + padding.top + padding.bottom;
        return {width: pixelWidth, height: pixelHeight};
    }, [profile, paddingOffset]);

    const handleActions = (action: Actions, args?: Record<string, string>) => {
        info(`Term action: ${action}${args ? ` args=${JSON.stringify(args)}` : ""}`);
        switch (action) {
            case "closeTab":
                props.onClose?.();
                break;
            case "newTab":
                props.onNewTab?.(args?.profileName);
                break;
            case "openConfigFile":
                openConfigFile().then();
                break;
            case "openCommandPalette":
                props.onOpenCommandPalette?.();
                break;
            case "openSettings":
                props.onOpenSettings?.();
                break;
            case "toTab":
                if (args?.index !== undefined) {
                    const idx = args.index === "last" ? -1 : parseInt(args.index, 10);
                    if (!isNaN(idx)) props.onToTab?.(idx);
                }
                break;
        }
    };

    // Keep handleActions ref fresh for the bindings callback
    const handleActionsRef = useRef(handleActions);
    handleActionsRef.current = handleActions;

    // Keep onClose ref fresh for the term-exit listener (avoid stale closure)
    const onCloseRef = useRef(props.onClose);
    onCloseRef.current = props.onClose;

    // Drag-and-drop: insert file path into terminal
    const lastDropRef = useRef(0);
    useEffect(() => {
        let unlistenFn: (() => void) | undefined;

        getCurrentWebview().onDragDropEvent((event) => {
            if (!isActiveRef.current) return;

            if (event.payload.type === 'enter' || event.payload.type === 'over') {
                setIsDragOver(true);
            } else if (event.payload.type === 'drop') {
                setIsDragOver(false);
                if (event.payload.paths.length > 0) {
                    const now = Date.now();
                    if (now - lastDropRef.current < 200) return;
                    lastDropRef.current = now;
                    const filePaths = event.payload.paths.map(p =>
                        p.includes(' ') ? `"${p}"` : p
                    ).join(' ');
                    invoke("write_to_terminal", {id, content: filePaths + ' '}).then();
                }
            } else if (event.payload.type === 'leave') {
                setIsDragOver(false);
            }
        }).then((fn) => {
            unlistenFn = fn;
        });

        return () => {
            unlistenFn?.();
        };
    }, [id]);

    // Initialize terminal
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        // Create terminal inside effect so StrictMode remount gets a fresh instance
        term.current = new Terminal({
            allowProposedApi: true,
            ...profile,
        });

        let observer: ResizeObserver | undefined;

        if (!hasAppliedInitialWindowSize) {
            hasAppliedInitialWindowSize = true;
            const windowSize = getWindowSizeFromRowsAndColumns();
            getCurrentWindow().setSize(new LogicalSize(windowSize)).then();
        }

        parseProfileTheme(profile).then((theme) => {
            term.current!.options.theme = theme;
        });

        const webLinksAddon = new WebLinksAddon((event, uri) => {
            if ((event.metaKey && isMacOS()) || event.ctrlKey) {
                openUrl(uri).then();
            }
        });
        term.current.loadAddon(webLinksAddon);

        const fitAddon = new FitAddon();
        term.current.loadAddon(fitAddon);

        if (profile.webgl) {
            try {
                const webglAddon = new WebglAddon();
                term.current.loadAddon(webglAddon);
                debug(`WebGL addon loaded for terminal id=${id}`);
            } catch (e) {
                info(`WebGL addon failed to load, falling back to canvas: ${e}`);
            }
        }

        if (termRef.current) {
            term.current.open(termRef.current);
            fitAddon.fit();
            debug(`Terminal opened: id=${id}`);
        }

        // Load keybindings right after terminal is ready
        loadBindings(term.current, parseBindings(config.bindings), (action, args) => {
            handleActionsRef.current(action, args);
        }, config.copyWithCtrl ?? false, (data) => {
            invoke("write_to_terminal", {id, content: data}).then();
        });
        info(`Bindings loaded for terminal with id ${id}`);

        term.current.onData((data) => {
            invoke("write_to_terminal", {id, content: data}).then();
        });
        term.current.onResize(({cols, rows}) => {
            invoke("resize_terminal", {id, cols, rows}).then();
        });

        // Chunked write: batch incoming PTY data and yield between chunks
        // to avoid blocking the main thread during large output (e.g. cat bigfile)
        const pendingWrites: string[] = [];
        let writeScheduled = false;
        const CHUNK_SIZE = 1024 * 8;

        function drainWrites(term: Terminal) {
            if (pendingWrites.length === 0) {
                writeScheduled = false;
                return;
            }

            // Build one chunk by consuming items from the front of the queue
            let chunk = '';
            let taken = 0;
            while (pendingWrites.length > 0 && taken < CHUNK_SIZE) {
                const next = pendingWrites[0];
                const remaining = CHUNK_SIZE - taken;
                if (next.length <= remaining) {
                    chunk += pendingWrites.shift()!;
                    taken += next.length;
                } else {
                    chunk += next.slice(0, remaining);
                    pendingWrites[0] = next.slice(remaining);
                    taken = CHUNK_SIZE;
                }
            }

            if (pendingWrites.length > 0) {
                writeScheduled = true;
                term.write(chunk, () => {
                    queueMicrotask(() => drainWrites(term));
                });
            } else {
                term.write(chunk);
                writeScheduled = false;
            }
        }

        listen<string>(`term-write-${id}`, (event) => {
            if (term.current && event.payload) {
                const data = event.payload;
                pendingWrites.push(data);
                if (!writeScheduled) {
                    writeScheduled = true;
                    queueMicrotask(() => drainWrites(term.current!));
                }
            }
        }).then(() => {
            invoke("start_terminal", {
                id,
                exePath: profile.exePath,
                cols: profile.cols,
                rows: profile.rows,
                profileType: profile.type ?? "local",
                sshConfig: profile.type === "remote" ? profile.ssh : undefined,
            }).then(() => {
                info(`Terminal started: id=${id} profile=${profile.name}`);
                invoke("resize_terminal", {id, cols: term.current!.cols, rows: term.current!.rows}).then();
            });
        });

        listen(`term-exit-${id}`, () => {
            info(`Terminal exited: id=${id}`);
            onCloseRef.current?.();
        });

        const handleResize = () => {
            fitAddon.fit();
        };
        observer = new ResizeObserver(handleResize);
        if (termRef.current) {
            observer.observe(termRef.current);
        }
    }, [id]);

    // Auto-focus xterm when this tab becomes active
    useEffect(() => {
        if (isActive && term.current) {
            term.current.focus();
        }
    }, [isActive]);

    return (
        <div className="w-full h-full overflow-hidden relative" style={{
            paddingLeft: padding.left,
            paddingRight: padding.right,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
        }}>
            <div ref={termRef} className="w-full h-full overflow-hidden" style={{
                fontStyle: profile.fontStyle ?? "normal",
            }}/>
            {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/20 border-2 border-blue-400 border-dashed pointer-events-none">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                        {t["Drop file to insert path"]}
                    </div>
                </div>
            )}
        </div>
    );
}
