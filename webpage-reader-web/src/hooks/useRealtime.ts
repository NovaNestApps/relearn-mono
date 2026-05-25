import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWS, toWebSocketUrl } from "@/lib/websocket";

type RealtimeStatus = "idle" | "connecting" | "connected" | "closed" | "error";

type UseRealtimeOptions = {
    url?: string;
    autoConnect?: boolean;
    protocols?: string | string[];
};

export function useRealtime(options: UseRealtimeOptions = {}) {
    const { url, autoConnect = true, protocols } = options;
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<RealtimeStatus>("idle");
    const [messages, setMessages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback((targetUrl?: string) => {
        const source = targetUrl ?? url;
        if (!source) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        setStatus("connecting");
        setError(null);
        const ws = createWS(toWebSocketUrl(source), protocols);
        wsRef.current = ws;

        ws.onopen = () => setStatus("connected");
        ws.onmessage = (event) => {
            setMessages((current) => [...current, String(event.data)]);
        };
        ws.onerror = () => {
            setError("WebSocket connection error");
            setStatus("error");
        };
        ws.onclose = () => setStatus("closed");
    }, [url, protocols]);

    const disconnect = useCallback(() => {
        if (!wsRef.current) return;
        wsRef.current.close();
        wsRef.current = null;
        setStatus("closed");
    }, []);

    const send = useCallback((payload: string | Record<string, unknown>) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        const body = typeof payload === "string" ? payload : JSON.stringify(payload);
        ws.send(body);
        return true;
    }, []);

    useEffect(() => {
        if (!autoConnect || !url) return;
        connect(url);
        return () => {
            if (wsRef.current) wsRef.current.close();
            wsRef.current = null;
        };
    }, [autoConnect, url, connect]);

    return useMemo(() => ({
        status,
        messages,
        error,
        connect,
        disconnect,
        send
    }), [status, messages, error, connect, disconnect, send]);
}
