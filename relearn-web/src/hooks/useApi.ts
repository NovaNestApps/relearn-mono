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
    ConceptMap,
    StudyRoom,
    StudyRoomMode,
    VoiceSession
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
