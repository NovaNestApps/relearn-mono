"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { StudyApi, VoiceApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";

export default function VoicePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VoicePageContent />
        </Suspense>
    );
}

function VoicePageContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const pageId = params.get("pageId");

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [transcript, setTranscript] = useState("");
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const recognitionSupported = useMemo(() => {
        if (typeof window === "undefined") return false;
        return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }, []);

    if (ready && !user) {
        window.location.href = routes.login;
        return <div>Redirecting...</div>;
    }

    if (!ready) return <div>Loading...</div>;
    if (!pageId) return <div className="text-red-600">Missing pageId</div>;

    const createSession = async () => {
        setCreating(true);
        setErr(null);
        try {
            const session = await VoiceApi.createSession(pageId);
            setSessionId(session.id);
            setTranscript(session.transcript ?? "");
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to create voice session");
        } finally {
            setCreating(false);
        }
    };

    const saveTurn = async () => {
        if (!user || !transcript.trim()) return;
        setSaving(true);
        setErr(null);
        setSaved(false);
        try {
            await StudyApi.recordEvent({
                userId: user.id,
                pageId,
                itemType: "voice_turn",
                itemId: sessionId ?? "pending-session",
                outcome: "partial",
                confidence: 3,
                latencyMs: transcript.trim().split(/\s+/).length * 200
            });
            setSaved(true);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to persist voice turn");
        } finally {
            setSaving(false);
        }
    };

    const dictate = () => {
        if (!recognitionSupported || typeof window === "undefined") return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onresult = (event: any) => {
            const value = Array.from(event.results)
                .map((result: any) => result[0]?.transcript || "")
                .join(" ");
            setTranscript((prev) => [prev, value].filter(Boolean).join(" ").trim());
        };
        recognition.start();
    };

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <a className="btn-secondary" href={routes.pageDetails(pageId)}>← Back to Page</a>
                <span className="text-sm text-gray-600">Realtime Voice Study Session</span>
            </div>

            <Card className="grid gap-4">
                <h2 className="text-xl font-bold">Voice Tutor</h2>
                <p className="text-sm text-gray-600">
                    Create a voice session, speak your explanation, and store transcript turns into study history.
                </p>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn-primary" onClick={createSession} disabled={creating}>
                        {creating ? "Creating..." : sessionId ? "Recreate Session" : "Create Voice Session"}
                    </button>
                    {recognitionSupported && (
                        <button className="btn-secondary" onClick={dictate}>Dictate</button>
                    )}
                </div>

                {sessionId && <div className="text-xs text-gray-500">Session: {sessionId}</div>}

                <textarea
                    className="input h-44"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Transcript appears here..."
                />

                <div className="flex gap-2 flex-wrap items-center">
                    <button className="btn-primary" onClick={saveTurn} disabled={saving || !transcript.trim()}>
                        {saving ? "Saving..." : "Save Transcript Turn"}
                    </button>
                    {saved && <span className="text-sm text-green-700">Saved to study history.</span>}
                </div>

                {err && <p className="text-sm text-red-600">{err}</p>}
            </Card>
        </div>
    );
}
