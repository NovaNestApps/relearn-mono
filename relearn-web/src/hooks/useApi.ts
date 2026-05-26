import { api } from "@/lib/api-client";
import type {
    PageItem,
    Summary,
    Flashcard,
    FlashcardReview,
    StudySessionResponse,
    StudySessionResult,
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
    TeachBackResult,
    TeachBackAttemptSummary,
    ConceptMap,
    StudyRoom,
    StudyRoomMode,
    VoiceSession,
    PretestGenerateResponse,
    PretestSubmitResponse,
    WeakSpotsResponse,
    GraphResponse
} from "@/types";

type ApiListEnvelope<T> = {
    data?: T[];
} & Record<string, unknown>;

type ApiItemEnvelope<T> = Record<string, unknown> & {
    jobId?: string;
    message?: string;
};

type BackendQuizQuestion = {
    id: string;
    question: string;
    options?: unknown;
    correctAnswer?: string | number | boolean;
    answer?: string | number | boolean;
    explanation?: string;
    points?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    type?: "mcq" | "boolean" | "short";
};

type BackendQuiz = Omit<Quiz, "questions"> & {
    questions?: BackendQuizQuestion[];
};

export type GenerationResponse<T> = {
    item?: T;
    jobId?: string;
    message?: string;
};

function unwrapList<T>(data: unknown, key: string): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object") {
        const envelope = data as ApiListEnvelope<T>;
        const keyed = envelope[key];
        if (Array.isArray(keyed)) return keyed as T[];
        if (Array.isArray(envelope.data)) return envelope.data;
    }
    return [];
}

function unwrapItem<T>(data: unknown, key: string): T {
    if (data && typeof data === "object" && key in data) {
        return (data as ApiItemEnvelope<T>)[key] as T;
    }
    return data as T;
}

function normalizeOptions(options: unknown): string[] {
    return Array.isArray(options) ? options.map(String) : [];
}

function normalizeAnswer(question: BackendQuizQuestion): string | boolean | number | undefined {
    const answer = question.answer ?? question.correctAnswer;
    const options = normalizeOptions(question.options);
    if (typeof answer === "string" && /^\d+$/.test(answer)) {
        const index = Number(answer);
        return options[index] ?? options[index - 1] ?? answer;
    }
    return answer;
}

function normalizeQuiz(raw: BackendQuiz): Quiz {
    return {
        ...raw,
        questions: (raw.questions ?? []).map((question) => ({
            id: question.id,
            type: question.type ?? "mcq",
            question: question.question,
            options: normalizeOptions(question.options),
            answer: normalizeAnswer(question),
            explanation: question.explanation,
            points: question.points,
            difficulty: question.difficulty
        }))
    };
}

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
    getById: async (id: string): Promise<PageItem> => (await api.get(`/pages/${id}`)).data.page,
    create: async (payload: { title: string; url: string; content?: string }): Promise<PageItem> =>
        (await api.post("/pages", { ...payload, content: payload.content || " " })).data.page,
    remove: async (id: string) => (await api.delete(`/pages/${id}`)).data
};

export const SummariesApi = {
    listByPage: async (pageId: string): Promise<Summary[]> => {
        const { data } = await api.get(`/summaries/page/${pageId}`);
        return unwrapList<Summary>(data, "summaries");
    },
    get: async (id: string): Promise<Summary> => {
        const { data } = await api.get(`/summaries/${id}`);
        return unwrapItem<Summary>(data, "summary");
    },
    generate: async (pageId: string, options?: { type?: "default" | "brief" | "detailed" }): Promise<GenerationResponse<Summary>> => {
        const { data } = await api.post(`/summaries`, { pageId, type: options?.type ?? "default" });
        return {
            item: unwrapItem<Summary>(data, "summary"),
            jobId: data?.jobId,
            message: data?.message
        };
    },
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
    listByPage: async (pageId: string): Promise<Flashcard[]> => {
        const { data } = await api.get(`/flashcards/page/${pageId}`);
        return unwrapList<Flashcard>(data, "flashcards");
    },
    generate: async (pageId: string, opts?: { count?: number }): Promise<GenerationResponse<never>> => {
        const { data } = await api.post(`/flashcards/generate`, { pageId, ...opts });
        return {
            jobId: data?.jobId,
            message: data?.message
        };
    }
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

export const StudySessionApi = {
    create: async (params?: { cardCount?: number; pageIds?: string[] }): Promise<StudySessionResponse> => {
        const query = new URLSearchParams();
        if (params?.cardCount) query.set('cardCount', String(params.cardCount));
        if (params?.pageIds?.length) query.set('pageIds', params.pageIds.join(','));
        const res = await api.get(`/study/session?${query}`);
        return res.data as StudySessionResponse;
    },
    complete: async (sessionId: string, results: StudySessionResult[]): Promise<void> => {
        await api.post(`/study/session/${sessionId}/complete`, { results });
    },
};

export const QuizzesApi = {
    listByPage: async (pageId: string): Promise<Quiz[]> => {
        const { data } = await api.get(`/quizzes?pageId=${pageId}`);
        return unwrapList<BackendQuiz>(data, "quizzes").map(normalizeQuiz);
    },
    get: async (id: string): Promise<Quiz> => {
        const { data } = await api.get(`/quizzes/${id}`);
        return normalizeQuiz(unwrapItem<BackendQuiz>(data, "quiz"));
    },
    generate: async (pageId: string, opts?: { questionCount?: number; difficulty?: "EASY" | "MEDIUM" | "HARD"; title?: string }): Promise<GenerationResponse<Quiz>> => {
        const { data } = await api.post(`/quizzes/generate`, { pageId, ...opts });
        return {
            item: data?.quiz ? normalizeQuiz(data.quiz) : undefined,
            jobId: data?.jobId,
            message: data?.message
        };
    },
    jobStatus: async (jobId: string): Promise<GenerationResponse<Quiz> & { state?: string; progress?: number }> => {
        const { data } = await api.get(`/quizzes/job/${jobId}`);
        return {
            item: data?.quiz ? normalizeQuiz(data.quiz) : undefined,
            jobId: data?.jobId,
            message: data?.message,
            state: data?.state,
            progress: data?.progress
        };
    }
};

// NOTE: StudyApi.recordEvent (/study/events), getQueue (/study/queue), and recomputeMemory
// (/memory/recompute) target backend routes that are not yet implemented.
// These are gated by NEXT_PUBLIC_FEATURE_ADAPTIVE_MEMORY (default: true) but the backend
// stubs are missing. Implement before enabling in production.
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
    // Calls POST /pages/:pageId/teachback and maps TeachBackResult to TeachBackEvaluationResult.
    // `mode` is client-side only (text vs voice dictation); backend receives attemptText regardless.
    evaluate: async (pageId: string, transcript: string, _mode: "text" | "voice" = "text"): Promise<TeachBackEvaluationResult> => {
        const { data } = await api.post(`/pages/${pageId}/teachback`, { attemptText: transcript });
        const result = data as TeachBackResult;
        const attempt: TeachBackAttempt = {
            id: crypto.randomUUID(),
            pageId,
            transcript,
            coverageScore: result.score ?? 0,
            misconceptionTags: result.gaps ?? [],
            createdAt: new Date().toISOString(),
        };
        // repairFlashcards are generated asynchronously by the remediation worker; not returned here
        return { attempt, repairFlashcards: [] };
    },

    submit: async (pageId: string, attemptText: string): Promise<TeachBackResult> => {
        const res = await api.post(`/pages/${pageId}/teachback`, { attemptText });
        return res.data as TeachBackResult;
    },

    getHistory: async (pageId: string): Promise<TeachBackAttemptSummary[]> => {
        const res = await api.get(`/pages/${pageId}/teachback`);
        return (res.data as { attempts: TeachBackAttemptSummary[] }).attempts;
    },
};

// NOTE: ConceptMapApi (/concept-map) targets a backend route that does not yet exist.
// Gated by NEXT_PUBLIC_FEATURE_CONCEPT_MAP (default: false). Implement before enabling.
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

// NOTE: RoomsApi (/rooms) and VoiceApi (/voice/sessions) target backend routes that do not
// yet exist. Gated by NEXT_PUBLIC_FEATURE_STUDY_ROOMS / NEXT_PUBLIC_FEATURE_VOICE_STUDY
// (both default: false). Implement backend routes before enabling these flags.
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

export const PretestApi = {
    generate: async (url: string, title: string, phase: 'before' | 'after' = 'before'): Promise<PretestGenerateResponse> =>
        (await api.post('/pretest/generate', { url, title, phase })).data,
    submit: async (pretestId: string, answers: string[], phase: 'before' | 'after'): Promise<PretestSubmitResponse> =>
        (await api.post(`/pretest/${pretestId}/submit`, { answers, phase })).data,
};

export const AnalyticsApi = {
    getWeakspots: async (): Promise<WeakSpotsResponse> =>
        (await api.get('/analytics/weakspots')).data as WeakSpotsResponse,
    requestRemediation: async (conceptTags: string[]): Promise<{ jobId: string }> =>
        (await api.post('/analytics/remediation', { conceptTags })).data as { jobId: string },
};

export const GraphApi = {
    getGraph: async (): Promise<GraphResponse> =>
        (await api.get('/graph')).data as GraphResponse,
    getPageGraph: async (pageId: string): Promise<GraphResponse> =>
        (await api.get(`/graph/page/${pageId}`)).data as GraphResponse,
};
