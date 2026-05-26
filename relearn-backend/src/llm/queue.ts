// src/llm/queue.ts
import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { generateSummary } from './processors/summarizer';
import { generateFlashcards } from './processors/flashcard-generator';
import { generateQuiz } from './processors/quiz-generator';

// Job data types
interface SummaryJobData {
  summaryId: string;
  pageContent: string;
  type: 'brief' | 'default' | 'detailed';
}

interface FlashcardJobData {
  pageId: string;
  userId: string;
  pageContent: string;
  count: number;
}

interface QuizJobData {
  pageId: string;
  userId: string;
  pageContent: string;
  questionCount: number;
  title?: string;
}

// Create queues
export const summaryQueue = new Queue<SummaryJobData>('summary-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
    },
  },
});

export const flashcardQueue = new Queue<FlashcardJobData>('flashcard-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

export const quizQueue = new Queue<QuizJobData>('quiz-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

// Workers
export const summaryWorker = new Worker<SummaryJobData>(
  'summary-generation',
  async (job: Job<SummaryJobData>) => {
    logger.info(`Processing summary job: ${job.id}`);
    const { summaryId, pageContent, type } = job.data;
    
    await generateSummary(summaryId, pageContent, type);
    
    return { summaryId, success: true };
  },
  {
    connection: redis,
    concurrency: 2, // Process 2 summaries concurrently
  }
);

export const flashcardWorker = new Worker<FlashcardJobData>(
  'flashcard-generation',
  async (job: Job<FlashcardJobData>) => {
    logger.info(`Processing flashcard job: ${job.id}`);
    const { pageId, userId, pageContent, count } = job.data;
    
    await generateFlashcards(pageId, userId, pageContent, count);
    
    return { pageId, count, success: true };
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

export const quizWorker = new Worker<QuizJobData>(
  'quiz-generation',
  async (job: Job<QuizJobData>) => {
    logger.info(`Processing quiz job: ${job.id}`);
    const { pageId, userId, pageContent, questionCount, title } = job.data;
    
    const quizId = await generateQuiz(pageId, userId, pageContent, questionCount, title);
    
    return { pageId, quizId, success: true };
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

// Worker event listeners
summaryWorker.on('completed', (job) => {
  logger.info(`Summary job ${job.id} completed`);
});

summaryWorker.on('failed', (job, err) => {
  logger.error(`Summary job ${job?.id} failed:`, err);
});

flashcardWorker.on('completed', (job) => {
  logger.info(`Flashcard job ${job.id} completed`);
});

flashcardWorker.on('failed', (job, err) => {
  logger.error(`Flashcard job ${job?.id} failed:`, err);
});

quizWorker.on('completed', (job) => {
  logger.info(`Quiz job ${job.id} completed`);
});

quizWorker.on('failed', (job, err) => {
  logger.error(`Quiz job ${job?.id} failed:`, err);
});

interface RemediationJobData {
  userId: string;
  conceptTags: string[];
}

export const remediationQueue = new Queue<RemediationJobData>('remediation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
  },
});

// Graceful shutdown
export async function closeQueues() {
  await summaryQueue.close();
  await flashcardQueue.close();
  await quizQueue.close();
  await remediationQueue.close();
  await summaryWorker.close();
  await flashcardWorker.close();
  await quizWorker.close();
  logger.info('All queues closed');
}