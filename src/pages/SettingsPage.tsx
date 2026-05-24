import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Input,
    Select,
    ListBox,
    Label,
    Switch,
    Modal,
    Tooltip,
} from "@heroui/react";
import {
    Plus,
    Trash2,
    FolderOpen,
    FileCog,
    Bug,
} from "lucide-react";
import { ITheme } from "@xterm/xterm";
import { useGlobalConfig } from "../hooks/config.tsx";
import { useI18n, languageNames } from "../hooks/i18n.tsx";
import { TerminalProfile } from "../types/terminal.ts";
import { openConfigFile, getConfigFilePath } from "../lib/utils.ts";
import { parseProfileTheme } from "../lib/term.ts";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { platform } from "@tauri-apps/plugin-os";
import { useSurfaceColors } from "../hooks/surfaceColors.ts";
import { info, debug } from "@tauri-apps/plugin-log";

type SettingsSection = "general" | string;

function SidebarItem({
    children,
    isSelected,
    onClick,
    colors,
}: {
    children: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
    colors: { activeOverlay: string; hoverOverlay: string };
}) {
    return (
        <div
            className="flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm"
            style={{
                background: isSelected ? colors.activeOverlay : "transparent",
                fontWeight: isSelected ? 500 : 400,
                transition: "background-color 150ms",
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.background = colors.hoverOverlay;
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                }
            }}
        >
            {children}
        </div>
    );
}

export default function SettingsPage({ theme }: { theme: ITheme | null }) {
    const { config, updateConfig, newProfile } = useGlobalConfig();
    const t = useI18n();
    const [selectedSection, setSelectedSection] = useState<SettingsSection>("general");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const handleSectionChange = (section: SettingsSection) => {
        debug(`Settings section changed to: ${section}`);
        setSelectedSection(section);
    };

    const bg = theme?.background ?? "#000000";
    const fg = theme?.foreground ?? "#ffffff";
    const colors = useSurfaceColors(bg);

    const handleDeleteProfile = useCallback(
        (name: string) => {
            info(`Profile deleted: ${name}`);
            const newProfiles = config.profiles.filter((p) => p.name !== name);
            updateConfig({ profiles: newProfiles });
            if (selectedSection === name) {
                setSelectedSection("general");
            }
            setDeleteTarget(null);
        },
        [config.profiles, updateConfig, selectedSection]
    );

    const handleAddProfile = useCallback(() => {
        const baseName = t["Untitled Profile"];
        let name = baseName;
        let i = 1;
        while (config.profiles.some((p) => p.name === name)) {
            name = `${baseName} ${i}`;
            i++;
        }
        info(`Profile added: ${name}`);
        const profile: TerminalProfile = {
            name,
            exePath: "",
            rows: 24,
            cols: 80,
        };
        newProfile(profile);
        setSelectedSection(name);
    }, [config.profiles, newProfile, t]);

    return (
        <div className="flex flex-row h-full" style={{ background: bg, color: fg }}>
            {/* Inner Sidebar */}
            <div
                className="flex flex-col shrink-0 h-full overflow-hidden"
                style={{
                    width: 180,
                    borderRight: `1px solid ${colors.borderColor}`,
                }}
            >
                <div className="flex-1 overflow-y-auto pt-2">
                    {/* General */}
                    <SidebarItem
                        isSelected={selectedSection === "general"}
                        onClick={() => handleSectionChange("general")}
                        colors={colors}
                    >
                        <div className="flex items-center gap-2">
                            <FileCog size={15} />
                            <span className="truncate">{t["General"]}</span>
                        </div>
                    </SidebarItem>

                    <div className="mb-1" />

                    {/* Profiles header */}
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5 select-none">
                        <span className="text-xs font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: colors.inactiveText, opacity: 0.8 }}>
                            {t["Profiles"]}
                        </span>
                        <div className="flex-1" style={{ borderTop: `1px solid ${colors.borderColor}` }} />
                    </div>

                    {/* Profile list */}
                    {config.profiles.map((profile) => (
                        <SidebarItem
                            key={profile.name}
                            isSelected={selectedSection === profile.name}
                            onClick={() => handleSectionChange(profile.name)}
                            colors={colors}
                        >
                            <span className="truncate">{profile.name}</span>
                        </SidebarItem>
                    ))}
                    <div className="mb-1" />

                    {/* Developer header */}
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5 select-none">
                        <span className="text-xs font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: colors.inactiveText, opacity: 0.8 }}>
                            {t["Developer"]}
                        </span>
                        <div className="flex-1" style={{ borderTop: `1px solid ${colors.borderColor}` }} />
                    </div>

                    <SidebarItem
                        isSelected={selectedSection === "developer"}
                        onClick={() => handleSectionChange("developer")}
                        colors={colors}
                    >
                        <div className="flex items-center gap-2">
                            <Bug size={15} />
                            <span className="truncate">{t["Developer"]}</span>
                        </div>
                    </SidebarItem>
                </div>

                {/* Add Profile button */}
                <div className="border-t shrink-0" style={{ borderColor: colors.borderColor }}>
                    <button
                        className="flex flex-row items-center gap-2 w-full px-3 py-2.5 transition-colors cursor-pointer"
                        style={{ color: colors.inactiveText }}
                        onClick={handleAddProfile}
                        onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverOverlay)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <Plus size={16} />
                        <span className="text-sm">{t["Add Profile"]}</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
                {selectedSection === "general" ? (
                    <GeneralSettings borderColor={colors.borderColor} />
                ) : selectedSection === "developer" ? (
                    <DeveloperSettings />
                ) : (
                    <ProfileEditor
                        profile={config.profiles.find((p) => p.name === selectedSection)}
                        onRequestDelete={() => setDeleteTarget(selectedSection)}
                        onNameChange={(newName) => setSelectedSection(newName)}
                        borderColor={colors.borderColor}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal.Backdrop
                isOpen={deleteTarget !== null}
                onOpenChange={() => setDeleteTarget(null)}
                isDismissable
                variant="blur"
            >
                <Modal.Container placement="center">
                    <Modal.Dialog>
                        <Modal.Header>
                            <h3 className="text-lg font-semibold">{t["Delete Profile"]}</h3>
                            <p className="text-sm text-muted">
                                {t["Are you sure you want to delete this profile?"]}
                                <br />
                                <span className="text-danger text-sm">
                                    {t["This action cannot be undone."]}
                                </span>
                            </p>
                        </Modal.Header>
                        <Modal.Footer>
                            <Button variant="outline" onPress={() => setDeleteTarget(null)}>
                                {t["Cancel"]}
                            </Button>
                            <Button
                                variant="primary"
                                className="bg-danger text-danger-foreground"
                                onPress={() => {
                                    if (deleteTarget) {
                                        handleDeleteProfile(deleteTarget);
                                    }
                                }}
                            >
                                {t["Delete"]}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </div>
    );
}

function GeneralSettings({ borderColor }: { borderColor: string }) {
    const { config, updateConfig } = useGlobalConfig();
    const t = useI18n();

    const currentDefault = useMemo(() => {
        return config.profiles.find(p => p.default)?.name ?? config.profiles[0]?.name ?? "";
    }, [config.profiles]);

    const [draft, setDraft] = useState({
        language: config.language,
        showTabBar: config.showTabBar ?? false,
        closeWindowOnLastTab: config.closeWindowOnLastTab !== false,
        defaultProfile: currentDefault,
    });

    // Reset draft when config changes externally
    useEffect(() => {
        setDraft({
            language: config.language,
            showTabBar: config.showTabBar ?? false,
            closeWindowOnLastTab: config.closeWindowOnLastTab !== false,
            defaultProfile: currentDefault,
        });
    }, [config.language, config.showTabBar, config.closeWindowOnLastTab, currentDefault]);

    const isDirty =
        draft.language !== config.language ||
        draft.showTabBar !== (config.showTabBar ?? false) ||
        draft.closeWindowOnLastTab !== (config.closeWindowOnLastTab !== false) ||
        draft.defaultProfile !== currentDefault;

    const handleSave = () => {
        info("General settings saved");
        const updated: Partial<typeof config> = {
            language: draft.language,
            showTabBar: draft.showTabBar,
            closeWindowOnLastTab: draft.closeWindowOnLastTab,
        };
        if (draft.defaultProfile !== currentDefault) {
            updated.profiles = config.profiles.map(p => ({
                ...p,
                default: p.name === draft.defaultProfile ? true : p.default ? false : undefined,
            }));
        }
        updateConfig(updated);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-4 px-1">
                <h2 className="text-lg font-semibold mb-6">{t["General"]}</h2>

                <div className="flex flex-col gap-5">
                {/* Language */}
                <div className="flex flex-col gap-1.5">
                    <Label>{t["Language"]}</Label>
                    <Select
                        selectedKey={draft.language}
                        onSelectionChange={(key) => {
                            if (key) {
                                setDraft((prev) => ({ ...prev, language: key as "en-us" | "zh-cn" }));
                            }
                        }}
                        className="max-w-xs"
                    >
                        <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {[...languageNames.keys()].map((lang) => (
                                    <ListBox.Item id={lang} key={lang} textValue={lang}>
                                        {languageNames.get(lang)}
                                    </ListBox.Item>
                                ))}
                            </ListBox>
                        </Select.Popover>
                    </Select>
                </div>

                {/* Default Profile */}
                <div className="flex flex-col gap-1.5">
                    <Label>{t["Default Profile"]}</Label>
                    <Select
                        selectedKey={draft.defaultProfile}
                        onSelectionChange={(key) => {
                            if (key) {
                                setDraft((prev) => ({ ...prev, defaultProfile: key as string }));
                            }
                        }}
                        className="max-w-xs"
                    >
                        <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {config.profiles.map((p) => (
                                    <ListBox.Item id={p.name} key={p.name} textValue={p.name}>
                                        {p.name}
                                    </ListBox.Item>
                                ))}
                            </ListBox>
                        </Select.Popover>
                    </Select>
                </div>

                {/* Show Tab Bar */}
                <div className="flex flex-row items-center justify-between max-w-xs">
                    <Label className="cursor-pointer">
                        {draft.showTabBar ? t["Hide Tab Bar"] : t["Show Tab Bar"]}
                    </Label>
                    <Switch
                        isSelected={draft.showTabBar}
                        onChange={(v) => setDraft((prev) => ({ ...prev, showTabBar: v }))}
                    >
                        <Switch.Control>
                            <Switch.Thumb />
                        </Switch.Control>
                    </Switch>
                </div>

                {/* Close Window on Last Tab */}
                <div className="flex flex-row items-center justify-between max-w-xs">
                    <Label className="cursor-pointer">
                        {draft.closeWindowOnLastTab
                            ? t["Close Window on Last Tab Closed"]
                            : t["Keep Window on Last Tab Closed"]}
                    </Label>
                    <Switch
                        isSelected={draft.closeWindowOnLastTab}
                        onChange={(v) => setDraft((prev) => ({ ...prev, closeWindowOnLastTab: v }))}
                    >
                        <Switch.Control>
                            <Switch.Thumb />
                        </Switch.Control>
                    </Switch>
                </div>

                </div>
            </div>
            {/* Fixed bottom: Save */}
            <div className="shrink-0 border-t pt-3" style={{ borderColor: borderColor }}>
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        isDisabled={!isDirty}
                        onPress={handleSave}
                    >
                        {t["Save"]}
                    </Button>
                    {isDirty && (
                        <span className="text-xs text-muted">Unsaved changes</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function DeveloperSettings() {
    const t = useI18n();
    const [configPath, setConfigPath] = useState("");
    const [logDir, setLogDir] = useState("");
    const [isDebug, setIsDebug] = useState(false);

    useEffect(() => {
        getConfigFilePath().then(setConfigPath).catch(() => setConfigPath(""));
        invoke<string>("get_log_dir").then(setLogDir).catch(() => setLogDir(""));
        invoke<boolean>("is_debug").then(setIsDebug).catch(() => setIsDebug(false));
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pb-4 px-1">
                <h2 className="text-lg font-semibold mb-6">{t["Developer"]}</h2>

                <div className="flex flex-col gap-5">
                    {/* Config File Path */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["Config File Path"]}</Label>
                            <p className="text-xs text-muted truncate flex-1" title={configPath}>
                                {configPath || "—"}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onPress={() => openConfigFile().catch(console.error)}
                        >
                            <FolderOpen size={15} />
                            {t["Open"]}
                        </Button>
                    </div>

                    {/* Log Directory */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["Log Directory"]}</Label>
                            <p className="text-xs text-muted truncate flex-1" title={logDir}>
                                {logDir || "—"}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onPress={() => {
                                if (logDir) {
                                    openPath(logDir).catch(() => {
                                        debug(`Failed to open log directory: ${logDir}`);
                                    });
                                }
                            }}
                        >
                            <FolderOpen size={15} />
                            {t["Open"]}
                        </Button>
                    </div>

                    {/* DevTools */}
                    <div className="flex flex-row justify-between items-center w-full">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t["DevTools"]}</Label>
                            <p className="text-xs text-muted">
                                Open the webview developer tools
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            isDisabled={!isDebug}
                            onPress={() => invoke("open_devtools").catch(() => {
                                console.log("DevTools command not available, use Ctrl+Shift+I");
                            })}
                        >
                            <Bug size={15} />
                            {t["Open"]}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileEditor({
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

    // Reset draft when profile identity changes
    useEffect(() => {
        if (profile) {
            setDraft({ ...profile });
        } else {
            setDraft(null);
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

    const [themePreview, setThemePreview] = useState<ITheme | null>(null);

    useEffect(() => {
        if (draft) {
            parseProfileTheme(draft).then(setThemePreview);
        } else {
            setThemePreview(null);
        }
    }, [draft?.themePath, draft?.theme]);

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

    const paddingValue =
        typeof draft.padding === "number"
            ? draft.padding
            : draft.padding?.x ?? draft.padding?.left ?? 0;

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
                        <div className="flex flex-row gap-2 items-center">
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
                    </div>

                    {/* Rows and Columns */}
                    <div className="flex flex-row gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="profile-rows" isRequired>{t["Rows"]}</Label>
                            <Input
                                id="profile-rows"
                                type="number"
                                min={1}
                                value={String(draft.rows)}
                                onChange={(e) =>
                                    updateDraft({ rows: Math.max(1, +e.target.value || 1) })
                                }
                                className="w-24"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="profile-cols" isRequired>{t["Columns"]}</Label>
                            <Input
                                id="profile-cols"
                                type="number"
                                min={1}
                                value={String(draft.cols)}
                                onChange={(e) =>
                                    updateDraft({ cols: Math.max(1, +e.target.value || 1) })
                                }
                                className="w-24"
                            />
                        </div>
                    </div>

                    {/* Padding */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-padding">{t["Padding"]}</Label>
                        <Input
                            id="profile-padding"
                            type="number"
                            min={0}
                            value={String(paddingValue)}
                            onChange={(e) =>
                                updateDraft({ padding: Math.max(0, +e.target.value || 0) })
                            }
                            className="w-24"
                        />
                    </div>

                    {/* Font Family */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-font-family">{t["Font Family"]}</Label>
                        <Input
                            id="profile-font-family"
                            value={draft.fontFamily ?? ""}
                            onChange={(e) =>
                                updateDraft({ fontFamily: e.target.value || undefined })
                            }
                            className="max-w-sm"
                            placeholder="e.g. JetBrains Mono"
                        />
                    </div>

                    {/* Font Size */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-font-size">{t["Font Size"]}</Label>
                        <Input
                            id="profile-font-size"
                            type="number"
                            min={1}
                            value={String(draft.fontSize ?? "")}
                            onChange={(e) =>
                                updateDraft({ fontSize: +e.target.value || undefined })
                            }
                            className="w-24"
                        />
                    </div>

                    {/* Theme Path */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-theme">{t["Theme Path"]}</Label>
                        <div className="flex flex-row items-center justify-between gap-4">
                            <Input
                                id="profile-theme"
                                value={draft.themePath ?? ""}
                                onChange={(e) =>
                                    updateDraft({ themePath: e.target.value || undefined })
                                }
                                className="flex-1"
                                placeholder="e.g. themes/my-theme.json"
                            />
                            {themePreview && (
                                <div className="flex flex-col gap-1 shrink-0 pr-3">
                                    <div className="flex flex-row gap-1">
                                        {([["black", "Black"], ["red", "Red"], ["green", "Green"], ["yellow", "Yellow"]] as const).map(([key, label]) => (
                                            <Tooltip key={key} delay={300} closeDelay={0}>
                                                <Tooltip.Trigger>
                                                    <div
                                                        className="w-5 h-5 rounded-sm cursor-pointer"
                                                        style={{ background: themePreview[key] ?? "#000" }}
                                                    />
                                                </Tooltip.Trigger>
                                                <Tooltip.Content>
                                                    <p className="text-xs">{label} {themePreview[key]}</p>
                                                </Tooltip.Content>
                                            </Tooltip>
                                        ))}
                                    </div>
                                    <div className="flex flex-row gap-1">
                                        {([["blue", "Blue"], ["magenta", "Magenta"], ["cyan", "Cyan"], ["white", "White"]] as const).map(([key, label]) => (
                                            <Tooltip key={key} delay={300} closeDelay={0}>
                                                <Tooltip.Trigger>
                                                    <div
                                                        className="w-5 h-5 rounded-sm cursor-pointer"
                                                        style={{ background: themePreview[key] ?? "#000" }}
                                                    />
                                                </Tooltip.Trigger>
                                                <Tooltip.Content>
                                                    <p className="text-xs">{label} {themePreview[key]}</p>
                                                </Tooltip.Content>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
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
                            <span className="text-xs text-muted">Unsaved changes</span>
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
