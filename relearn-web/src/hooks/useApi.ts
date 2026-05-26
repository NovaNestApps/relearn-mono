import { api } from "@/lib/api-client";
import type {
    PageItem,
    Summary,
    Flashcard,
    FlashcardReview,
    Quiz,
    ClaimCitation,
    SummaryVerificationResult,
    StudyQueueResponse,
    StudyEvent,
    StudyOutcome,
    StudyItemType,
    MemoryState,
    TeachBackEvaluationResult,
    TeachBackAttempt,
    ConceptMap,
    StudyRoom,
    StudyRoomMode,
    VoiceSession
} from "@/types";

function normalizeClaimsResponse(data: unknown): ClaimCitation[] {
    if (Array.isArray(data)) return data as ClaimCitation[];
    if (data && typeof data === "object" && Array.isArray((data as { claims?: ClaimCitation[] }).claims)) {
        return (data as { claims: ClaimCitation[] }).claims;
    }
    return [];
}

function emptyQueue(): StudyQueueResponse {
    const now = new Date().toISOString();
    return { dueNow: [], newItems: [], overdue: [], total: 0, generatedAt: now };
}

export type RecordStudyEventPayload = {
    userId: string;
    pageId: string;
    itemType: StudyItemType;
    itemId: string;
    outcome: StudyOutcome;
    confidence: number;
    latencyMs: number;
    createdAt?: string;
};

export const PagesApi = {
    list: async (): Promise<PageItem[]> => (await api.get("/pages")).data.pages,
    create: async (payload: { title: string; url: string; content?: string }): Promise<PageItem> =>
        (await api.post("/pages", payload)).data.page,
    remove: async (id: string) => (await api.delete(`/pages/${id}`)).data
};

export const SummariesApi = {
    listByPage: async (pageId: string): Promise<Summary[]> =>
        (await api.get(`/summaries?pageId=${pageId}`)).data,
    get: async (id: string): Promise<Summary> => (await api.get(`/summaries/${id}`)).data,
    generate: async (pageId: string, options?: any): Promise<Summary> =>
        (await api.post(`/summaries`, { pageId, ...options })).data,
    remove: async (id: string) => (await api.delete(`/summaries/${id}`)).data,
    getClaims: async (summaryId: string): Promise<ClaimCitation[]> => {
        const { data } = await api.get(`/summaries/${summaryId}/claims`);
        return normalizeClaimsResponse(data);
    },
    verify: async (summaryId: string): Promise<SummaryVerificationResult> => {
        const { data } = await api.post(`/summaries/${summaryId}/verify`);
        const claims = normalizeClaimsResponse(data);
        if (!claims.length && data && typeof data === "object") {
            return data as SummaryVerificationResult;
        }
        return {
            summaryId,
            verifiedAt: new Date().toISOString(),
            supportedRatio: claims.length
                ? claims.filter((claim) => claim.supported !== false).length / claims.length
                : 0,
            claims
        };
    }
};

export const FlashcardsApi = {
    listByPage: async (pageId: string): Promise<Flashcard[]> =>
        (await api.get(`/flashcards?pageId=${pageId}`)).data,
    generate: async (pageId: string, opts?: any): Promise<{ count: number }> =>
        (await api.post(`/flashcards/generate`, { pageId, ...opts })).data
};

export const FlashcardReviewsApi = {
    create: async (payload: {
        flashcardId: string;
        correct: boolean;
        timeTaken: number;
        confidence: 1 | 2 | 3 | 4;
    }): Promise<FlashcardReview> =>
        (await api.post('/flashcard-reviews', payload)).data.review,
};

export const QuizzesApi = {
    listByPage: async (pageId: string): Promise<Quiz[]> =>
        (await api.get(`/quizzes?pageId=${pageId}`)).data,
    get: async (id: string): Promise<Quiz> => (await api.get(`/quizzes/${id}`)).data,
    generate: async (pageId: string, opts?: any): Promise<Quiz> =>
        (await api.post(`/quizzes/generate`, { pageId, ...opts })).data
};

export const StudyApi = {
    recordEvent: async (payload: RecordStudyEventPayload): Promise<StudyEvent> =>
        (await api.post("/study/events", payload)).data,
    getQueue: async (pageId: string): Promise<StudyQueueResponse> => {
        const { data } = await api.get(`/study/queue?pageId=${pageId}`);
        if (data && typeof data === "object") {
            const queue = data as Partial<StudyQueueResponse>;
            return {
                dueNow: queue.dueNow ?? [],
                newItems: queue.newItems ?? [],
                overdue: queue.overdue ?? [],
                total: queue.total ?? ((queue.dueNow?.length ?? 0) + (queue.newItems?.length ?? 0) + (queue.overdue?.length ?? 0)),
                generatedAt: queue.generatedAt ?? new Date().toISOString()
            };
        }
        return emptyQueue();
    },
    recomputeMemory: async (pageId: string): Promise<{ updated: number; states: MemoryState[] }> =>
        (await api.post("/memory/recompute", { pageId })).data
};

export const TeachBackApi = {
    evaluate: async (pageId: string, transcript: string, mode: "text" | "voice" = "text"): Promise<TeachBackEvaluationResult> => {
        const { data } = await api.post("/teachback/evaluate", { pageId, transcript, mode });
        if (data?.attempt) return data as TeachBackEvaluationResult;

        const fallbackAttempt: TeachBackAttempt = {
            id: crypto.randomUUID(),
            pageId,
            transcript,
            coverageScore: 0,
            misconceptionTags: [],
            createdAt: new Date().toISOString()
        };
        return { attempt: fallbackAttempt, repairFlashcards: [] };
    }
};

export const ConceptMapApi = {
    get: async (pageId: string): Promise<ConceptMap> => {
        const { data } = await api.get(`/concept-map?pageId=${pageId}`);
        if (data && typeof data === "object") {
            const map = data as Partial<ConceptMap>;
            return {
                pageId,
                nodes: map.nodes ?? [],
                edges: map.edges ?? [],
                generatedAt: map.generatedAt
            };
        }
        return { pageId, nodes: [], edges: [], generatedAt: new Date().toISOString() };
    }
};

export const RoomsApi = {
    create: async (pageId: string, mode: StudyRoomMode = "quiz_battle"): Promise<StudyRoom> =>
        (await api.post("/rooms", { pageId, mode })).data,
    join: async (roomId: string): Promise<StudyRoom> =>
        (await api.post(`/rooms/${roomId}/join`)).data
};

export const VoiceApi = {
    createSession: async (pageId: string): Promise<VoiceSession> =>
        (await api.post("/voice/sessions", { pageId })).data
};
