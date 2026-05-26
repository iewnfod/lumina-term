import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

let cached: string[] | null = null;
let pending: Promise<string[]> | null = null;

export function useShells(): string[] {
    const [shells, setShells] = useState<string[]>(cached ?? []);

    useEffect(() => {
        if (cached) {
            setShells(cached);
            return;
        }
        if (!pending) {
            pending = invoke<string[]>("find_shells")
                .then((result) => {
                    cached = result;
                    return result;
                })
                .catch(() => {
                    cached = [];
                    return [];
                });
        }
        pending.then(setShells);
    }, []);

    return shells;
}
