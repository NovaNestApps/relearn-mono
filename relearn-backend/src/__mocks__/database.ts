export const prisma = {
  flashcard: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  flashcardReview: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  page: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  teachBackAttempt: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  pretestAttempt: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  studySession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  concept: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  conceptRelation: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  pageConcept: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
};
