import { appDataDir, join } from '@tauri-apps/api/path';
import {CONFIG_SAVE_PATH} from "../constants.ts";
import {openPath} from "@tauri-apps/plugin-opener";

export async function openConfigFile() {
    const dataDir = await appDataDir();
    const configPath = await join(dataDir, CONFIG_SAVE_PATH);
    await openPath(configPath);
}
