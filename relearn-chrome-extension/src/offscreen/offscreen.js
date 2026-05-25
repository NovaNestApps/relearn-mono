/**
 * Offscreen Document for Chrome AI & WebLLM
 * This runs in a hidden page with full web API access
 */

let chromeAISession = null;
let webllmEngine = null;

console.log('🎯 Offscreen document loaded');
console.log('🎯 window.ai available:', typeof window.ai !== 'undefined');
console.log('🎯 window.ai.languageModel available:', typeof window?.ai?.languageModel !== 'undefined');

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', request.action);
  
  if (request.action === 'checkChromeAI') {
    console.log('🔍 Offscreen: Processing checkChromeAI request');
    checkChromeAI().then((result) => {
      console.log('📨 Offscreen: Sending checkChromeAI response:', result);
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'generateChromeAI') {
    console.log('🤖 Offscreen: Processing generateChromeAI request');
    generateWithChromeAI(request.prompt, request.context).then((result) => {
      console.log('📨 Offscreen: Sending generateChromeAI response:', result);
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'checkWebLLM') {
    console.log('🔍 Offscreen: Processing checkWebLLM request');
    checkWebLLM().then((result) => {
      console.log('📨 Offscreen: Sending checkWebLLM response:', result);
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'generateWebLLM') {
    console.log('🤖 Offscreen: Processing generateWebLLM request');
    generateWithWebLLM(request.prompt, request.context).then((result) => {
      console.log('📨 Offscreen: Sending generateWebLLM response:', result);
      sendResponse(result);
    });
    return true;
  }
});

/**
 * Check Chrome AI availability
 */
async function checkChromeAI() {
  console.log('🔍 checkChromeAI: Starting check');
  
  try {
    console.log('🔍 checkChromeAI: window.ai =', window.ai);
    console.log('🔍 checkChromeAI: window.ai.languageModel =', window?.ai?.languageModel);
    
    if (!window?.ai?.languageModel) {
      console.log('❌ checkChromeAI: Chrome AI not available - window.ai.languageModel is missing');
      console.log('❌ checkChromeAI: This could mean:');
      console.log('   1. Chrome AI is not enabled in chrome://flags');
      console.log('   2. You need Chrome Canary/Dev channel');
      console.log('   3. Your Chrome version does not support AI APIs yet');
      return { available: false, error: 'window.ai.languageModel not found' };
    }
    
    console.log('🔍 checkChromeAI: Getting capabilities...');
    const capabilities = await window.ai.languageModel.capabilities();
    console.log('🔍 checkChromeAI: Capabilities:', capabilities);
    console.log('🔍 checkChromeAI: capabilities.available =', capabilities.available);
    
    const available = capabilities.available === 'readily' || capabilities.available === 'after-download';
    
    console.log(`${available ? '✅' : '❌'} checkChromeAI: Chrome AI available:`, available);
    
    if (!available) {
      console.log('❌ checkChromeAI: Chrome AI status:', capabilities.available);
      console.log('   Possible statuses:');
      console.log('   - "readily": Available now');
      console.log('   - "after-download": Needs model download');
      console.log('   - "no": Not available');
    }
    
    return { available, status: capabilities.available };
  } catch (error) {
    console.error('❌ checkChromeAI: Error occurred:', error);
    console.error('❌ checkChromeAI: Error message:', error.message);
    console.error('❌ checkChromeAI: Error stack:', error.stack);
    return { available: false, error: error.message };
  }
}

/**
 * Generate with Chrome AI
 */
async function generateWithChromeAI(prompt, context) {
  console.log('🤖 generateWithChromeAI: Starting generation');
  
  try {
    console.log('🤖 generateWithChromeAI: Checking session...');
    
    if (!chromeAISession) {
      console.log('🤖 generateWithChromeAI: Creating new session...');
      chromeAISession = await window.ai.languageModel.create({
        systemPrompt: `You are a helpful assistant that reads and explains webpages clearly and concisely.`
      });
      console.log('✅ generateWithChromeAI: Session created');
    }
    
    const fullPrompt = `Page: ${context.title}
URL: ${context.url}

Content: ${context.content.substring(0, 8000)}

User request: ${prompt}`;

    console.log('🤖 generateWithChromeAI: Sending prompt to AI...');
    const response = await chromeAISession.prompt(fullPrompt);
    
    console.log('✅ generateWithChromeAI: Generation successful');
    console.log('✅ generateWithChromeAI: Response length:', response.length);
    
    return {
      success: true,
      response: response,
      provider: 'Chrome AI (Gemini Nano)'
    };
  } catch (error) {
    console.error('❌ generateWithChromeAI: Generation failed:', error);
    console.error('❌ generateWithChromeAI: Error message:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check WebLLM availability
 */
async function checkWebLLM() {
  console.log('🔍 checkWebLLM: Starting check');
  
  try {
    console.log('🔍 checkWebLLM: navigator.gpu =', navigator.gpu);
    
    if (!navigator.gpu) {
      console.log('❌ checkWebLLM: WebGPU not supported');
      return { available: false, error: 'WebGPU not supported' };
    }
    
    console.log('🔍 checkWebLLM: Requesting GPU adapter...');
    const adapter = await navigator.gpu.requestAdapter();
    console.log('🔍 checkWebLLM: Adapter:', adapter);
    
    const available = !!adapter;
    
    console.log(`${available ? '✅' : '❌'} checkWebLLM: WebLLM available:`, available);
    return { available };
  } catch (error) {
    console.error('❌ checkWebLLM: Check failed:', error);
    console.error('❌ checkWebLLM: Error message:', error.message);
    return { available: false, error: error.message };
  }
}

/**
 * Generate with WebLLM
 */
async function generateWithWebLLM(prompt, context) {
  console.log('🤖 generateWithWebLLM: Starting generation');
  
  try {
    if (!webllmEngine) {
      console.log('🤖 generateWithWebLLM: Loading WebLLM engine (first time may take a few minutes)...');
      const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
      webllmEngine = await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (progress) => {
          console.log('🤖 WebLLM loading progress:', progress);
        }
      });
      console.log('✅ generateWithWebLLM: Engine loaded');
    }
    
    const messages = [
      { 
        role: 'system', 
        content: 'You are a helpful assistant that reads and explains webpages clearly and concisely.' 
      },
      { 
        role: 'user', 
        content: `Page: ${context.title}\n\n${context.content.substring(0, 6000)}\n\nUser: ${prompt}` 
      }
    ];
    
    console.log('🤖 generateWithWebLLM: Generating response...');
    const response = await webllmEngine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    console.log('✅ generateWithWebLLM: Generation successful');
    
    return {
      success: true,
      response: response.choices[0].message.content,
      provider: 'WebLLM (Browser)'
    };
  } catch (error) {
    console.error('❌ generateWithWebLLM: Generation failed:', error);
    console.error('❌ generateWithWebLLM: Error message:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

console.log('✅ Offscreen document ready');