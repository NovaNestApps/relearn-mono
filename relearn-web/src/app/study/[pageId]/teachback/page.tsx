"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { TeachBackApi } from "@/hooks/useApi";
import type { TeachBackResult, TeachBackAttemptSummary } from "@/types";

export default function TeachBackPage() {
    const { user, ready } = useAuth();
    const params = useParams();
    const pageId = params.pageId as string;

    const [attemptText, setAttemptText] = useState("");
    const [result, setResult] = useState<TeachBackResult | null>(null);
    const [history, setHistory] = useState<TeachBackAttemptSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ready && !user) window.location.href = "/auth/login";
    }, [ready, user]);

    useEffect(() => {
        if (!pageId) return;
        TeachBackApi.getHistory(pageId).then(setHistory).catch(() => {});
    }, [pageId]);

    async function handleSubmit() {
        if (attemptText.trim().length < 30) {
            setError("Write at least 30 characters.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await TeachBackApi.submit(pageId, attemptText);
            setResult(res);
            setHistory(prev => [
                { id: res.attemptId, score: res.score, feedback: res.feedback, gaps: res.gaps, createdAt: new Date().toISOString() },
                ...prev,
            ]);
        } catch {
            setError("Evaluation failed. Make sure Ollama is running.");
        } finally {
            setLoading(false);
        }
    }

    if (!ready) return <div className="p-8">Loading…</div>;

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Teach-Back</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Explain this page in your own words. AI will identify what you missed.
                </p>
            </div>

            {!result ? (
                <div className="space-y-3">
                    <textarea
                        className="input w-full min-h-[180px] text-sm resize-none"
                        placeholder="Write your explanation here without looking at the page..."
                        value={attemptText}
                        onChange={e => setAttemptText(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{attemptText.length} chars (min 30)</span>
                        {error && <span className="text-red-500 text-sm">{error}</span>}
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3">
                        {loading ? "Evaluating…" : "Submit & Evaluate"}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${result.score >= 0.7 ? "text-green-600" : result.score >= 0.4 ? "text-yellow-600" : "text-red-600"}`}>
                            {Math.round(result.score * 100)}%
                        </div>
                        <p className="text-gray-700">{result.feedback}</p>
                    </div>

                    {result.gaps.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="font-semibold text-yellow-800 mb-2">Gaps identified</h3>
                            <ul className="space-y-1">
                                {result.gaps.map((gap, i) => (
                                    <li key={i} className="text-sm text-yellow-700">• {gap}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.followUpQuestions.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">Think about this</h3>
                            {result.followUpQuestions.map((q, i) => (
                                <p key={i} className="text-sm text-blue-700">{q}</p>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => { setResult(null); setAttemptText(""); }}
                        className="btn-secondary w-full py-3"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {history.length > 1 && (
                <div className="space-y-2">
                    <h2 className="font-semibold text-gray-700">Progress</h2>
                    <div className="flex gap-2 flex-wrap">
                        {history.map(a => (
                            <span
                                key={a.id}
                                className={`text-sm px-3 py-1 rounded-full font-medium ${
                                    a.score >= 0.7 ? "bg-green-100 text-green-700" :
                                    a.score >= 0.4 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                }`}
                            >
                                {Math.round(a.score * 100)}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
