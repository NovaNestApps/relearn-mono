import type { Flashcard, MemoryState, QueueBucket, StudyOutcome } from "@/types";

type MemoryById = Record<string, MemoryState>;

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function storageKey(pageId: string): string {
    return `relearn.memory.${pageId}`;
}

export function loadMemoryStates(pageId: string): MemoryById {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(storageKey(pageId));
        if (!raw) return {};
        const parsed = JSON.parse(raw) as MemoryById;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function saveMemoryStates(pageId: string, states: MemoryById): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey(pageId), JSON.stringify(states));
}

export function classifyDueBucket(state: MemoryState | undefined, now = Date.now()): QueueBucket {
    if (!state || !state.dueAt || state.reps === 0) return "NEW";
    const due = new Date(state.dueAt).getTime();
    if (Number.isNaN(due)) return "NEW";
    if (due < now - (6 * 60 * 60 * 1000)) return "OVERDUE";
    if (due <= now) return "DUE_NOW";
    return "NEW";
}

export function updateMemoryState(
    current: MemoryState | undefined,
    itemId: string,
    outcome: StudyOutcome,
    confidence: number,
    now = Date.now()
): MemoryState {
    const safeConfidence = clamp(Math.round(confidence), 1, 5);
    const success = outcome === "know" || outcome === "correct";

    const priorStability = current?.stability ?? 1;
    const priorDifficulty = current?.difficulty ?? 5;
    const priorReps = current?.reps ?? 0;
    const priorLapses = current?.lapses ?? 0;

    const stability = success
        ? priorStability * (1.2 + (safeConfidence * 0.12))
        : Math.max(0.3, priorStability * (0.45 + (safeConfidence * 0.06)));
    const difficulty = success
        ? clamp(priorDifficulty - (safeConfidence * 0.2), 1, 10)
        : clamp(priorDifficulty + ((6 - safeConfidence) * 0.35), 1, 10);

    const intervalDays = success
        ? Math.max(1, Math.round(stability * (safeConfidence / 2.5)))
        : 0;

    return {
        itemId,
        stability: Number(stability.toFixed(2)),
        difficulty: Number(difficulty.toFixed(2)),
        dueAt: new Date(now + (intervalDays * DAY_MS)).toISOString(),
        intervalDays,
        reps: priorReps + 1,
        lapses: priorLapses + (success ? 0 : 1)
    };
}

export function buildFlashcardQueue(cards: Flashcard[], states: MemoryById, now = Date.now()): Record<QueueBucket, Flashcard[]> {
    const buckets: Record<QueueBucket, Flashcard[]> = {
        DUE_NOW: [],
        NEW: [],
        OVERDUE: []
    };

    for (const card of cards) {
        const bucket = classifyDueBucket(states[card.id], now);
        buckets[bucket].push(card);
    }
    return buckets;
}

