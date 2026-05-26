import { createFlashcardChain, extractJSON } from '../langchain';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

interface FlashcardData {
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  conceptTags?: string[];
}

export async function generateFlashcards(
  pageId: string,
  userId: string,
  pageContent: string,
  count: number
): Promise<void> {
  try {
    logger.info(`Generating ${count} flashcards for page: ${pageId}`);
    
    // Truncate content if too long
    const truncatedContent = pageContent.slice(0, 8000);
    
    // Create chain and generate
    const chain = await createFlashcardChain();
    const response = await chain.invoke({ 
      content: truncatedContent, 
      count: count.toString() 
    });
    
    // Parse JSON response
    const flashcards: FlashcardData[] = extractJSON(response);
    
    if (!Array.isArray(flashcards)) {
      throw new Error('Invalid flashcard format received');
    }
    
    // Create flashcards in database
    const created = await prisma.flashcard.createMany({
      data: flashcards.slice(0, count).map(fc => ({
        userId,
        pageId,
        question: fc.question,
        answer: fc.answer,
        difficulty: fc.difficulty || 'medium',
        conceptTags: Array.isArray(fc.conceptTags) ? fc.conceptTags : [],
      })),
    });
    
    logger.info(`✅ Created ${created.count} flashcards for page: ${pageId}`);
  } catch (error) {
    logger.error(`Failed to generate flashcards for page ${pageId}:`, error);
    throw error;
  }
}
