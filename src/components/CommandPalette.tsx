import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    Kbd,
    SearchField,
    Label,
} from "@heroui/react";
import {
    Search,
} from "lucide-react";
import { isMacOS } from "../lib/utils.ts";
import { useI18n } from "../hooks/i18n.tsx";

export interface CommandAction {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    shortcut?: { abbr?: string; content: string }[];
    category?: string;
    keywords?: string[];
    onSelect: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    actions: CommandAction[];
}

export default function CommandPalette({ isOpen, onOpenChange, actions }: CommandPaletteProps) {
    const t = useI18n();
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Filter actions based on search query
    const filteredActions = useMemo(() => {
        if (!query.trim()) return actions;
        const lowerQuery = query.toLowerCase().trim();
        return actions.filter(
            (action) =>
                action.label.toLowerCase().includes(lowerQuery) ||
                action.description?.toLowerCase().includes(lowerQuery) ||
                action.category?.toLowerCase().includes(lowerQuery) ||
                action.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))
        );
    }, [actions, query]);

    // Group actions by category
    const groupedActions = useMemo(() => {
        const groups = new Map<string, CommandAction[]>();
        for (const action of filteredActions) {
            const category = action.category ?? "";
            if (!groups.has(category)) {
                groups.set(category, []);
            }
            groups.get(category)!.push(action);
        }
        return groups;
    }, [filteredActions]);

    // Total flat list for keyboard navigation
    const flatActions = useMemo(() => {
        const result: CommandAction[] = [];
        for (const [, actions] of groupedActions) {
            result.push(...actions);
        }
        return result;
    }, [groupedActions]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            // Focus the search input after a short delay for the modal animation
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.querySelector(
                `[data-index="${selectedIndex}"]`
            ) as HTMLElement | null;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    const handleSelect = useCallback(
        (index: number) => {
            const action = flatActions[index];
            if (action) {
                action.onSelect();
                onOpenChange(false);
            }
        },
        [flatActions, onOpenChange]
    );

    // Use a native document-level listener while the modal is open.
    // This is more reliable than React onKeyDown because it avoids issues
    // with focus trapping, portal rendering, and SearchField event consumption.
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < flatActions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev > 0 ? prev - 1 : flatActions.length - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    handleSelect(selectedIndex);
                    break;
                case "Escape":
                    if (query) {
                        e.preventDefault();
                        e.stopPropagation();
                        setQuery("");
                    }
                    // If no query, let the modal handle close via its own Escape handler
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [isOpen, flatActions, selectedIndex, handleSelect, query]);

    const modAbbr = isMacOS() ? "command" : "ctrl";

    return (
        <Modal.Backdrop
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            isDismissable={true}
            variant="blur"
        >
            <Modal.Container placement="center">
                <Modal.Dialog className="sm:max-w-lg w-full transition-all duration-200">
                    <Modal.Header className="pb-0">
                        <div className="flex items-center gap-2 w-full">
                            <SearchField
                                className="flex-1"
                                value={query}
                                onChange={(value) => {
                                    setQuery(value);
                                    setSelectedIndex(0);
                                }}
                            >
                                <Label className="sr-only">Search commands</Label>
                                <SearchField.Group>
                                    <SearchField.SearchIcon />
                                    <SearchField.Input
                                        ref={inputRef}
                                        placeholder={t["Type a command or search..."]}
                                    />
                                    <SearchField.ClearButton />
                                    <div className="hidden sm:flex items-center gap-0.5 shrink-0 pr-1 select-none">
                                        <Kbd>
                                            <Kbd.Abbr keyValue={modAbbr} />
                                            <Kbd.Content>Shift</Kbd.Content>
                                            <Kbd.Content>P</Kbd.Content>
                                        </Kbd>
                                    </div>
                                </SearchField.Group>
                            </SearchField>
                        </div>
                    </Modal.Header>
                    <Modal.Body className="max-h-96 overflow-y-auto p-2">
                        {flatActions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted">
                                <Search size={32} className="mb-2 opacity-40" />
                                <p className="text-sm">{t["No commands found"]}</p>
                            </div>
                        ) : (
                            <div ref={listRef} className="flex flex-col">
                                    {Array.from(groupedActions.entries()).map(([category, groupActions]) => (
                                        <div key={category} className="mb-1">
                                            {category ? (
                                                <div className="px-3 py-2 text-xs font-medium text-muted uppercase tracking-wider">
                                                    {category}
                                                </div>
                                            ) : null}
                                            {groupActions.map((action) => {
                                                const index = flatActions.indexOf(action);
                                                const isSelected = index === selectedIndex;
                                                return (
                                                    <div
                                                        key={action.id}
                                                        data-index={index}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? "bg-accent-soft text-accent-soft-foreground"
                                                                : "hover:bg-default/10"
                                                        }`}
                                                        onClick={() => handleSelect(index)}
                                                        onMouseEnter={() => setSelectedIndex(index)}
                                                    >
                                                        <div className={`shrink-0 ${
                                                            isSelected ? "text-accent-soft-foreground" : "text-muted"
                                                        }`}>
                                                            {action.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">
                                                                {action.label}
                                                            </div>
                                                            {action.description && (
                                                                <div className="text-xs text-muted truncate">
                                                                    {action.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {action.shortcut && (
                                                            <div className="hidden sm:flex items-center gap-0.5 shrink-0 select-none">
                                                                {action.shortcut.map((key, i) => (
                                                                    <Kbd key={i}>
                                                                        {key.abbr ? (
                                                                            <Kbd.Abbr
                                                                                // @ts-ignore
                                                                                keyValue={key.abbr}
                                                                            />
                                                                        ) : null}
                                                                        <Kbd.Content>{key.content}</Kbd.Content>
                                                                    </Kbd>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                    </Modal.Body>
                    <Modal.Footer className="pt-0 border-t border-default/10">
                        <div className="flex items-center justify-between w-full text-xs text-muted px-1">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 select-none">
                                    <Kbd>
                                        <Kbd.Abbr keyValue="up" />
                                    </Kbd>
                                    <Kbd>
                                        <Kbd.Abbr keyValue="down" />
                                    </Kbd>
                                    {t["Navigate"]}
                                </span>
                                <span className="flex items-center gap-1 select-none">
                                    <Kbd>
                                        <Kbd.Abbr keyValue="enter" />
                                    </Kbd>
                                    {t["Select"]}
                                </span>
                            </div>
                            <span className="flex items-center gap-1 select-none">
                                <Kbd>
                                    <Kbd.Abbr keyValue="escape" />
                                </Kbd>
                                {t["Close"]}
                            </span>
                        </div>
                    </Modal.Footer>
                </Modal.Dialog>
            </Modal.Container>
        </Modal.Backdrop>
    );
}
