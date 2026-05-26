import { Worker, Job } from 'bullmq';
import { prisma } from '../../config/database';
import { generateChat, DEFAULT_MODEL } from '../ollama';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

type ConceptJobData = {
  pageId: string;
  userId: string;
  content: string;
  title: string;
};

type ExtractedConcept = {
  name: string;
  description: string;
  relatedTo: string[];
};

const SYSTEM_PROMPT = `You are a knowledge extraction expert. Extract the key concepts from the given text.

For each concept:
- name: short, precise concept name (2-5 words max, lowercase)
- description: one sentence definition
- relatedTo: names of other concepts from your list that this concept connects to

Respond with ONLY valid JSON:
{
  "concepts": [
    {
      "name": "attention mechanism",
      "description": "A technique that lets models focus on relevant parts of input.",
      "relatedTo": ["transformer architecture", "self-attention"]
    }
  ]
}`;

async function processConceptJob(job: Job<ConceptJobData>) {
  const { pageId, userId, content, title } = job.data;

  const userMessage = `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}\n\nExtract 5-10 key concepts.`;

  let raw: string;
  try {
    raw = await generateChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      { model: DEFAULT_MODEL }
    );
  } catch (err) {
    logger.error('Concept extractor: LLM call failed', { pageId, err });
    return;
  }

  let extracted: ExtractedConcept[] = [];
  try {
    const parsed = JSON.parse(raw) as { concepts: ExtractedConcept[] };
    extracted = parsed.concepts.slice(0, 10);
  } catch {
    logger.warn('Failed to parse concept extraction response', { pageId });
    return;
  }

  // Upsert concepts (dedup by userId + name)
  const conceptIds: string[] = [];
  for (const concept of extracted) {
    const row = await prisma.concept.upsert({
      where: { userId_name: { userId, name: concept.name.toLowerCase() } },
      create: { userId, name: concept.name.toLowerCase(), description: concept.description },
      update: { description: concept.description },
    });
    conceptIds.push(row.id);
  }

  // Link concepts to page
  await prisma.pageConcept.createMany({
    data: conceptIds.map(conceptId => ({ pageId, conceptId })),
    skipDuplicates: true,
  });

  // Create relations from relatedTo lists
  for (let i = 0; i < extracted.length; i++) {
    const source = await prisma.concept.findUnique({
      where: { userId_name: { userId, name: extracted[i].name.toLowerCase() } },
    });
    if (!source) continue;

    for (const relatedName of extracted[i].relatedTo) {
      const target = await prisma.concept.findUnique({
        where: { userId_name: { userId, name: relatedName.toLowerCase() } },
      });
      if (!target || target.id === source.id) continue;

      await prisma.conceptRelation.upsert({
        where: { sourceId_targetId: { sourceId: source.id, targetId: target.id } },
        create: { sourceId: source.id, targetId: target.id, relationship: 'related', strength: 0.7 },
        update: {},
      });
    }
  }

  logger.info('Concepts extracted', { pageId, count: extracted.length });
}

export const conceptWorker = new Worker<ConceptJobData>(
  'concepts',
  processConceptJob,
  { connection: redis, concurrency: 2 }
);

conceptWorker.on('failed', (job, err) => {
  logger.error('Concept extraction job failed', { jobId: job?.id, err });
});
