"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FlashcardsApi, FlashcardReviewsApi } from "@/hooks/useApi";
import type { Flashcard, MemoryState, QueueBucket } from "@/types";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import clsx from "classnames";
import { routes } from "@/lib/routes";
import { buildFlashcardQueue, loadMemoryStates, saveMemoryStates, updateMemoryState } from "@/lib/memory";

const BUCKET_LABEL: Record<QueueBucket, string> = {
    OVERDUE: "Overdue",
    DUE_NOW: "Due Now",
    NEW: "New"
};

const BUCKET_ORDER: QueueBucket[] = ["OVERDUE", "DUE_NOW", "NEW"];

type Outcome = "know" | "dont_know";

export default function StudyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StudyPageContent />
        </Suspense>
    );
}

function StudyPageContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const pageId = params.get("pageId");

    const [cards, setCards] = useState<Flashcard[]>([]);
    const [memoryStates, setMemoryStates] = useState<Record<string, MemoryState>>({});
    const [selectedBucket, setSelectedBucket] = useState<QueueBucket>("DUE_NOW");
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [know, setKnow] = useState<number>(0);
    const [dontKnow, setDontKnow] = useState<number>(0);
    const [done, setDone] = useState(false);
    const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null);
    const [cardStartedAt, setCardStartedAt] = useState(() => Date.now());
    const [err, setErr] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            window.location.href = routes.login;
            return;
        }
        if (!pageId) return;

        let cancelled = false;
        setErr(null);

        const load = async () => {
            try {
                const pageCards = await FlashcardsApi.listByPage(pageId);
                if (cancelled) return;
                setCards(pageCards);
                setMemoryStates(loadMemoryStates(pageId));
            } catch (e: any) {
                if (!cancelled) setErr(e?.response?.data?.message || "Failed to load study cards");
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [ready, user, pageId]);

    const queueByBucket = useMemo(() => {
        return buildFlashcardQueue(cards, memoryStates);
    }, [cards, memoryStates]);

    const bucketCounts = useMemo(() => ({
        OVERDUE: queueByBucket.OVERDUE.length,
        DUE_NOW: queueByBucket.DUE_NOW.length,
        NEW: queueByBucket.NEW.length
    }), [queueByBucket]);

    const availableBuckets = useMemo(
        () => BUCKET_ORDER.filter((bucket) => bucketCounts[bucket] > 0),
        [bucketCounts]
    );

    useEffect(() => {
        if (availableBuckets.length === 0) return;
        if (!availableBuckets.includes(selectedBucket)) {
            setSelectedBucket(availableBuckets[0]);
            setIdx(0);
            setDone(false);
            setPendingOutcome(null);
        }
    }, [availableBuckets, selectedBucket]);

    const bucketCards = queueByBucket[selectedBucket] ?? [];

    useEffect(() => {
        if (idx >= bucketCards.length) {
            setIdx(0);
            setDone(false);
        }
    }, [bucketCards.length, idx]);

    const current = useMemo(() => bucketCards[idx], [bucketCards, idx]);
    const total = bucketCards.length;
    const reviewed = know + dontKnow;
    const progress = total ? (reviewed / total) * 100 : 0;

    const flip = () => setFlipped((f) => !f);

    const refreshQueue = async () => {
        if (!pageId) return;
        setSyncing(true);
        try {
            const pageCards = await FlashcardsApi.listByPage(pageId);
            setCards(pageCards);
        } catch {
            // local memory state remains usable when a refresh fails
        } finally {
            setSyncing(false);
        }
    };

    const submitReview = async (confidence: number) => {
        if (!current || !pageId || !user || !pendingOutcome) return;

        const nextState = updateMemoryState(memoryStates[current.id], current.id, pendingOutcome, confidence);
        const nextStates = { ...memoryStates, [current.id]: nextState };
        setMemoryStates(nextStates);
        saveMemoryStates(pageId, nextStates);

        FlashcardReviewsApi.create({
            flashcardId: current.id,
            correct: pendingOutcome === "know",
            timeTaken: Math.max(0, Date.now() - cardStartedAt),
            confidence: Math.min(4, Math.max(1, confidence)) as 1 | 2 | 3 | 4,
        }).catch(() => {});


        if (pendingOutcome === "know") setKnow((x) => x + 1);
        else setDontKnow((x) => x + 1);

        setPendingOutcome(null);

        if (idx < total - 1) {
            setIdx((i) => i + 1);
            setFlipped(false);
            setCardStartedAt(Date.now());
        } else {
            setDone(true);
        }

        void refreshQueue();
    };

    const reviewNextBucket = () => {
        const next = availableBuckets.find((bucket) => bucket !== selectedBucket);
        if (!next) return;
        setSelectedBucket(next);
        setIdx(0);
        setFlipped(false);
        setDone(false);
        setPendingOutcome(null);
        setKnow(0);
        setDontKnow(0);
    };

    if (!ready) return <div>Loading...</div>;
    if (!pageId) {
        return (
            <Card className="grid gap-3">
                <h2 className="text-xl font-bold">No page selected</h2>
                <p className="text-gray-600">Open study from a saved page to review its flashcards.</p>
                <a className="btn-secondary w-fit" href={routes.pages}>Back to Pages</a>
            </Card>
        );
    }

    if (done) {
        return (
            <div className="grid gap-5">
                <a className="btn-secondary w-fit" href={routes.pageDetails(pageId)}>← Back to Page</a>
                <Card className="grid gap-4">
                    <h2 className="text-xl font-bold">{BUCKET_LABEL[selectedBucket]} Session Complete</h2>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Progress</span>
                            <span className="font-bold">{reviewed} / {total}</span>
                        </div>
                        <Progress value={100} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold">{total}</div>
                            <div className="text-xs text-gray-500">Cards</div>
                        </div>
                        <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-600">{know}</div>
                            <div className="text-xs text-gray-500">Know</div>
                        </div>
                        <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold text-yellow-600">{dontKnow}</div>
                            <div className="text-xs text-gray-500">Need Review</div>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <a className="btn-secondary" href={routes.pageDetails(pageId)}>Back</a>
                        <button className="btn-primary" onClick={() => { setIdx(0); setFlipped(false); setKnow(0); setDontKnow(0); setDone(false); }}>
                            Review Again
                        </button>
                        {availableBuckets.some((bucket) => bucket !== selectedBucket) && (
                            <button className="btn-secondary" onClick={reviewNextBucket}>Review Next Bucket</button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <a className="btn-secondary" href={routes.pageDetails(pageId)}>← Back</a>
                <div className="text-sm text-gray-600">
                    Bucket: {BUCKET_LABEL[selectedBucket]} · Card {Math.min(idx + 1, Math.max(total, 1))} / {Math.max(total, 1)}
                </div>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <Card className="grid gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-2">
                        {BUCKET_ORDER.map((bucket) => (
                            <button
                                key={bucket}
                                className={clsx("btn-secondary text-sm", selectedBucket === bucket && "ring-2 ring-primary")}
                                onClick={() => {
                                    setSelectedBucket(bucket);
                                    setIdx(0);
                                    setFlipped(false);
                                    setDone(false);
                                    setPendingOutcome(null);
                                    setKnow(0);
                                    setDontKnow(0);
                                }}
                            >
                                {BUCKET_LABEL[bucket]} ({bucketCounts[bucket]})
                            </button>
                        ))}
                    </div>
                    <button className="btn-secondary text-sm" onClick={refreshQueue} disabled={syncing}>
                        {syncing ? "Refreshing..." : "Refresh Cards"}
                    </button>
                </div>

                <div>
                    <div className="mb-3"><Progress value={progress} /></div>
                    {current ? (
                        <div
                            className={clsx(
                                "relative w-full min-h-[180px] md:min-h-[220px] cursor-pointer select-none border-2 rounded-xl p-5",
                                "transition-transform",
                                flipped ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"
                            )}
                            onClick={flip}
                            title="Click to flip"
                        >
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{flipped ? "Answer" : "Question"}</div>
                            <div className="text-lg whitespace-pre-wrap">{flipped ? current.answer : current.question}</div>
                            {current.tags && current.tags.length > 0 && flipped && (
                                <div className="mt-3 flex gap-2 flex-wrap">
                                    {current.tags.map((tag) => (
                                        <span key={tag} className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{tag}</span>
                                    ))}
                                </div>
                            )}
                            <div className="absolute bottom-3 right-3 text-xs text-gray-400">Tap to flip</div>
                        </div>
                    ) : (
                        <div className="text-gray-500">No cards in this bucket.</div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                    <button className="btn-secondary" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0 || total === 0}>Previous</button>

                    {!flipped ? (
                        <button className="btn-primary" onClick={flip} disabled={!current}>Show Answer</button>
                    ) : pendingOutcome ? (
                        <div className="grid gap-2">
                            <div className="text-xs text-gray-600 text-center">Confidence 1-5 ({pendingOutcome === "know" ? "Know" : "Don't know"})</div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button key={value} className="btn-secondary px-3" onClick={() => submitReview(value)}>{value}</button>
                                ))}
                                <button className="btn-secondary" onClick={() => setPendingOutcome(null)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button className="btn-secondary" onClick={() => setPendingOutcome("dont_know")} disabled={!current}>Don&apos;t Know</button>
                            <button className="btn-primary" onClick={() => setPendingOutcome("know")} disabled={!current}>Know It</button>
                        </div>
                    )}

                    <button className="btn-secondary" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} disabled={idx >= total - 1 || total === 0}>Next</button>
                </div>
            </Card>
        </div>
    );
}
