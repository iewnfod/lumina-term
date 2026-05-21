import {useGlobalConfig} from "./config.tsx";

import EnUsTrans from "../../translations/en-us.json";
import ZhCnTrans from "../../translations/zh-cn.json";

export type Languages = "en-us" | "zh-cn";

const translations: Record<Languages, typeof EnUsTrans> = {
    "en-us": EnUsTrans,
    "zh-cn": ZhCnTrans,
};

export const languageNames: Map<Languages, string> = new Map([
    ["en-us", "English"],
    ["zh-cn", "简体中文"],
]);

export function useI18n() {
    const {config} = useGlobalConfig();
    if (translations[config.language]) {
        return translations[config.language];
    } else {
        return translations["en-us"];
    }
}
