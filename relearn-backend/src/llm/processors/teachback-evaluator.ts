import { generateChat, DEFAULT_MODEL } from '../ollama';

export type TeachBackResult = {
  score: number;
  feedback: string;
  gaps: string[];
  followUpQuestions: string[];
};

const SYSTEM_PROMPT = `You are an expert learning coach. A student has tried to explain a concept from source material in their own words. Your task:

1. Compare the student's explanation against the source material
2. Score the explanation from 0.0 (completely wrong/empty) to 1.0 (perfect understanding)
3. Identify specific concepts the student missed or got wrong
4. Generate 1-2 follow-up questions targeting the weakest gaps

Respond with ONLY valid JSON in this exact format:
{
  "score": 0.75,
  "feedback": "Good coverage of X. You correctly identified Y. However...",
  "gaps": ["concept A was missing", "concept B was incorrect"],
  "followUpQuestions": ["Can you explain how A relates to B?"]
}`;

export async function evaluateTeachBack(
  pageContent: string,
  attemptText: string
): Promise<TeachBackResult> {
  const userMessage = `SOURCE MATERIAL:
${pageContent.slice(0, 3000)}

STUDENT EXPLANATION:
${attemptText}

Evaluate this explanation against the source material.`;

  try {
    const raw = await generateChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      { model: DEFAULT_MODEL, temperature: 0.3 }
    );

    const result = JSON.parse(raw) as TeachBackResult;
    result.score = Math.max(0, Math.min(1, result.score));
    return result;
  } catch {
    return {
      score: 0,
      feedback: 'Could not evaluate explanation. Please try again.',
      gaps: [],
      followUpQuestions: [],
    };
  }
}
