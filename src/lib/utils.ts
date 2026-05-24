import { appDataDir, join } from '@tauri-apps/api/path';
import {CONFIG_SAVE_PATH} from "../constants.ts";
import {openPath} from "@tauri-apps/plugin-opener";
import {platform} from "@tauri-apps/plugin-os";

export async function getConfigFilePath() {
    const dataDir = await appDataDir();
    return await join(dataDir, CONFIG_SAVE_PATH);
}

export async function openConfigFile() {
    const dataDir = await appDataDir();
    const configPath = await join(dataDir, CONFIG_SAVE_PATH);
    await openPath(configPath);
}

export function isMacOS() {
    return platform() === "macos";
}
