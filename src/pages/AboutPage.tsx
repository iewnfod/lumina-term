import {useEffect, useMemo, useState} from "react";
import { ITheme } from "@xterm/xterm";
import { useI18n } from "../hooks/i18n.tsx";
import { useSurfaceColors } from "../hooks/surfaceColors.ts";
import iconSvg from "../assets/icon.svg";
import readmeRaw from "../../README.md?raw";
import {invoke} from "@tauri-apps/api/core";
import {getVersion} from "@tauri-apps/api/app";

interface TechItem {
    name: string;
    url: string;
}

function parseTechStack(readme: string): TechItem[] {
    // Match the "Technology Used" section
    const sectionRegex = /^## Technology Used\s*$[\s\S]*?(?=^## |\Z)/m;
    const section = readme.match(sectionRegex);
    if (!section) return [];

    // Parse markdown list items: * [Name](url)
    const items: TechItem[] = [];
    const itemRegex = /^\*\s+\[(.+?)]\((.+?)\)/gm;
    let match;
    while ((match = itemRegex.exec(section[0])) !== null) {
        items.push({ name: match[1], url: match[2] });
    }
    return items;
}

export default function AboutPage({ theme }: { theme: ITheme | null }) {
    const t = useI18n();
    const bg = theme?.background ?? "#000000";
    const fg = theme?.foreground ?? "#ffffff";
    const colors = useSurfaceColors(bg);

    const technologies = useMemo(() => parseTechStack(readmeRaw), []);
    const [commitHash, setCommitHash] = useState<string>("");
    const [version, setVersion] = useState<string>("");

    useEffect(() => {
        invoke<string>("get_commit_hash").then((hash) => {
            setCommitHash(hash);
        });
        getVersion().then((version) => {
            setVersion(version);
        });
    }, []);

    return (
        <div
            className="flex flex-col items-center justify-center h-full px-6 py-8"
            style={{ background: bg, color: fg }}
        >
            <div className="flex flex-col items-center gap-6 max-w-sm w-full overflow-y-auto">
                <img
                    src={iconSvg}
                    alt="Lumina Terminal"
                    className="w-24 h-24 select-none pointer-events-none"
                />

                <h1 className="text-xl font-semibold select-none">Lumina Terminal</h1>

                <div className="flex flex-col gap-3 w-full text-sm">
                    {/* Version */}
                    <div
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: `1px solid ${colors.borderColor}` }}
                    >
                        <span className="text-muted">{t["Version"]}</span>
                        <span style={{ color: fg }}>
                            {version} ({commitHash})
                        </span>
                    </div>

                    {/* Author */}
                    <div
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: `1px solid ${colors.borderColor}` }}
                    >
                        <span className="text-muted">{t["Author"]}</span>
                        <a
                            href="https://github.com/iewnfod"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: fg }}
                        >
                            Iewnfod
                        </a>
                    </div>

                    {/* GitHub Repo */}
                    <div
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: `1px solid ${colors.borderColor}` }}
                    >
                        <span className="text-muted">{t["Repository"]}</span>
                        <a
                            href="https://github.com/iewnfod/lumina-terminal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-sm"
                            style={{ color: fg }}
                        >
                            iewnfod/lumina-terminal
                        </a>
                    </div>

                    {/* License */}
                    <div
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: `1px solid ${colors.borderColor}` }}
                    >
                        <span className="text-muted">{t["License"]}</span>
                        <a
                            href="https://opensource.org/licenses/MPL-2.0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: fg }}
                        >
                            MPL-2.0
                        </a>
                    </div>

                    {/* Technologies */}
                    <div className="flex flex-col gap-2 py-2">
                        <span className="text-muted text-sm">{t["Technology Stack"]}</span>
                        <div className="flex flex-wrap gap-2">
                            {technologies.map((tech) => (
                                <a
                                    key={tech.name}
                                    href={tech.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-md text-xs transition-colors hover:opacity-80"
                                    style={{
                                        background: colors.hoverOverlay,
                                        color: fg,
                                    }}
                                >
                                    {tech.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
