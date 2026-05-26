// src/llm/langchain.ts
import { generateChat } from './ollama';

// Simple invoke helper using direct Ollama
async function invokeWithTemplate(template: string, variables: Record<string, string>) {
  let prompt = template;
  
  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  
  return await generateChat([
    { role: 'user', content: prompt }
  ]);
}

// Summarization
export async function createSummarizationChain(type: 'brief' | 'default' | 'detailed') {
  const templates = {
    brief: `You are a concise summarization expert. Create a brief 2-3 sentence summary of the following content.

Content: {content}

Brief Summary:`,
    
    default: `You are a summarization expert. Create a clear and informative summary of the following content.

Content: {content}

Summary:`,
    
    detailed: `You are a detailed summarization expert. Create a comprehensive summary of the following content.

Content: {content}

Detailed Summary:`,
  };
  
  return {
    invoke: (vars: { content: string }) => invokeWithTemplate(templates[type], vars)
  };
}

// Flashcard generation
export async function createFlashcardChain() {
  const template = `You are an educational content expert. Generate {count} flashcards from the following content.
Each flashcard should have a clear question and a concise answer.

Format your response as a JSON array of objects with "question", "answer", "difficulty", and "conceptTags" fields.
Example: [{"question": "What is X?", "answer": "X is...", "difficulty": "medium", "conceptTags": ["concept1", "concept2"]}]

Content: {content}

Generate exactly {count} flashcards in JSON format:`;

  return {
    invoke: (vars: { content: string; count: string }) => invokeWithTemplate(template, vars)
  };
}

// Quiz generation
export async function createQuizChain() {
  const template = `You are a quiz generator expert. Create {count} multiple choice questions from the following content.

Format your response as a JSON array with these fields:
- question: the question text
- options: array of 4 option strings
- correctAnswer: the correct option string (must match one of the options)
- explanation: brief explanation

Example:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correctAnswer": "Paris",
    "explanation": "Paris is the capital of France."
  }
]

Content: {content}

Generate exactly {count} quiz questions in JSON format:`;

  return {
    invoke: (vars: { content: string; count: string }) => invokeWithTemplate(template, vars)
  };
}

// Extract JSON from response
export function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    
    throw new Error('No valid JSON found in response');
  }
}
