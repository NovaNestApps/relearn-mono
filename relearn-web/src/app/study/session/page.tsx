"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StudySessionApi } from "@/hooks/useApi";
import type { StudySessionCard, StudySessionResult } from "@/types";
import { Card } from "@/components/ui/card";

type Phase = "setup" | "studying" | "done";

export default function StudySessionPage() {
    const { user, ready } = useAuth();
    const [phase, setPhase] = useState<Phase>("setup");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [cards, setCards] = useState<StudySessionCard[]>([]);
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [results, setResults] = useState<StudySessionResult[]>([]);
    const [cardStartedAt, setCardStartedAt] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ready && !user) window.location.href = "/auth/login";
    }, [ready, user]);

    async function startSession() {
        setLoading(true);
        setError(null);
        try {
            const data = await StudySessionApi.create({ cardCount: 20 });
            setSessionId(data.sessionId);
            setCards(data.cards);
            setIdx(0);
            setResults([]);
            setFlipped(false);
            setCardStartedAt(Date.now());
            setPhase("studying");
        } catch {
            setError("Failed to load session. Make sure you have saved flashcards.");
        } finally {
            setLoading(false);
        }
    }

    function recordOutcome(correct: boolean) {
        const timeTaken = Date.now() - cardStartedAt;
        const card = cards[idx];
        const entry: StudySessionResult = {
            flashcardId: card.id,
            correct,
            timeTaken,
            confidence: correct ? 3 : 1,
        };
        const next = [...results, entry];
        setResults(next);

        if (idx + 1 >= cards.length) {
            finishSession(next);
        } else {
            setIdx(i => i + 1);
            setFlipped(false);
            setCardStartedAt(Date.now());
        }
    }

    async function finishSession(finalResults: StudySessionResult[]) {
        setPhase("done");
        if (sessionId) {
            await StudySessionApi.complete(sessionId, finalResults).catch(() => {});
        }
    }

    if (!ready) return <div className="p-8">Loading…</div>;

    if (phase === "setup") {
        return (
            <div className="max-w-lg mx-auto p-8 space-y-4">
                <h1 className="text-2xl font-bold">Interleaved Review</h1>
                <p className="text-gray-600">
                    Cards from all your saved pages are mixed together — stronger long-term retention than reviewing one page at a time.
                </p>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    onClick={startSession}
                    disabled={loading}
                    className="btn-primary w-full py-3"
                >
                    {loading ? "Building session…" : "Start Session"}
                </button>
            </div>
        );
    }

    if (phase === "done") {
        const correct = results.filter(r => r.correct).length;
        const byPage: Record<string, { correct: number; total: number }> = {};
        cards.forEach((card, i) => {
            const r = results[i];
            if (!r) return;
            if (!byPage[card.pageId]) byPage[card.pageId] = { correct: 0, total: 0 };
            byPage[card.pageId].total++;
            if (r.correct) byPage[card.pageId].correct++;
        });

        return (
            <div className="max-w-lg mx-auto p-8 space-y-6">
                <h1 className="text-2xl font-bold">Session Complete</h1>
                <p className="text-lg">
                    {correct}/{results.length} correct ({results.length > 0 ? Math.round((correct / results.length) * 100) : 0}%)
                </p>
                <div className="space-y-2">
                    <h2 className="font-semibold text-gray-700">By Page</h2>
                    {Object.entries(byPage).map(([pageId, stats]) => (
                        <div key={pageId} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                            <span className="text-gray-500 truncate">{pageId}</span>
                            <span>{stats.correct}/{stats.total}</span>
                        </div>
                    ))}
                </div>
                <button onClick={startSession} className="btn-primary w-full py-3">
                    New Session
                </button>
            </div>
        );
    }

    const card = cards[idx];

    return (
        <div className="max-w-lg mx-auto p-8 space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
                <span>Card {idx + 1} of {cards.length}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[200px]">
                    Page: {card.pageId}
                </span>
            </div>

            <Card className="min-h-[200px]">
                <div
                    className="flex items-center justify-center p-6 min-h-[200px] cursor-pointer select-none"
                    onClick={() => setFlipped(f => !f)}
                >
                    <p className="text-center text-lg">
                        {flipped ? card.answer : card.question}
                    </p>
                </div>
            </Card>

            <p className="text-center text-xs text-gray-400">
                {flipped ? "Answer" : "Click to reveal answer"}
            </p>

            {flipped && (
                <div className="flex gap-3">
                    <button
                        onClick={() => recordOutcome(false)}
                        className="flex-1 btn-secondary py-3 text-red-600 border-red-200 hover:bg-red-50"
                    >
                        Didn&apos;t know
                    </button>
                    <button
                        onClick={() => recordOutcome(true)}
                        className="flex-1 btn-secondary py-3 text-green-600 border-green-200 hover:bg-green-50"
                    >
                        Got it
                    </button>
                </div>
            )}
        </div>
    );
}
