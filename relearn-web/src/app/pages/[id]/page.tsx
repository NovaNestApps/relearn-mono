"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    FlashcardsApi,
    QuizzesApi,
    SummariesApi
} from "@/hooks/useApi";
import type { ClaimCitation, ConceptMap, Flashcard, Quiz, Summary } from "@/types";
import Markdown from "@/components/features/Markdown";
import { routes } from "@/lib/routes";
import { featureFlags } from "@/lib/feature-flags";

export default function PageDetails({ params }: { params: { id: string } }) {
    const pageId = params.id;
    const { user, ready } = useAuth();
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [claims, setClaims] = useState<ClaimCitation[]>([]);
    const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
    const [queueCounts, setQueueCounts] = useState({ dueNow: 0, newItems: 0, overdue: 0 });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [genBusy, setGenBusy] = useState(false);
    const [verifyBusy, setVerifyBusy] = useState(false);
    const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);

    const latest = useMemo(() => summaries[0], [summaries]);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            window.location.href = routes.login;
            return;
        }

        let cancelled = false;
        setLoading(true);
        setErr(null);

        const load = async () => {
            try {
                const [s, f, q] = await Promise.all([
                    SummariesApi.listByPage(pageId),
                    FlashcardsApi.listByPage(pageId),
                    QuizzesApi.listByPage(pageId)
                ]);
                if (cancelled) return;

                setSummaries(s);
                setFlashcards(f);
                setQuizzes(q);
                setQueueCounts({ dueNow: 0, newItems: f.length, overdue: 0 });

                if (featureFlags.sourceVerification && s[0]) {
                    try {
                        const currentClaims = await SummariesApi.getClaims(s[0].id);
                        if (!cancelled) setClaims(currentClaims);
                    } catch {
                        if (!cancelled) setClaims([]);
                    }
                }
            } catch (e: any) {
                if (!cancelled) setErr(e?.response?.data?.message || "Failed to load page details");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [ready, user, pageId]);

    const generateSummary = async () => {
        setGenBusy(true);
        setErr(null);
        try {
            const result = await SummariesApi.generate(pageId, { type: "default" });
            if (result.item) {
                setSummaries((curr) => [result.item as Summary, ...curr.filter((item) => item.id !== result.item?.id)]);
            }
            if (featureFlags.sourceVerification) {
                try {
                    if (result.item?.id) {
                        const currentClaims = await SummariesApi.getClaims(result.item.id);
                        setClaims(currentClaims);
                    }
                } catch {
                    setClaims([]);
                }
            }
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to generate summary");
        } finally {
            setGenBusy(false);
        }
    };

    const deleteSummary = async (id: string) => {
        if (!confirm("Delete this summary?")) return;
        await SummariesApi.remove(id);
        setSummaries((curr) => curr.filter((item) => item.id !== id));
        if (latest?.id === id) {
            setClaims([]);
        }
    };

    const generateFlashcards = async () => {
        setGenBusy(true);
        setErr(null);
        try {
            await FlashcardsApi.generate(pageId, { count: 15 });
            let next = await FlashcardsApi.listByPage(pageId);
            for (let attempt = 0; attempt < 4 && next.length === flashcards.length; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                next = await FlashcardsApi.listByPage(pageId);
            }
            setFlashcards(next);
            setQueueCounts({ dueNow: 0, newItems: next.length, overdue: 0 });
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to generate flashcards");
        } finally {
            setGenBusy(false);
        }
    };

    const generateQuiz = async () => {
        setGenBusy(true);
        setErr(null);
        try {
            const result = await QuizzesApi.generate(pageId, { difficulty: "MEDIUM", questionCount: 10 });
            if (result.item) {
                setQuizzes((curr) => [result.item as Quiz, ...curr.filter((item) => item.id !== result.item?.id)]);
                return;
            }
            if (result.jobId) {
                for (let attempt = 0; attempt < 8; attempt += 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    const status = await QuizzesApi.jobStatus(result.jobId);
                    if (status.item) {
                        setQuizzes((curr) => [status.item as Quiz, ...curr.filter((item) => item.id !== status.item?.id)]);
                        return;
                    }
                    if (status.state === "failed") break;
                }
            }
            const next = await QuizzesApi.listByPage(pageId);
            setQuizzes(next);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to generate quiz");
        } finally {
            setGenBusy(false);
        }
    };

    const verifySummary = async () => {
        if (!latest) return;
        setVerifyBusy(true);
        setErr(null);
        try {
            const result = await SummariesApi.verify(latest.id);
            setClaims(result.claims);
            setLastVerifiedAt(result.verifiedAt);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to verify summary claims");
        } finally {
            setVerifyBusy(false);
        }
    };

    const copilotSuggestions = useMemo(() => {
        const suggestions: { id: string; title: string; reason: string; href: string; priority: number }[] = [];

        if (!latest) {
            suggestions.push({
                id: "summary",
                title: "Generate a fresh summary",
                reason: "Copilot can only reason about mastery and evidence once a summary exists.",
                href: "#generate-summary",
                priority: 1
            });
        }

        if (queueCounts.overdue > 0) {
            suggestions.push({
                id: "overdue",
                title: "Review overdue cards",
                reason: `${queueCounts.overdue} cards are overdue and at highest forgetting risk.`,
                href: routes.studyPage(pageId),
                priority: 0
            });
        }

        if (featureFlags.sourceVerification) {
            const unsupported = claims.filter((claim) => claim.supported === false || !claim.sourceSnippet).length;
            if (unsupported > 0) {
                suggestions.push({
                    id: "verify",
                    title: "Resolve unsupported claims",
                    reason: `${unsupported} summary claims are missing evidence or citation snippets.`,
                    href: "#source-verification",
                    priority: 2
                });
            }
        }

        if (flashcards.length === 0) {
            suggestions.push({
                id: "cards",
                title: "Generate flashcards",
                reason: "No flashcards exist for spaced repetition practice.",
                href: "#generate-flashcards",
                priority: 2
            });
        }

        if (quizzes.length === 0) {
            suggestions.push({
                id: "quiz",
                title: "Generate a quiz",
                reason: "A quiz is needed to calibrate concept mastery.",
                href: "#generate-quiz",
                priority: 3
            });
        }

        if (featureFlags.teachBack && latest) {
            suggestions.push({
                id: "teachback",
                title: "Run a teach-back pass",
                reason: "Explaining in your own words catches shallow understanding.",
                href: routes.teachBackForPage(pageId),
                priority: 2
            });
        }

        return suggestions.sort((a, b) => a.priority - b.priority);
    }, [latest, queueCounts.overdue, claims, flashcards.length, quizzes.length, pageId]);

    if (!ready) return <div>Loading...</div>;

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between">
                <a className="btn-secondary" href={routes.pages}>← Back</a>
                <div className="flex gap-2 flex-wrap justify-end">
                    <button id="generate-summary" className="btn-primary" onClick={generateSummary} disabled={genBusy}>
                        {genBusy ? "Working..." : "Generate Summary"}
                    </button>
                    <button id="generate-flashcards" className="btn-secondary" onClick={generateFlashcards} disabled={genBusy}>
                        {genBusy ? "Working..." : "Generate Flashcards"}
                    </button>
                    <button id="generate-quiz" className="btn-secondary" onClick={generateQuiz} disabled={genBusy}>
                        {genBusy ? "Working..." : "Generate Quiz"}
                    </button>
                    {featureFlags.teachBack && <a className="btn-secondary" href={routes.teachBackForPage(pageId)}>Teach-Back</a>}
                    {featureFlags.voiceStudy && <a className="btn-secondary" href={routes.voiceForPage(pageId)}>Voice</a>}
                    {featureFlags.studyRooms && <a className="btn-secondary" href={routes.roomsForPage(pageId)}>Rooms</a>}
                </div>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            {featureFlags.copilot && (
                <section className="card p-5">
                    <h3 className="font-semibold mb-3">Learning Copilot</h3>
                    {copilotSuggestions.length === 0 ? (
                        <p className="text-gray-600">No urgent actions. Keep practicing to maintain momentum.</p>
                    ) : (
                        <div className="grid gap-3">
                            {copilotSuggestions.map((item) => (
                                <a key={item.id} href={item.href} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">{item.reason}</div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <section className="card p-5 grid gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold">Latest Summary</h3>
                    {featureFlags.sourceVerification && latest && (
                        <button className="btn-secondary" onClick={verifySummary} disabled={verifyBusy}>
                            {verifyBusy ? "Verifying..." : "Verify Claims"}
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading…</p>
                ) : latest ? (
                    <>
                        <Markdown content={latest.content} />
                        <div className="flex gap-2">
                            <button className="btn-secondary" onClick={() => deleteSummary(latest.id)}>Delete Summary</button>
                            {featureFlags.adaptiveMemory && <a className="btn-primary" href={routes.studyPage(pageId)}>Study Queue</a>}
                        </div>
                        {lastVerifiedAt && (
                            <p className="text-xs text-gray-500">Last verified: {new Date(lastVerifiedAt).toLocaleString()}</p>
                        )}
                    </>
                ) : (
                    <p className="text-gray-500">No summary yet.</p>
                )}
            </section>

            {featureFlags.sourceVerification && (
                <section id="source-verification" className="card p-5">
                    <h3 className="font-semibold mb-3">Source Verification</h3>
                    {!latest ? (
                        <p className="text-gray-500">Generate a summary first to enable claim verification.</p>
                    ) : claims.length === 0 ? (
                        <p className="text-gray-500">No claims available yet. Click “Verify Claims” to populate citation links.</p>
                    ) : (
                        <div className="grid gap-3">
                            {claims.map((claim) => {
                                const supported = claim.supported !== false && Boolean(claim.sourceSnippet);
                                return (
                                    <div key={claim.claimId} className="border rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="font-medium">{claim.claimText}</div>
                                            <span className={`text-xs rounded px-2 py-1 ${supported ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                                {supported ? "supported" : "needs evidence"}
                                            </span>
                                        </div>
                                        {claim.sourceSnippet ? (
                                            <p className="text-sm text-gray-700 mt-2">{claim.sourceSnippet}</p>
                                        ) : (
                                            <p className="text-sm text-gray-500 mt-2">No source snippet provided.</p>
                                        )}
                                        <div className="mt-2 text-xs text-gray-500 flex gap-4 flex-wrap">
                                            <span>confidence: {Math.round((claim.confidence ?? 0) * 100)}%</span>
                                            <span>offset: {claim.startOffset} - {claim.endOffset}</span>
                                            {claim.sourceUrl && (
                                                <a className="underline" href={claim.sourceUrl} target="_blank" rel="noreferrer">source</a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {featureFlags.adaptiveMemory && (
                <section className="card p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-semibold">Study Queue</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3 mt-3">
                        <div className="border rounded-lg p-3">
                            <div className="text-xs text-gray-500">Overdue</div>
                            <div className="text-2xl font-bold text-red-600">{queueCounts.overdue}</div>
                        </div>
                        <div className="border rounded-lg p-3">
                            <div className="text-xs text-gray-500">Due now</div>
                            <div className="text-2xl font-bold text-amber-600">{queueCounts.dueNow}</div>
                        </div>
                        <div className="border rounded-lg p-3">
                            <div className="text-xs text-gray-500">New</div>
                            <div className="text-2xl font-bold text-blue-600">{queueCounts.newItems}</div>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <a className="btn-primary" href={routes.studyPage(pageId)}>Open Study Queue</a>
                        {featureFlags.incrementalReading && <button className="btn-secondary" disabled>Incremental Queue (Coming Soon)</button>}
                    </div>
                </section>
            )}

            {featureFlags.conceptMap && (
                <section className="card p-5">
                    <h3 className="font-semibold mb-3">Concept Map</h3>
                    {!conceptMap || conceptMap.nodes.length === 0 ? (
                        <p className="text-gray-500">Concept map will appear after summary analysis.</p>
                    ) : (
                        <div className="grid gap-3">
                            {conceptMap.nodes.map((node) => (
                                <a
                                    key={node.id}
                                    href={`${routes.studyPage(pageId)}&concept=${encodeURIComponent(node.id)}`}
                                    className="border rounded-lg p-3 hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium">{node.label}</div>
                                        <span className="text-xs text-gray-600">mastery: {Math.round(node.mastery * 100)}%</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        prerequisites: {node.prerequisites.length ? node.prerequisites.join(", ") : "none"}
                                    </div>
                                </a>
                            ))}
                            <p className="text-xs text-gray-500">Dependencies tracked: {conceptMap.edges.length}</p>
                        </div>
                    )}
                </section>
            )}

            <section className="card p-5">
                <h3 className="font-semibold mb-3">Quizzes</h3>
                {quizzes.length === 0 ? (
                    <p className="text-gray-500">No quizzes yet.</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        {quizzes.map((quiz) => (
                            <a key={quiz.id} href={routes.quizAttempt(quiz.id)} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                                <div className="font-semibold">{quiz.title}</div>
                                <div className="text-xs text-gray-500">{quiz.questions.length} questions</div>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
