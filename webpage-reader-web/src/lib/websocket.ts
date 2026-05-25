export function createWS(url: string, protocols?: string | string[]) {
    return protocols ? new WebSocket(url, protocols) : new WebSocket(url);
}

export function toWebSocketUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("ws://") || pathOrUrl.startsWith("wss://")) {
        return pathOrUrl;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    const baseUrl = apiBase ? new URL(apiBase) : (typeof window !== "undefined" ? new URL(window.location.origin) : null);
    if (!baseUrl) return pathOrUrl;

    baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    const basePath = baseUrl.pathname.endsWith("/api")
        ? baseUrl.pathname.slice(0, -4)
        : baseUrl.pathname;

    const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    baseUrl.pathname = `${basePath}${normalizedPath}`;
    baseUrl.search = "";
    baseUrl.hash = "";
    return baseUrl.toString();
}
