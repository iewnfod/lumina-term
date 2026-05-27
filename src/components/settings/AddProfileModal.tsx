import { useEffect, useState } from "react";
import {Button, Card, Modal} from "@heroui/react";
import { Monitor, Cloud } from "lucide-react";
import { SSHHostEntry, TerminalProfile } from "../../types/terminal.ts";
import { useI18n } from "../../hooks/i18n.tsx";
import { invoke } from "@tauri-apps/api/core";

interface Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (profile: TerminalProfile) => void;
    borderColor: string;
}

export default function AddProfileModal({ isOpen, onOpenChange, onCreate, borderColor }: Props) {
    const t = useI18n();
    const [sshEntries, setSshEntries] = useState<SSHHostEntry[]>([]);

    useEffect(() => {
        invoke<SSHHostEntry[]>("parse_ssh_config").then(setSshEntries);
    }, []);

    return (
        <Modal.Backdrop
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            isDismissable
            variant="blur"
        >
            <Modal.Container placement="center">
                <Modal.Dialog className="min-w-[360px]">
                    <Modal.Header>
                        <h3 className="text-lg font-semibold select-none">{t["Add Profile"]}</h3>
                    </Modal.Header>
                    <Modal.Body className="overflow-hidden mt-3">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-row gap-4">
                                <Button
                                    variant="outline"
                                    onPress={() => {
                                        onCreate({
                                            name: t["Untitled Profile"],
                                            exePath: "",
                                            rows: 24,
                                            cols: 80,
                                            type: "local",
                                        });
                                    }}
                                >
                                    <Monitor size={18} />
                                    {t["New Local Profile"]}
                                </Button>
                                <Button
                                    variant="outline"
                                    onPress={() => {
                                        onCreate({
                                            name: t["Untitled Profile"],
                                            exePath: "",
                                            rows: 24,
                                            cols: 80,
                                            type: "remote",
                                            ssh: { host: "", port: 22 },
                                        });
                                    }}
                                >
                                    <Cloud size={18} />
                                    {t["New Remote Profile"]}
                                </Button>
                            </div>
                            {sshEntries.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1" style={{ borderTop: `1px solid ${borderColor}` }} />
                                        <span className="text-xs text-muted select-none">{t["Import from SSH Config"]}</span>
                                        <div className="flex-1" style={{ borderTop: `1px solid ${borderColor}` }} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-1">
                                        {sshEntries.map((entry) => (
                                            <Card
                                                key={entry.host}
                                                className="flex flex-row items-center gap-3 py-3 px-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-200"
                                                onClick={() => {
                                                    onCreate({
                                                        name: entry.host,
                                                        exePath: "",
                                                        rows: 24,
                                                        cols: 80,
                                                        type: "remote",
                                                        ssh: entry.config,
                                                    });
                                                }}
                                            >
                                                <Cloud size={18} className="shrink-0 text-muted" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-medium font-semibold">{entry.host}</span>
                                                    <span className="text-xs text-muted truncate">
                                                        {entry.config.user ? `${entry.config.user}@` : ""}{entry.config.host}{entry.config.port ? `:${entry.config.port}` : ""}
                                                    </span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline" onPress={() => onOpenChange(false)}>
                            {t["Cancel"]}
                        </Button>
                    </Modal.Footer>
                </Modal.Dialog>
            </Modal.Container>
        </Modal.Backdrop>
    );
}
