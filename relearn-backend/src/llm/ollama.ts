// src/llm/ollama.ts
import { Ollama } from 'ollama';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Initialize Ollama client
export const ollama = new Ollama({
  host: config.ollamaBaseUrl,
});

// Default model configuration
export const DEFAULT_MODEL = 'llama3.2'; // You can change this
export const EMBEDDING_MODEL = 'nomic-embed-text';

// Test Ollama connection
export async function testOllamaConnection(): Promise<boolean> {
  try {
    const response = await ollama.list();
    logger.info('✅ Ollama connected', { 
      models: response.models.map(m => m.name) 
    });
    return true;
  } catch (error) {
    logger.error('❌ Ollama connection failed:', error);
    return false;
  }
}

// Check if model exists, pull if not
export async function ensureModelExists(modelName: string): Promise<void> {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some(m => m.name === modelName);
    
    if (!modelExists) {
      logger.info(`Pulling model: ${modelName}...`);
      await ollama.pull({ model: modelName });
      logger.info(`✅ Model ${modelName} pulled successfully`);
    }
  } catch (error) {
    logger.error(`Failed to ensure model ${modelName}:`, error);
    throw error;
  }
}

// Generate text with streaming support
export async function generateText(
  prompt: string,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options?.model || DEFAULT_MODEL;
  
  try {
    await ensureModelExists(model);
    
    const response = await ollama.generate({
      model,
      prompt,
      system: options?.system,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || 2000,
      },
    });
    
    return response.response;
  } catch (error) {
    logger.error('Ollama generation error:', error);
    throw error;
  }
}

// Generate with chat format (better for conversations)
export async function generateChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options?.model || DEFAULT_MODEL;
  
  try {
    await ensureModelExists(model);
    
    const response = await ollama.chat({
      model,
      messages,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || 2000,
      },
    });
    
    return response.message.content;
  } catch (error) {
    logger.error('Ollama chat error:', error);
    throw error;
  }
}

// Generate embeddings for semantic search
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    await ensureModelExists(EMBEDDING_MODEL);
    
    const response = await ollama.embeddings({
      model: EMBEDDING_MODEL,
      prompt: text,
    });
    
    return response.embedding;
  } catch (error) {
    logger.error('Ollama embedding error:', error);
    throw error;
  }
}