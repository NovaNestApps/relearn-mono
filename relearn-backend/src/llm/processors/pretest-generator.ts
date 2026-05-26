import { generateChat, DEFAULT_MODEL } from '../ollama';

export type PretestQuestion = {
  question: string;
  options: string[];
  correct: string;
};

const SYSTEM_PROMPT = `You are an expert educator. Given only a page title and URL, generate 3 multiple-choice questions that a reader of this page might encounter. The questions should test likely key concepts.

IMPORTANT: Use only the title and URL to infer the topic — do not assume specific facts you don't know.

Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is X?",
      "options": ["A", "B", "C", "D"],
      "correct": "A"
    }
  ]
}`;

export async function generatePretestQuestions(
  url: string,
  title: string
): Promise<PretestQuestion[]> {
  const userMessage = `Page Title: ${title}\nURL: ${url}\n\nGenerate 3 multiple-choice questions about the likely content of this page.`;

  try {
    const raw = await generateChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      { model: DEFAULT_MODEL, temperature: 0.4 }
    );

    const parsed = JSON.parse(raw) as { questions: PretestQuestion[] };
    return parsed.questions.slice(0, 3);
  } catch {
    return [];
  }
}

export function scorePretestAnswers(
  questions: PretestQuestion[],
  answers: string[]
): { correct: boolean[]; score: number } {
  const correct = questions.map((q, i) => answers[i] === q.correct);
  const score = correct.filter(Boolean).length / Math.max(questions.length, 1);
  return { correct, score };
}
