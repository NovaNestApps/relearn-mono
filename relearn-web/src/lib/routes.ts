function normalizeBasePath(value?: string | null): string {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed || trimmed === "/") return "";
    const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_APP_BASE_PATH);

export function routePath(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (!BASE_PATH) return normalized;
    if (normalized === "/") return BASE_PATH;
    return `${BASE_PATH}${normalized}`;
}

export function routeWithQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        search.set(key, String(value));
    }
    const suffix = search.toString();
    return suffix ? `${routePath(path)}?${suffix}` : routePath(path);
}

export const routes = {
    home: routePath("/"),
    pages: routePath("/pages"),
    login: routePath("/auth/login"),
    register: routePath("/auth/register"),
    quiz: routePath("/quiz"),
    study: routePath("/study"),
    teachback: routePath("/teachback"),
    voice: routePath("/voice"),
    rooms: routePath("/rooms"),
    pageDetails: (pageId: string) => routePath(`/pages/${pageId}`),
    quizAttempt: (quizId: string) => routeWithQuery("/quiz", { id: quizId }),
    studyPage: (pageId: string) => routeWithQuery("/study", { pageId }),
    teachBackForPage: (pageId: string) => routeWithQuery("/teachback", { pageId }),
    voiceForPage: (pageId: string) => routeWithQuery("/voice", { pageId }),
    roomsForPage: (pageId: string) => routeWithQuery("/rooms", { pageId }),
    graph: routePath("/graph"),
    pageGraph: (pageId: string) => routeWithQuery("/graph", { pageId }),
} as const;

