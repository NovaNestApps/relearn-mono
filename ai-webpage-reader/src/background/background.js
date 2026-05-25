/**
 * Background Service Worker (UPDATED with Flashcard/Quiz Generation)
 */

// Import all service files
importScripts(
  '../services/chrome-ai.js',
  '../services/openai-service.js',
  '../services/webllm-service.js',
  '../services/ai-service.js'
);

chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening side panel for tab:', tab.id);
  
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('✅ Side panel opened successfully');
  } catch (error) {
    console.error('❌ Failed to open side panel:', error);
  }
});

console.log('✅ Side panel click handler registered');

// Global AI service instance
let aiService = null;
let initializationPromise = null;

/**
 * Initialize AI service
 */
async function initializeAI() {
  if (!aiService) {
    aiService = new AIService();
  }

  if (!initializationPromise) {
    initializationPromise = aiService.initialize();
  }

  return await initializationPromise;
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);

  if (request.action === 'initializeAI') {
    handleInitializeAI(sendResponse);
    return true;
  }

  if (request.action === 'getAIStatus') {
    handleGetAIStatus(sendResponse);
    return true;
  }

  if (request.action === 'readPage') {
    handleReadPage(request.data, sendResponse);
    return true;
  }

  if (request.action === 'askQuestion') {
    handleAskQuestion(request.prompt, request.context, sendResponse);
    return true;
  }

  if (request.action === 'setProvider') {
    handleSetProvider(request.provider, sendResponse);
    return true;
  }

  if (request.action === 'triggerRead') {
    handleTriggerRead(sender, sendResponse);
    return true;
  }

  // NEW: Generate flashcards
  if (request.action === 'generateFlashcards') {
    handleGenerateFlashcards(request.data, sendResponse);
    return true;
  }

  // NEW: Generate quiz
  if (request.action === 'generateQuiz') {
    handleGenerateQuiz(request.data, sendResponse);
    return true;
  }

  if (request.action === 'reinitializeAI') {
    handleReinitializeAI(sendResponse);
    return true;
  }
});

/**
 * Initialize AI services
 */
async function handleInitializeAI(sendResponse) {
  try {
    const status = await initializeAI();
    sendResponse({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('AI initialization failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleReinitializeAI(sendResponse) {
  try {
    if (aiService) {
      await aiService.reinitialize();
    } else {
      await initializeAI();
    }
    sendResponse({ success: true, status: aiService.getStatus() });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get status of all AI providers
 */
async function handleGetAIStatus(sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    const status = aiService.getStatus();
    sendResponse({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Failed to get AI status:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Read and analyze current page
 */
/**
 * Read and analyze current page
 */
async function handleReadPage(pageData, sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    console.log('Processing page:', pageData.title);

    const prompt = `You are an expert content analyst. Analyze the following webpage and create a comprehensive, well-structured summary in markdown format.

WEBPAGE INFORMATION:
Title: ${pageData.title}
URL: ${pageData.url}
Word Count: ~${pageData.wordCount || 'unknown'}

CONTENT:
${pageData.content.substring(0, 15000)}

${pageData.images && pageData.images.length > 0 ? `
IMAGES PRESENT:
${pageData.images.slice(0, 5).map((img, i) => `${i + 1}. ${img.alt || 'Unlabeled image'} (${img.width}x${img.height})`).join('\n')}
` : ''}

INSTRUCTIONS:
Create a detailed, educational summary following this EXACT structure:

# TL;DR
[One compelling sentence that captures the essence - make it engaging and memorable]

# Key Takeaways
[Give most important points as numbered list - be specific and actionable]

## Section Briefs
[Break down the main sections/topics covered - use ** for section names]

### Facts & Numbers
[List any important statistics, dates, figures, or data points - use bullet points]

### Important Concepts
[Explain all key concepts or ideas in detail - use clear language]

### Caveats & Limitations
[Mention any important limitations, biases, or things the article doesn't cover]

FORMATTING RULES:
- Use proper markdown: # for main headers, ## for subheadings, ### for sub-sections
- Use **bold** for emphasis on key terms and names
- Use bullet points (-) or numbered lists (1.) appropriately
- Keep paragraphs concise 
- Use clear, professional language
- Make it scannable and easy to read
- Include specific details, names, and examples from the content
- DO NOT use generic statements - be specific to THIS content

OUTPUT:
Provide ONLY the markdown-formatted summary. Do NOT include any meta-commentary, explanations, or text outside the summary structure.`;

    const result = await aiService.generate(prompt, pageData);

    sendResponse(result);
  } catch (error) {
    console.error('Read page failed:', error);
    sendResponse({
      success: false,
      error: error.message,
      provider: 'None'
    });
  }
}

/**
 * Answer specific question about page
 */
async function handleAskQuestion(prompt, context, sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    console.log('Answering question:', prompt);

    const questionPrompt = `Answer the following question about the page content. Be direct and concise — do NOT generate a summary, flashcards, or quiz. Only answer what was asked.

Question: ${prompt}`;

    const result = await aiService.generate(questionPrompt, context);

    sendResponse(result);
  } catch (error) {
    console.error('Ask question failed:', error);
    sendResponse({
      success: false,
      error: error.message,
      provider: 'None'
    });
  }
}

/**
 * NEW: Generate flashcards from content
 */
async function handleGenerateFlashcards(data, sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    console.log('Generating flashcards for:', data.title);

    // Calculate number of flashcards based on content length
    const contentLength = data.pageContent.length;
    const wordCount = data.wordCount || 0;
    
    let numCards = 5; // minimum
    if (wordCount > 2000) numCards = 15;
    else if (wordCount > 1000) numCards = 10;
    else if (wordCount > 500) numCards = 8;

    const prompt = `Based on the following content, create ${numCards} educational flashcards for studying.

CONTENT:
Title: ${data.title}
${data.pageContent.substring(0, 15000)}

INSTRUCTIONS:
- Create ${numCards} flashcards covering the most important concepts
- Each flashcard should have a clear question/term on the front and a concise answer/definition on the back
- Include relevant tags for each card (2-3 tags per card)
- Assign a difficulty level: "easy", "medium", or "hard"
- Focus on key concepts, definitions, important facts, and relationships

OUTPUT FORMAT (CRITICAL - RESPOND ONLY WITH VALID JSON):
Return ONLY a valid JSON array with no additional text, markdown, or explanations. Example:
[
  {
    "front": "What is photosynthesis?",
    "back": "The process by which plants convert light energy into chemical energy",
    "tags": ["biology", "plants", "energy"],
    "difficulty": "easy"
  },
  {
    "front": "What are the two main stages of photosynthesis?",
    "back": "Light-dependent reactions and the Calvin cycle",
    "tags": ["biology", "photosynthesis", "process"],
    "difficulty": "medium"
  }
]

DO NOT include any text before or after the JSON array. DO NOT use markdown code blocks. Output ONLY the JSON array.`;

    const context = {
      title: data.title,
      content: data.pageContent,
      url: data.url
    };

    const result = await aiService.generate(prompt, context);

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate flashcards');
    }

    // Parse the AI response to extract JSON
    let flashcards = parseFlashcardsResponse(result.response);

    // Validate and clean flashcards
    flashcards = flashcards.filter(card => 
      card.front && card.back && card.front.trim() && card.back.trim()
    );

    if (flashcards.length === 0) {
      throw new Error('No valid flashcards generated. Please try again.');
    }

    console.log(`✅ Generated ${flashcards.length} flashcards`);

    sendResponse({
      success: true,
      flashcards: flashcards,
      provider: result.provider
    });

  } catch (error) {
    console.error('Flashcard generation failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * NEW: Generate quiz from content
 */
async function handleGenerateQuiz(data, sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    console.log('Generating quiz for:', data.title);

    // Calculate number of questions based on content length
    const wordCount = data.wordCount || 0;
    
    let numQuestions = 5; // minimum
    if (wordCount > 2000) numQuestions = 10;
    else if (wordCount > 1000) numQuestions = 8;
    else if (wordCount > 500) numQuestions = 6;

    const prompt = `Based on the following content, create a comprehensive quiz to test understanding.

CONTENT:
Title: ${data.title}
${data.pageContent.substring(0, 15000)}

INSTRUCTIONS:
- Create ${numQuestions} quiz questions covering the main topics
- Use a mix of question types:
  * multiple-choice (4 options each)
  * true-false
  * short-answer (for deeper understanding)
- Assign difficulty: "easy", "medium", or "hard"
- Provide helpful hints for each question
- Include explanations for correct answers
- Award points: easy=1, medium=2, hard=3

OUTPUT FORMAT (CRITICAL - RESPOND ONLY WITH VALID JSON):
Return ONLY a valid JSON object with no additional text, markdown, or explanations. Example:
{
  "title": "Understanding Photosynthesis",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "What is the primary function of chlorophyll?",
      "options": ["Absorb light energy", "Store water", "Produce oxygen", "Create glucose"],
      "correctAnswer": "Absorb light energy",
      "hint": "Think about what happens when light hits the chloroplast",
      "explanation": "Chlorophyll absorbs light energy, primarily in the blue and red wavelengths, which is then used in photosynthesis.",
      "difficulty": "easy",
      "points": 1
    },
    {
      "type": "true-false",
      "question": "Photosynthesis only occurs during the day",
      "correctAnswer": true,
      "hint": "Consider when light is available",
      "explanation": "Photosynthesis requires light energy, so it only occurs when light is present.",
      "difficulty": "easy",
      "points": 1
    },
    {
      "type": "short-answer",
      "question": "Explain how the Calvin cycle contributes to glucose production",
      "correctAnswer": null,
      "sampleAnswer": "The Calvin cycle uses ATP and NADPH from light reactions to fix CO2 into organic molecules, eventually producing glucose through a series of chemical reactions.",
      "hint": "Focus on the role of CO2 and energy molecules",
      "explanation": "The Calvin cycle is the light-independent stage where carbon fixation occurs, using energy from ATP and NADPH to convert CO2 into glucose.",
      "difficulty": "hard",
      "points": 3
    }
  ]
}

DO NOT include any text before or after the JSON. DO NOT use markdown code blocks. Output ONLY the JSON object.`;

    const context = {
      title: data.title,
      content: data.pageContent,
      url: data.url
    };

    const result = await aiService.generate(prompt, context);

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate quiz');
    }

    // Parse the AI response to extract JSON
    let quiz = parseQuizResponse(result.response);

    // Validate quiz
    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('No valid questions generated. Please try again.');
    }

    // Calculate total points
    quiz.totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

    console.log(`✅ Generated quiz with ${quiz.questions.length} questions`);

    sendResponse({
      success: true,
      quiz: quiz,
      provider: result.provider
    });

  } catch (error) {
    console.error('Quiz generation failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Parse flashcards from AI response
 */
function parseFlashcardsResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\n?/g, '');
    cleaned = cleaned.replace(/```\n?/g, '');
    cleaned = cleaned.trim();

    // Try to find JSON array in the response
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const flashcards = JSON.parse(cleaned);

    if (!Array.isArray(flashcards)) {
      throw new Error('Response is not an array');
    }

    // Ensure required fields and set defaults
    return flashcards.map(card => ({
      front: card.front || '',
      back: card.back || '',
      tags: Array.isArray(card.tags) ? card.tags : [],
      difficulty: card.difficulty || 'medium'
    }));

  } catch (error) {
    console.error('Failed to parse flashcards:', error);
    console.log('Raw response:', response);
    throw new Error('Failed to parse AI response. The AI did not return valid JSON.');
  }
}

/**
 * Parse quiz from AI response
 */
function parseQuizResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\n?/g, '');
    cleaned = cleaned.replace(/```\n?/g, '');
    cleaned = cleaned.trim();

    // Try to find JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const quiz = JSON.parse(cleaned);

    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      throw new Error('Invalid quiz structure');
    }

    // Set defaults for quiz
    if (!quiz.title) {
      quiz.title = 'Knowledge Check Quiz';
    }

    // Ensure required fields for each question
    quiz.questions = quiz.questions.map(q => ({
      type: q.type || 'multiple-choice',
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer,
      hint: q.hint || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || 1,
      sampleAnswer: q.sampleAnswer || null
    }));

    return quiz;

  } catch (error) {
    console.error('Failed to parse quiz:', error);
    console.log('Raw response:', response);
    throw new Error('Failed to parse AI response. The AI did not return valid JSON.');
  }
}

/**
 * Manually set active provider
 */
async function handleSetProvider(providerName, sendResponse) {
  try {
    if (!aiService) {
      await initializeAI();
    }

    const success = aiService.setActiveProvider(providerName);
    
    sendResponse({
      success: success,
      message: success ? `Switched to ${providerName}` : `Provider ${providerName} not available`
    });
  } catch (error) {
    console.error('Set provider failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle keyboard shortcut trigger
 */
async function handleTriggerRead(sender, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });

    if (response.success) {
      const result = await handleReadPage(response.data, (result) => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: result.success ? 'Page analyzed!' : 'Analysis failed',
          type: result.success ? 'success' : 'error'
        });
      });
    }

    sendResponse({ success: true });
  } catch (error) {
    console.error('Trigger read failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('Welcome! Initializing Relearn...');
    initializeAI().then(() => {
      console.log('AI services ready');
    });
  }

  if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

/**
 * Keep service worker alive
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, initializing AI services...');
  initializeAI();
});

// Initialize on script load
initializeAI().then(() => {
  console.log('Background script ready');
}).catch((error) => {
  console.error('Background initialization failed:', error);
});