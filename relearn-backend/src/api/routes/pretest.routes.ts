import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { generatePretestQuestions, scorePretestAnswers } from '../../llm/processors/pretest-generator';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors';

const generateSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  phase: z.enum(['before', 'after']).default('before'),
});

const submitSchema = z.object({
  answers: z.array(z.string()),
  phase: z.enum(['before', 'after']),
});

const pretestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/generate', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = generateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { url, title, phase } = parsed.data;
    const userId = (request as any).user.userId;

    const questions = await generatePretestQuestions(url, title);

    const attempt = await prisma.pretestAttempt.create({
      data: {
        userId,
        url,
        questions: questions as any,
        answers: [] as any,
        phase,
      },
    });

    const questionsWithoutAnswer = questions.map(({ correct: _correct, ...rest }) => rest);

    return reply.send({
      pretestId: attempt.id,
      questions: questionsWithoutAnswer,
    });
  });

  fastify.post('/:id/submit', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { answers, phase } = parsed.data;
    const { id } = request.params as { id: string };
    const userId = (request as any).user.userId;

    const attempt = await prisma.pretestAttempt.findUnique({ where: { id } });
    if (!attempt) throw new NotFoundError('Pretest attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenError();

    const questions = attempt.questions as any[];
    const { correct, score } = scorePretestAnswers(questions, answers);

    await prisma.pretestAttempt.update({
      where: { id },
      data: { answers: answers as any, score, phase },
    });

    return reply.send({ score, correct });
  });
};

export default pretestRoutes;
