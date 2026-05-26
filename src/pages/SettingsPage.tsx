import { useCallback, useState } from "react";
import {
    Button,
    Modal,
} from "@heroui/react";
import {
    Plus,
    FileCog,
    Bug,
    Globe,
} from "lucide-react";
import { ITheme } from "@xterm/xterm";
import { useGlobalConfig } from "../hooks/config.tsx";
import { useI18n } from "../hooks/i18n.tsx";
import { TerminalProfile } from "../types/terminal.ts";
import { useSurfaceColors } from "../hooks/surfaceColors.ts";
import { info, debug } from "@tauri-apps/plugin-log";
import ProfileSettings from "../components/settings/ProfileSettings.tsx";
import DeveloperSettings from "../components/settings/DeveloperSettings.tsx";
import GlobalProfileSettings from "../components/settings/GlobalProfileSettings.tsx";
import GeneralSettings from "../components/settings/GeneralSettings.tsx";

type SettingsSection = "general" | "globalProfile" | string;

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

                    {/* Global Profile */}
                    <SidebarItem
                        isSelected={selectedSection === "globalProfile"}
                        onClick={() => handleSectionChange("globalProfile")}
                        colors={colors}
                    >
                        <div className="flex items-center gap-2">
                            <Globe size={15} />
                            <span className="truncate">{t["Global Profile"]}</span>
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
                ) : selectedSection === "globalProfile" ? (
                    <GlobalProfileSettings borderColor={colors.borderColor} />
                ) : selectedSection === "developer" ? (
                    <DeveloperSettings />
                ) : (
                    <ProfileSettings
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
