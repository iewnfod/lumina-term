import {TerminalProfile} from "../../types/terminal.ts";
import {useGlobalConfig} from "../../hooks/config.tsx";
import {useI18n} from "../../hooks/i18n.tsx";
import {useShells} from "../../hooks/useShells.ts";
import {useEffect, useMemo, useRef, useState} from "react";
import {info} from "@tauri-apps/plugin-log";
import {platform} from "@tauri-apps/plugin-os";
import {open} from "@tauri-apps/plugin-dialog";
import {Button, Input, Label, ListBox, Select} from "@heroui/react";
import RenderSettings from "./RenderSettings.tsx";
import {Trash2} from "lucide-react";

const CUSTOM_EXE = "__custom__";

export default function ProfileSettings({
    profile,
    onRequestDelete,
    onNameChange,
    borderColor,
}: {
    profile?: TerminalProfile;
    onRequestDelete: () => void;
    onNameChange: (newName: string) => void;
    borderColor: string;
}) {
    const { config, updateConfig } = useGlobalConfig();
    const t = useI18n();

    const [draft, setDraft] = useState<TerminalProfile | null>(null);
    const shells = useShells();
    const [isCustomExe, setIsCustomExe] = useState(false);

    // Reset draft when profile identity changes
    useEffect(() => {
        if (profile) {
            setDraft({ ...profile });
            setIsCustomExe(!!profile.exePath && !shells.includes(profile.exePath));
        } else {
            setDraft(null);
            setIsCustomExe(false);
        }
    }, [profile?.name]);

    const isDirty = useMemo(() => {
        if (!profile || !draft) return false;
        return JSON.stringify(profile) !== JSON.stringify(draft);
    }, [profile, draft]);

    const updateDraft = (updates: Partial<TerminalProfile>) => {
        setDraft((prev) => (prev ? { ...prev, ...updates } : null));
    };

    const [isEditingName, setIsEditingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus name input when entering edit mode
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const selectedShellKey = useMemo(() => {
        if (isCustomExe) return CUSTOM_EXE;
        if (!draft?.exePath) return "";
        if (shells.includes(draft.exePath)) return draft.exePath;
        return CUSTOM_EXE;
    }, [draft?.exePath, shells, isCustomExe]);

    if (!profile || !draft) {
        return (
            <div className="flex items-center justify-center h-full text-muted text-sm">
                Profile not found.
            </div>
        );
    }

    const handleSave = () => {
        if (!draft) return;
        const oldName = profile.name;
        info(`Profile saved: ${oldName}`);
        const trimmed: TerminalProfile = {
            ...draft,
            name: draft.name.trim(),
            exePath: draft.exePath.trim(),
            fontFamily: draft.fontFamily?.trim() || undefined,
            fontStyle: draft.fontStyle === "italic" ? "italic" : "normal",
            themePath: draft.themePath?.trim() || undefined,
        };
        const newName = trimmed.name;
        if (!newName) return;

        // Check name collision (only if name changed and collides with another profile)
        if (newName !== oldName && config.profiles.some((p) => p.name === newName)) {
            return;
        }

        const newProfiles = config.profiles.map((p) =>
            p.name === oldName ? trimmed : p
        );
        updateConfig({ profiles: newProfiles });
        if (newName !== oldName) {
            onNameChange(newName);
        }
    };

    const handleShellSelectionChange = (key: string) => {
        if (key === CUSTOM_EXE) {
            setIsCustomExe(true);
            updateDraft({ exePath: "" });
        } else if (key) {
            setIsCustomExe(false);
            updateDraft({ exePath: key });
        }
    };

    const handleExePathBrowse = async () => {
        const os = platform();
        const exe = await open({
            multiple: false,
            directory: false,
            filters:
                os === "windows"
                    ? [{ name: "Executable File", extensions: ["exe"] }]
                    : [],
        });
        if (exe) {
            info(`Profile exe path selected: ${exe}`);
            updateDraft({ exePath: exe });
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-4 px-1">
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={draft.name}
                        onChange={(e) => updateDraft({ name: e.target.value })}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") setIsEditingName(false);
                            if (e.key === "Escape") {
                                updateDraft({ name: profile.name });
                                setIsEditingName(false);
                            }
                        }}
                        className="text-lg font-semibold mb-6 bg-transparent border-b outline-none w-full max-w-xs"
                        style={{ borderColor: "var(--color-default-200, #333)", color: "inherit" }}
                    />
                ) : (
                    <h2
                        className="text-lg font-semibold mb-6 cursor-pointer select-none"
                        onDoubleClick={() => setIsEditingName(true)}
                        title="Double-click to rename"
                    >
                        {draft.name}
                    </h2>
                )}

                <div className="flex flex-col gap-4">
                    {/* Exe Path */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-exe-path" isRequired>{t["Exe Path"]}</Label>
                        <Select
                            selectedKey={selectedShellKey}
                            onSelectionChange={(key) => handleShellSelectionChange(key as string)}
                            className="max-w-sm"
                        >
                            <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {shells.map((path) => {
                                        const name = path.replace(/\\/g, "/").split("/").pop() || path;
                                        return (
                                            <ListBox.Item id={path} key={path} textValue={name}>
                                                {name}
                                                <span className="text-xs text-muted ml-2">{path}</span>
                                            </ListBox.Item>
                                        );
                                    })}
                                    <ListBox.Item id={CUSTOM_EXE} key={CUSTOM_EXE} textValue="Custom">
                                        {t["Custom"]}
                                    </ListBox.Item>
                                </ListBox>
                            </Select.Popover>
                        </Select>
                        {isCustomExe && (
                            <div className="flex flex-row gap-2 items-center mt-1">
                                <Input
                                    id="profile-exe-path"
                                    value={draft.exePath}
                                    onChange={(e) => updateDraft({ exePath: e.target.value })}
                                    className="flex-1 max-w-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={handleExePathBrowse}
                                >
                                    {t["Select"]}
                                </Button>
                            </div>
                        )}
                    </div>

                    <RenderSettings draft={draft} updateDraft={updateDraft} idPrefix="profile" defaultExpanded={false} />
                </div>
            </div>

            {/* Fixed bottom: Save + Delete */}
            <div className="shrink-0 border-t pt-3" style={{ borderColor: borderColor }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            isDisabled={!isDirty}
                            onPress={handleSave}
                        >
                            {t["Save"]}
                        </Button>
                        {isDirty && (
                            <span className="text-xs text-muted">{t["Unsaved changes"]}</span>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onPress={onRequestDelete}
                        className="text-danger border-danger/30 hover:bg-danger/10"
                    >
                        <Trash2 size={15} />
                        {t["Delete Profile"]}
                    </Button>
                </div>
            </div>
        </div>
    );
}
