"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { TeachBackApi } from "@/hooks/useApi";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";

export default function TeachBackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TeachBackPageContent />
        </Suspense>
    );
}

function TeachBackPageContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const pageId = params.get("pageId");

    const [transcript, setTranscript] = useState("");
    const [evaluating, setEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Awaited<ReturnType<typeof TeachBackApi.evaluate>> | null>(null);
    const [listening, setListening] = useState(false);

    const recognitionSupported = useMemo(() => {
        if (typeof window === "undefined") return false;
        const speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        return Boolean(speech);
    }, []);

    if (ready && !user) {
        window.location.href = routes.login;
        return <div>Redirecting...</div>;
    }

    if (!ready) return <div>Loading...</div>;
    if (!pageId) return <div className="text-red-600">Missing pageId</div>;

    const startDictation = () => {
        if (!recognitionSupported || typeof window === "undefined") return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => setListening(true);
        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);
        recognition.onresult = (event: any) => {
            const value = Array.from(event.results)
                .map((result: any) => result[0]?.transcript || "")
                .join(" ");
            setTranscript((prev) => [prev, value].filter(Boolean).join(" ").trim());
        };

        recognition.start();
    };

    const evaluate = async () => {
        const trimmed = transcript.trim();
        if (!trimmed) {
            setError("Please explain the concept first.");
            return;
        }

        setEvaluating(true);
        setError(null);
        try {
            const response = await TeachBackApi.evaluate(pageId, trimmed, "text");
            setResult(response);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Teach-back evaluation failed");
        } finally {
            setEvaluating(false);
        }
    };

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <a className="btn-secondary" href={routes.pageDetails(pageId)}>← Back to Page</a>
                <span className="text-sm text-gray-600">Teach-Back Tutor Mode</span>
            </div>

            <Card className="grid gap-4">
                <h2 className="text-xl font-bold">Explain What You Learned</h2>
                <p className="text-sm text-gray-600">
                    Describe the topic in your own words. Relearn will score concept coverage and generate repair cards.
                </p>
                <textarea
                    className="input h-44"
                    placeholder="Start explaining the key concepts, examples, and dependencies..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                />

                <div className="flex gap-2 flex-wrap">
                    <button className="btn-primary" onClick={evaluate} disabled={evaluating}>
                        {evaluating ? "Evaluating..." : "Evaluate Teach-Back"}
                    </button>
                    {recognitionSupported && (
                        <button className="btn-secondary" onClick={startDictation} disabled={listening}>
                            {listening ? "Listening..." : "Dictate"}
                        </button>
                    )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </Card>

            {result && (
                <Card className="grid gap-4">
                    <h3 className="font-semibold">Evaluation Result</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div className="border rounded-lg p-3">
                            <div className="text-xs text-gray-500">Coverage Score</div>
                            <div className="text-3xl font-bold text-green-700">{Math.round(result.attempt.coverageScore * 100)}%</div>
                        </div>
                        <div className="border rounded-lg p-3">
                            <div className="text-xs text-gray-500">Misconceptions</div>
                            <div className="text-sm mt-1">
                                {result.attempt.misconceptionTags.length
                                    ? result.attempt.misconceptionTags.join(", ")
                                    : "None detected"}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Repair Flashcards</h4>
                        {result.repairFlashcards.length === 0 ? (
                            <p className="text-sm text-gray-500">No remediation cards returned.</p>
                        ) : (
                            <div className="grid gap-2">
                                {result.repairFlashcards.map((card) => (
                                    <div key={card.id} className="border rounded-lg p-3">
                                        <div className="font-medium">{card.question}</div>
                                        <div className="text-sm text-gray-600 mt-1">{card.answer}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
