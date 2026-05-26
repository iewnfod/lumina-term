import {useGlobalConfig} from "../../hooks/config.tsx";
import {languageNames, useI18n} from "../../hooks/i18n.tsx";
import {useEffect, useMemo, useState} from "react";
import {info} from "@tauri-apps/plugin-log";
import {Button, Label, ListBox, Select, Switch} from "@heroui/react";
import {isMacOS} from "../../lib/utils.ts";

export default function GeneralSettings({ borderColor, openAbout }: { borderColor: string, openAbout: () => void }) {
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
        copyWithCtrl: config.copyWithCtrl ?? false,
    });

    // Reset draft when config changes externally
    useEffect(() => {
        setDraft({
            language: config.language,
            showTabBar: config.showTabBar ?? false,
            closeWindowOnLastTab: config.closeWindowOnLastTab !== false,
            defaultProfile: currentDefault,
            copyWithCtrl: config.copyWithCtrl ?? false,
        });
    }, [config.language, config.showTabBar, config.closeWindowOnLastTab, config.copyWithCtrl, currentDefault]);

    const isDirty =
        draft.language !== config.language ||
        draft.showTabBar !== (config.showTabBar ?? false) ||
        draft.closeWindowOnLastTab !== (config.closeWindowOnLastTab !== false) ||
        draft.copyWithCtrl !== (config.copyWithCtrl ?? false) ||
        draft.defaultProfile !== currentDefault;

    const handleSave = () => {
        info("General settings saved");
        const updated: Partial<typeof config> = {
            language: draft.language,
            showTabBar: draft.showTabBar,
            closeWindowOnLastTab: draft.closeWindowOnLastTab,
            copyWithCtrl: draft.copyWithCtrl,
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
            <div className="flex-1 overflow-y-auto pb-4 px-1 w-full">
                <h2 className="text-lg font-semibold mb-6">{t["General"]}</h2>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                        {/* Language */}
                        <div className="flex flex-col gap-1.5 w-full grow">
                            <Label>{t["Language"]}</Label>
                            <Select
                                selectedKey={draft.language}
                                onSelectionChange={(key) => {
                                    if (key) {
                                        setDraft((prev) => ({ ...prev, language: key as "en-us" | "zh-cn" }));
                                    }
                                }}
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
                        <div className="flex flex-col gap-1.5 w-full grow">
                            <Label>{t["Default Profile"]}</Label>
                            <Select
                                selectedKey={draft.defaultProfile}
                                onSelectionChange={(key) => {
                                    if (key) {
                                        setDraft((prev) => ({ ...prev, defaultProfile: key as string }));
                                    }
                                }}
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
                    </div>

                    {/* Show Tab Bar */}
                    <div className="flex flex-row items-center justify-between">
                        <Label className="cursor-pointer">
                            {t["Show Tab Bar"]}
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
                    <div className="flex flex-row items-center justify-between">
                        <Label className="cursor-pointer">
                            {t["Close Window on Last Tab Closed"]}
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

                    {/* Copy with Ctrl+C (non-macOS only) */}
                    {!isMacOS() && (
                        <div className="flex flex-row items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <Label className="cursor-pointer">
                                    {t["Copy with Ctrl+C"]}
                                </Label>
                                <p className="text-xs text-muted">
                                    {t["Swap Ctrl+C and Ctrl+Shift+C for copy and interrupt on non-macOS systems"]}
                                </p>
                            </div>
                            <Switch
                                isSelected={draft.copyWithCtrl}
                                onChange={(v) => setDraft((prev) => ({ ...prev, copyWithCtrl: v }))}
                            >
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                            </Switch>
                        </div>
                    )}
                </div>
            </div>
            {/* Fixed bottom: Save */}
            <div className="shrink-0 border-t pt-3" style={{ borderColor: borderColor }}>
                <div className="flex items-center gap-3 justify-between">
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
                        onPress={openAbout}
                    >
                        {t["About"]} Lumina Terminal
                    </Button>
                </div>
            </div>
        </div>
    );
}
