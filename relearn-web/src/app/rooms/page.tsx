"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { RoomsApi } from "@/hooks/useApi";
import { useRealtime } from "@/hooks/useRealtime";
import type { StudyRoom } from "@/types";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { featureFlags } from "@/lib/feature-flags";

export default function RoomsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RoomsPageContent />
        </Suspense>
    );
}

function RoomsPageContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const pageId = params.get("pageId");

    const [roomIdInput, setRoomIdInput] = useState("");
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [mode, setMode] = useState<"quiz_battle" | "flashcard_sprint" | "peer_challenge">("quiz_battle");
    const [err, setErr] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const realtime = useRealtime({ autoConnect: false });

    useEffect(() => {
        if (room?.wsUrl) realtime.connect(room.wsUrl);
        return () => realtime.disconnect();
    }, [room?.wsUrl]);

    if (ready && !user) {
        window.location.href = routes.login;
        return <div>Redirecting...</div>;
    }

    if (!ready) return <div>Loading...</div>;

    if (!featureFlags.studyRooms) {
        return (
            <div className="grid gap-4">
                <a className="btn-secondary w-fit" href={routes.pages}>← Back</a>
                <Card>
                    <h2 className="text-xl font-bold">Study Rooms Disabled</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        Enable `NEXT_PUBLIC_FEATURE_STUDY_ROOMS=true` to activate collaborative room flows.
                    </p>
                </Card>
            </div>
        );
    }

    const createRoom = async () => {
        if (!pageId) {
            setErr("Missing pageId in query. Open rooms from a page context.");
            return;
        }
        setBusy(true);
        setErr(null);
        try {
            const created = await RoomsApi.create(pageId, mode);
            setRoom(created);
            setRoomIdInput(created.id);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to create room");
        } finally {
            setBusy(false);
        }
    };

    const joinRoom = async () => {
        if (!roomIdInput.trim()) return;
        setBusy(true);
        setErr(null);
        try {
            const joined = await RoomsApi.join(roomIdInput.trim());
            setRoom(joined);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to join room");
        } finally {
            setBusy(false);
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        realtime.send({ type: "chat", message: message.trim(), sentAt: new Date().toISOString() });
        setMessage("");
    };

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <a className="btn-secondary" href={pageId ? routes.pageDetails(pageId) : routes.pages}>← Back</a>
                <span className="text-sm text-gray-600">Collaborative Study Rooms</span>
            </div>

            <Card className="grid gap-4">
                <h2 className="text-xl font-bold">Room Controls</h2>
                <div className="grid md:grid-cols-3 gap-3">
                    <select
                        className="input"
                        value={mode}
                        onChange={(e) => setMode(e.target.value as "quiz_battle" | "flashcard_sprint" | "peer_challenge")}
                    >
                        <option value="quiz_battle">Quiz Battle</option>
                        <option value="flashcard_sprint">Flashcard Sprint</option>
                        <option value="peer_challenge">Peer Challenge</option>
                    </select>
                    <button className="btn-primary" onClick={createRoom} disabled={busy || !pageId}>
                        {busy ? "Working..." : "Create Room"}
                    </button>
                    <div className="flex gap-2">
                        <input
                            className="input"
                            placeholder="Room ID"
                            value={roomIdInput}
                            onChange={(e) => setRoomIdInput(e.target.value)}
                        />
                        <button className="btn-secondary" onClick={joinRoom} disabled={busy}>Join</button>
                    </div>
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
            </Card>

            {room && (
                <Card className="grid gap-4">
                    <h3 className="font-semibold">Room {room.id}</h3>
                    <div className="text-sm text-gray-600">Mode: {room.mode} · Status: {room.status}</div>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <h4 className="font-medium mb-2">Participants</h4>
                            {room.participants.length === 0 ? (
                                <p className="text-sm text-gray-500">No participants listed yet.</p>
                            ) : (
                                <div className="grid gap-2">
                                    {room.participants.map((participant) => (
                                        <div key={participant.userId} className="border rounded-lg p-2 text-sm">
                                            {participant.name || participant.userId}
                                            {participant.role ? ` · ${participant.role}` : ""}
                                            {participant.score !== undefined ? ` · Score ${participant.score}` : ""}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Realtime Feed ({realtime.status})</h4>
                            <div className="border rounded-lg p-3 h-44 overflow-auto bg-gray-50 text-sm">
                                {realtime.messages.length === 0 ? (
                                    <p className="text-gray-500">No room events yet.</p>
                                ) : (
                                    realtime.messages.map((entry, index) => (
                                        <div key={`${entry}-${index}`} className="mb-1">{entry}</div>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <input
                                    className="input"
                                    placeholder="Send room message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <button className="btn-secondary" onClick={sendMessage}>Send</button>
                            </div>
                            {realtime.error && <p className="text-xs text-red-600 mt-2">{realtime.error}</p>}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
