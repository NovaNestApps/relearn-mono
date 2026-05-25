import { createSummarizationChain } from '../langchain';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export async function generateSummary(
  summaryId: string,
  pageContent: string,
  type: 'brief' | 'default' | 'detailed'
): Promise<void> {
  try {
    logger.info(`Generating ${type} summary for ID: ${summaryId}`);
    
    // Truncate content if too long (keep first 10000 chars)
    const truncatedContent = pageContent.slice(0, 10000);
    
    // Create chain and generate
    const chain = await createSummarizationChain(type);
    const summary = await chain.invoke({ content: truncatedContent });
    
    // Update database
    await prisma.summary.update({
      where: { id: summaryId },
      data: { content: summary },
    });
    
    logger.info(`✅ Summary generated for ID: ${summaryId}`);
  } catch (error) {
    logger.error(`Failed to generate summary ${summaryId}:`, error);
    
    // Update with error message
    await prisma.summary.update({
      where: { id: summaryId },
      data: { content: 'Failed to generate summary. Please try again.' },
    });
    
    throw error;
  }
}