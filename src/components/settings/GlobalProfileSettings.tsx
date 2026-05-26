import {useGlobalConfig} from "../../hooks/config.tsx";
import {useI18n} from "../../hooks/i18n.tsx";
import {useEffect, useMemo, useState} from "react";
import {TerminalRenderOptions} from "../../types/terminal.ts";
import {info} from "@tauri-apps/plugin-log";
import RenderSettings from "./RenderSettings.tsx";
import {Button} from "@heroui/react";

export default function GlobalProfileSettings({ borderColor }: { borderColor: string }) {
    const { config, updateConfig } = useGlobalConfig();
    const t = useI18n();

    const [draft, setDraft] = useState<TerminalRenderOptions>({
        cols: 80,
        rows: 24,
        ...config.globalProfile,
    });

    useEffect(() => {
        setDraft({
            cols: 80,
            rows: 24,
            ...config.globalProfile,
        });
    }, [config.globalProfile]);

    const currentGlobalProfile = config.globalProfile ?? {};
    const isDirty = useMemo(() => {
        return JSON.stringify(draft) !== JSON.stringify({ cols: 80, rows: 24, ...currentGlobalProfile });
    }, [draft, currentGlobalProfile]);

    const updateDraft = (updates: Partial<TerminalRenderOptions>) => {
        setDraft((prev) => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        info("Global profile settings saved");
        const trimmed: TerminalRenderOptions = {
            ...draft,
            fontFamily: draft.fontFamily?.trim() || undefined,
            fontStyle: draft.fontStyle === "italic" ? "italic" : "normal",
            themePath: draft.themePath?.trim() || undefined,
        };
        updateConfig({ globalProfile: trimmed });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pb-4 px-1">
                <h2 className="text-lg font-semibold mb-6">{t["Global Profile"]}</h2>
                <RenderSettings draft={draft} updateDraft={updateDraft} idPrefix="gp" />
            </div>
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
                        <span className="text-xs text-muted">{t["Unsaved changes"]}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
