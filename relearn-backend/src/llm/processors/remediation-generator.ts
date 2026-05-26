import { Worker, Job } from 'bullmq';
import { prisma } from '../../config/database';
import { generateChat, DEFAULT_MODEL } from '../ollama';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

type RemediationJobData = {
  userId: string;
  conceptTags: string[];
};

const SYSTEM_PROMPT = `You are an expert educator. Given concept tags where a student is struggling, generate 5 targeted flashcards that drill the core ideas of each concept from first principles.

Respond with ONLY valid JSON:
{
  "flashcards": [
    { "question": "...", "answer": "...", "difficulty": "medium" }
  ]
}`;

async function processRemediationJob(job: Job<RemediationJobData>) {
  const { userId, conceptTags } = job.data;

  const sourceFlashcards = await prisma.flashcard.findMany({
    where: { userId, conceptTags: { hasSome: conceptTags } },
    take: 5,
    select: { question: true, answer: true, pageId: true },
  });

  const sourceContext = sourceFlashcards
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n')
    .slice(0, 3000);

  const userMessage = `Concept tags the student struggles with: ${conceptTags.join(', ')}

Existing flashcards from their study material:
${sourceContext || '(none yet)'}

Generate 5 targeted remediation flashcards for these weak concepts.`;

  const raw = await generateChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { model: DEFAULT_MODEL }
  );

  let parsed: { flashcards: { question: string; answer: string; difficulty: string }[] };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    logger.error('Remediation worker: failed to parse LLM response', { userId, conceptTags });
    return;
  }

  const pageId = sourceFlashcards[0]?.pageId ?? null;
  if (!pageId) {
    logger.warn('No source page found for remediation cards', { userId, conceptTags });
    return;
  }

  const created = await prisma.flashcard.createMany({
    data: parsed.flashcards.slice(0, 5).map(f => ({
      userId,
      pageId,
      question: f.question,
      answer: f.answer,
      difficulty: ['easy', 'medium', 'hard'].includes(f.difficulty) ? f.difficulty : 'medium',
      conceptTags,
    })),
  });

  logger.info('Remediation cards created', { userId, count: created.count, conceptTags });
}

export const remediationWorker = new Worker<RemediationJobData>(
  'remediation',
  processRemediationJob,
  { connection: redis, concurrency: 2 }
);

remediationWorker.on('failed', (job, err) => {
  logger.error('Remediation job failed', { jobId: job?.id, err });
});
