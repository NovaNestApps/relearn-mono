function toBool(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
}

export const featureFlags = {
    adaptiveMemory: toBool(process.env.NEXT_PUBLIC_FEATURE_ADAPTIVE_MEMORY, true),
    sourceVerification: toBool(process.env.NEXT_PUBLIC_FEATURE_SOURCE_VERIFICATION, false),
    teachBack: toBool(process.env.NEXT_PUBLIC_FEATURE_TEACH_BACK, false),
    conceptMap: toBool(process.env.NEXT_PUBLIC_FEATURE_CONCEPT_MAP, false),
    copilot: toBool(process.env.NEXT_PUBLIC_FEATURE_COPILOT, true),
    incrementalReading: toBool(process.env.NEXT_PUBLIC_FEATURE_INCREMENTAL_READING, false),
    voiceStudy: toBool(process.env.NEXT_PUBLIC_FEATURE_VOICE_STUDY, false),
    studyRooms: toBool(process.env.NEXT_PUBLIC_FEATURE_STUDY_ROOMS, false),
    pretesting: toBool(process.env.NEXT_PUBLIC_FEATURE_PRETESTING, true)
} as const;
