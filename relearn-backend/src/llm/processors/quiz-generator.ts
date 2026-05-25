import { createQuizChain, extractJSON } from '../langchain';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

interface QuizQuestionData {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export async function generateQuiz(
  pageId: string,
  userId: string,
  pageContent: string,
  questionCount: number,
  title?: string
): Promise<string> {
  try {
    logger.info(`Generating quiz with ${questionCount} questions for page: ${pageId}`);
    
    // Truncate content if too long
    const truncatedContent = pageContent.slice(0, 8000);
    
    // Create chain and generate
    const chain = await createQuizChain();
    const response = await chain.invoke({ 
      content: truncatedContent, 
      count: questionCount.toString() 
    });
    
    // Parse JSON response
    const questions: QuizQuestionData[] = extractJSON(response);
    
    if (!Array.isArray(questions)) {
      throw new Error('Invalid quiz format received');
    }
    
    // Get page title for quiz title
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { title: true },
    });
    
    // Create quiz with questions
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        pageId,
        title: title || `Quiz: ${page?.title || 'Untitled'}`,
        questions: {
          create: questions.slice(0, questionCount).map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        },
      },
      include: {
        questions: true,
      },
    });
    
    logger.info(`✅ Created quiz with ${quiz.questions.length} questions: ${quiz.id}`);
    return quiz.id;
  } catch (error) {
    logger.error(`Failed to generate quiz for page ${pageId}:`, error);
    throw error;
  }
}