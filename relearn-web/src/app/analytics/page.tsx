"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AnalyticsApi } from "@/hooks/useApi";
import type { WeakSpot } from "@/types";

export default function AnalyticsPage() {
    const { user, ready } = useAuth();
    const [weakspots, setWeakspots] = useState<WeakSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [remediating, setRemediating] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (ready && !user) window.location.href = "/auth/login";
    }, [ready, user]);

    useEffect(() => {
        if (!ready || !user) return;
        AnalyticsApi.getWeakspots()
            .then(data => setWeakspots(data.weakspots))
            .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [ready, user]);

    async function handleRemediation(tag: string) {
        setRemediating(tag);
        setErr(null);
        try {
            await AnalyticsApi.requestRemediation([tag]);
            setNotification(`Drill cards queued for "${tag}". Check your flashcards shortly.`);
            setTimeout(() => setNotification(null), 5000);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : 'Failed to queue remediation');
        } finally {
            setRemediating(null);
        }
    }

    if (!ready || loading) return <div className="p-8 text-gray-500">Loading…</div>;

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Learning Analytics</h1>

            {notification && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">
                    ✓ {notification}
                </div>
            )}

            {err && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    {err}
                </div>
            )}

            <section>
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Weak Spots</h2>
                {weakspots.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                        No data yet. Review some flashcards first — weak spots appear after a few sessions.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {weakspots.map(spot => (
                            <div key={spot.tag} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 truncate">{spot.tag}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${
                                                    spot.accuracy >= 0.7 ? 'bg-green-500' :
                                                    spot.accuracy >= 0.4 ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.max(4, Math.round(spot.accuracy * 100))}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 w-10 text-right shrink-0">
                                            {Math.round(spot.accuracy * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{spot.reviewCount} review{spot.reviewCount !== 1 ? 's' : ''}</p>
                                </div>
                                <button
                                    onClick={() => handleRemediation(spot.tag)}
                                    disabled={remediating === spot.tag}
                                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                                >
                                    {remediating === spot.tag ? 'Queuing…' : 'Drill cards'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
