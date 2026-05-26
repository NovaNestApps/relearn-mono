export type PageItem = {
    id: string;
    title: string;
    url: string;
    createdAt: string;
    wordCount?: number;
    readingTime?: number;
    provider?: string;
};

export type Summary = {
    id: string;
    pageId: string;
    content: string;     // markdown
    createdAt: string;
};

export type Flashcard = {
    id: string;
    pageId: string;
    question: string;
    answer: string;
    tags?: string[];
};

export type FlashcardReview = {
    id: string;
    userId: string;
    flashcardId: string;
    correct: boolean;
    timeTaken: number;
    confidence: 1 | 2 | 3 | 4;
    reviewedAt: string;
};

export type Quiz = {
    id: string;
    pageId: string;
    title: string;
    questions: QuizQuestion[];
    createdAt: string;
};

export type QuizQuestion = {
    id: string;
    type: "mcq" | "boolean" | "short";
    question: string;
    options?: string[];
    answer?: string | boolean | number;
    explanation?: string;
    points?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
};

export type StudyItemType = "flashcard" | "quiz_question" | "teachback" | "voice_turn" | "reading_chunk";

export type StudyOutcome = "know" | "dont_know" | "correct" | "incorrect" | "partial" | "skipped";

export type QueueBucket = "DUE_NOW" | "NEW" | "OVERDUE";

export type StudyEvent = {
    id: string;
    userId: string;
    pageId: string;
    itemType: StudyItemType;
    itemId: string;
    outcome: StudyOutcome;
    confidence: number;
    latencyMs: number;
    createdAt: string;
};

export type MemoryState = {
    itemId: string;
    stability: number;
    difficulty: number;
    dueAt: string;
    intervalDays: number;
    reps: number;
    lapses: number;
};

export type StudyQueueItem = {
    bucket: QueueBucket;
    itemType: StudyItemType;
    itemId: string;
    title?: string;
    excerpt?: string;
    dueAt?: string;
    memoryState?: MemoryState;
};

export type StudyQueueResponse = {
    dueNow: StudyQueueItem[];
    newItems: StudyQueueItem[];
    overdue: StudyQueueItem[];
    total: number;
    generatedAt: string;
};

export type ClaimCitation = {
    claimId: string;
    claimText: string;
    sourceSnippet: string;
    sourceUrl: string;
    startOffset: number;
    endOffset: number;
    confidence: number;
    supported?: boolean;
};

export type SummaryVerificationResult = {
    summaryId: string;
    verifiedAt: string;
    supportedRatio: number;
    claims: ClaimCitation[];
};

export type TeachBackAttempt = {
    id: string;
    pageId: string;
    transcript: string;
    coverageScore: number;
    misconceptionTags: string[];
    createdAt: string;
};

export type TeachBackEvaluationResult = {
    attempt: TeachBackAttempt;
    repairFlashcards: Flashcard[];
};

export type ConceptNode = {
    id: string;
    label: string;
    mastery: number;
    prerequisites: string[];
    relatedItems: string[];
};

export type ConceptEdge = {
    from: string;
    to: string;
};

export type ConceptMap = {
    pageId: string;
    nodes: ConceptNode[];
    edges: ConceptEdge[];
    generatedAt?: string;
};

export type StudyRoomParticipant = {
    userId: string;
    name?: string;
    role?: "HOST" | "PARTICIPANT";
    score?: number;
};

export type StudyRoomMode = "quiz_battle" | "flashcard_sprint" | "peer_challenge";

export type StudyRoomStatus = "LOBBY" | "ACTIVE" | "COMPLETED";

export type StudyRoom = {
    id: string;
    hostUserId: string;
    pageId: string;
    mode: StudyRoomMode;
    status: StudyRoomStatus;
    participants: StudyRoomParticipant[];
    wsUrl?: string;
};

export type VoiceSession = {
    id: string;
    pageId: string;
    status: "created" | "active" | "completed";
    transcript?: string;
    createdAt: string;
};

export type CopilotRecommendation = {
    id: string;
    title: string;
    reason: string;
    href: string;
    priority: number;
};

export type AuthResponse = {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name?: string };
};
