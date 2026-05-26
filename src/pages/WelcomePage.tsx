import {Button, Card, Input, Label, ListBox, Select, Separator} from "@heroui/react";
import {languageNames, useI18n} from "../hooks/i18n.tsx";
import {useShells} from "../hooks/useShells.ts";
import Icon from "../assets/icon.svg"
import {useGlobalConfig} from "../hooks/config.tsx";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";
import {TerminalProfile} from "../types/terminal.ts";
import {open} from "@tauri-apps/plugin-dialog";
import {invoke} from "@tauri-apps/api/core";
import Confetti from "react-confetti-boom";
import {platform} from "@tauri-apps/plugin-os";
import { info, debug } from "@tauri-apps/plugin-log";

const CUSTOM_EXE = "__custom__";

function Step1({onNext} : {
    onNext: () => void;
}) {
    const {config, updateConfig} = useGlobalConfig();
    const t = useI18n();

    return (
        <Card
            data-tauri-drag-region
            className="flex flex-row items-center justify-between gap-5 select-none w-full h-full p-20 rounded-lg"
        >
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl">
                <img
                    alt="Lumina Terminal"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                    loading="lazy"
                    src={Icon}
                />
            </div>

            <Card.Header className="grow">
                <Card.Title className="font-semibold text-lg">{t["Welcome to Lumina Term"]}</Card.Title>
                <Card.Description>
                    {t["Choose some basic settings and create your first profile now!"]}
                </Card.Description>

                <Separator className="my-3"/>

                <Card.Content>
                    <div className="w-full flex flex-row items-center justify-start">
                        <Select
                            value={config.language}
                            variant="secondary"
                            onChange={(value) => {
                                updateConfig({
                                    // @ts-ignore
                                    language: value ?? config.language
                                });
                                info(`Welcome wizard language changed to: ${value}`);
                            }}
                        >
                            <Label>{t["Language"]}</Label>
                            <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {[...languageNames.keys()].map((language) => (
                                        <ListBox.Item
                                            id={language}
                                            key={language}
                                            textValue={language}
                                        >
                                            {languageNames.get(language)}
                                        </ListBox.Item>
                                    ))}
                                </ListBox>
                            </Select.Popover>
                        </Select>
                    </div>
                </Card.Content>

                <Card.Footer className="flex justify-end">
                    <Button onClick={onNext}>
                        {t["Next"]}
                    </Button>
                </Card.Footer>
            </Card.Header>
        </Card>
    );
}

function Step2({onNext, onPrev} : {
    onNext: (profile: TerminalProfile) => void;
    onPrev: () => void;
}) {
    const t = useI18n();
    const [profile, setProfile] = useState<TerminalProfile>({
        name: t["Untitled Profile"],
        exePath: "",
        rows: 24,
        cols: 80,
    });
    const [exePathExist, setExePathExist] = useState<boolean>(false);
    const shells = useShells();
    const [isCustomExe, setIsCustomExe] = useState(false);

    const selectedShellKey = useMemo(() => {
        if (isCustomExe) return CUSTOM_EXE;
        if (!profile.exePath) return "";
        if (shells.includes(profile.exePath)) return profile.exePath;
        return CUSTOM_EXE;
    }, [profile.exePath, shells, isCustomExe]);

    const onExePathChange = (value: string) => {
        setProfile(prevState => {
            return {
                ...prevState,
                exePath: value,
            };
        });
    };

    const onNameChange = (value: string) => {
        setProfile(prevState => {
            return {
                ...prevState,
                name: value,
            };
        });
    };

    const onRowChange = (value: string) => {
        setProfile(prevState => {
            return {
                ...prevState,
                rows: +value,
            };
        });
    };

    const onColumnChange = (value: string) => {
        setProfile(prevState => {
            return {
                ...prevState,
                cols: +value,
            };
        });
    };

    const selectExePath = async () => {
        const os = platform();
        const exe = await open({
            multiple: false, directory: false, filters: os === "windows" ? [
                {name: "Executable File", extensions: ["exe"]}
            ] : []
        });
        if (exe) {
            info(`Welcome wizard exe path selected: ${exe}`);
            onExePathChange(exe);
        }
    };

    const checkCanNext = useCallback(() => {
        let flag = profile.cols && profile.rows && profile.name && profile.exePath;
        return flag && exePathExist;
    }, [profile, exePathExist]);

    const handleNext = useCallback(() => {
        if (checkCanNext()) {
            onNext(profile);
        }
    }, [profile, checkCanNext]);

    useEffect(() => {
        if (profile.exePath.length === 0) {
            setExePathExist(true);
        } else {
            invoke<boolean>("path_exist", {path: profile.exePath}).then((value) => {
                setExePathExist(value);
            });
        }
    }, [profile]);

    return (
        <Card
            data-tauri-drag-region
            className="flex flex-col items-start justify-center gap-5 select-none w-full h-full p-20 rounded-lg"
        >
            <Card.Header>
                <Card.Title className="font-semibold text-lg">{t["New Profile"]}</Card.Title>
            </Card.Header>

            <Card.Content className="w-full">
                <div className="flex flex-col items-start justify-start w-full gap-4">
                    <div className="flex flex-row items-center justify-between w-full gap-4">
                        <div className="flex flex-col gap-1 grow">
                            <Label htmlFor="input-name" isRequired>{t["Profile Name"]}</Label>
                            <Input
                                id="input-name" value={profile.name} variant="secondary" required
                                onChange={(e) => onNameChange(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="input-row" isRequired>{t["Rows"]}</Label>
                            <Input
                                id="input-row" value={profile.rows}
                                variant="secondary" type="number" min={0} required
                                onChange={(e) => onRowChange(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="input-col" isRequired>{t["Columns"]}</Label>
                            <Input
                                id="input-col" value={profile.cols}
                                variant="secondary" type="number" min={0} required
                                onChange={(e) => onColumnChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <Label htmlFor="input-exe-path" isRequired>{t["Exe Path"]}</Label>
                        <Select
                            selectedKey={selectedShellKey}
                            onSelectionChange={(key) => {
                                const k = key as string;
                                if (k === CUSTOM_EXE) {
                                    setIsCustomExe(true);
                                    onExePathChange("");
                                } else if (k) {
                                    setIsCustomExe(false);
                                    onExePathChange(k);
                                }
                            }}
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
                            <div className="flex flex-row gap-2 mt-1">
                                <Input
                                    required
                                    id="input-exe-path"
                                    className="w-full rounded-xl"
                                    variant="secondary"
                                    value={profile.exePath}
                                    onChange={(e) => onExePathChange(e.target.value)}
                                />
                                <Button
                                    className="rounded-xl"
                                    variant="secondary"
                                    onClick={selectExePath}
                                >
                                    {t["Select"]}
                                </Button>
                            </div>
                        )}
                        <span className="px-1 text-sm text-danger whitespace-pre-wrap">
                            {exePathExist ? " " : t["File not exist"]}
                        </span>
                    </div>
                </div>
            </Card.Content>
            <Card.Footer className="flex w-full justify-between">
                <Button onClick={onPrev} variant="outline">
                    {t["Previous"]}
                </Button>
                <Button onClick={handleNext} isDisabled={!checkCanNext()}>
                    {t["Next"]}
                </Button>
            </Card.Footer>
        </Card>
    );
}

function FinalStep({onFinish, onPrev, display} : {
    onPrev: () => void;
    onFinish: () => void;
    display: boolean
}) {
    const t = useI18n();

    return (
        <Card
            data-tauri-drag-region
            className="flex flex-col items-center justify-center gap-6 select-none w-full h-full p-20 rounded-lg"
        >
            {display && (
                <Confetti
                    particleCount={200}
                    effectInterval={5000}
                    mode="boom"
                />
            )}

            <Card.Header className="w-full items-center justify-center">
                <Card.Title className="text-xl font-semibold">{t["Lumina Term has prepared"]}</Card.Title>
            </Card.Header>

            <Card.Footer className="flex flex-row items-center justify-center gap-6">
                <Button onClick={onPrev} variant="outline">
                    {t["Previous"]}
                </Button>
                <Button onClick={onFinish}>
                    {t["Start Now"]}
                </Button>
            </Card.Footer>
        </Card>
    );
}

export default function WelcomePage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const totalStep = 3;
    const {newProfile} = useGlobalConfig();
    const [step, setStep] = useState<number>(0);
    const [profile, setProfile] = useState<TerminalProfile | null>(null);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                let width = containerRef.current.clientWidth;
                let height = containerRef.current.clientHeight;
                getCurrentWindow().setResizable(false).then();
                getCurrentWindow().setSize(new LogicalSize(width, height)).then();
            }
        };
        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            observer.disconnect();
        };
    }, []);

    const handleNext = () => {
        const nextStep = Math.min(step + 1, totalStep-1);
        debug(`Welcome wizard: step ${step} -> ${nextStep}`);
        setStep(nextStep);
    }

    const handlePrev = () => {
        const prevStep = Math.max(step - 1, 0);
        debug(`Welcome wizard: step ${step} -> ${prevStep}`);
        setStep(prevStep);
    }

    const handleFinish = useCallback(() => {
        if (profile) {
            info(`Welcome wizard finished with profile: ${profile.name}`);
            const defaultProfile = { ...profile, default: true };
            getCurrentWindow().setResizable(true).then(() => {
                newProfile(defaultProfile);
            });
        }
    }, [profile]);

    return (
        <div
            className="w-200 h-100 overflow-hidden bg-transparent select-none relative"
            ref={containerRef}
        >
            <div
                className="h-full flex flex-row transition-transform duration-500"
                style={{ transform: `translateX(-${step*100/totalStep}%)`, width: `${totalStep*100}%` }}
            >
                <div className="h-full flex items-center justify-center" style={{width: `${100/totalStep}%`}}>
                    <Step1 onNext={handleNext}/>
                </div>
                <div className="h-full flex items-center justify-center" style={{width: `${100/totalStep}%`}}>
                    <Step2 onNext={(p) => {
                        setProfile(p);
                        handleNext();
                    }} onPrev={handlePrev}/>
                </div>
                <div className="h-full flex items-center justify-center" style={{width: `${100/totalStep}%`}}>
                    <FinalStep onFinish={handleFinish} onPrev={handlePrev} display={step+1 === totalStep}/>
                </div>
            </div>
        </div>
    );
}
