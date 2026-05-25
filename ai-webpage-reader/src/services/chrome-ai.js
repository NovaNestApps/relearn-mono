/**
 * Chrome Built-in AI Service (With Offscreen Document)
 * Uses offscreen document to access window.ai from service worker
 */

class ChromeAIService {
  constructor() {
    this.name = 'Chrome AI';
    this.available = false;
    this.offscreenCreated = false;
    console.log('🔧 ChromeAIService: Constructor called');
  }

  /**
   * Ensure offscreen document exists
   */
  async ensureOffscreen() {
    console.log('🔍 ChromeAIService: ensureOffscreen() called');
    console.log('🔍 ChromeAIService: offscreenCreated =', this.offscreenCreated);
    
    if (this.offscreenCreated) {
      console.log('✅ ChromeAIService: Offscreen already created, skipping');
      return;
    }
    
    try {
      console.log('🔍 ChromeAIService: Checking for existing offscreen contexts...');
      
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      console.log('🔍 ChromeAIService: Existing contexts found:', existingContexts.length);
      
      if (existingContexts.length > 0) {
        this.offscreenCreated = true;
        console.log('✅ ChromeAIService: Offscreen document already exists');
        return;
      }
      
      console.log('📄 ChromeAIService: Creating new offscreen document...');
      
      // Create offscreen document
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'Access Chrome AI and WebLLM APIs'
      });
      
      this.offscreenCreated = true;
      console.log('✅ ChromeAIService: Offscreen document created successfully');
    } catch (error) {
      console.error('❌ ChromeAIService: Error in ensureOffscreen:', error);
      console.error('❌ ChromeAIService: Error message:', error.message);
      console.error('❌ ChromeAIService: Error stack:', error.stack);
      
      if (error.message.includes('already exists')) {
        this.offscreenCreated = true;
        console.log('✅ ChromeAIService: Offscreen exists (caught error)');
      } else {
        console.error('❌ ChromeAIService: Failed to create offscreen document');
        throw error;
      }
    }
  }

  async checkAvailability() {
    console.log('🔍 ChromeAIService: checkAvailability() called');
    
    try {
      console.log('📄 ChromeAIService: Ensuring offscreen document...');
      await this.ensureOffscreen();
      
      console.log('📨 ChromeAIService: Sending checkChromeAI message to offscreen...');
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'checkChromeAI' 
      });
      
      console.log('📨 ChromeAIService: Received response from offscreen:', response);
      
      this.available = response.available;
      
      if (this.available) {
        console.log('✅ ChromeAIService: Chrome AI is AVAILABLE');
      } else {
        console.log('❌ ChromeAIService: Chrome AI is NOT AVAILABLE');
        if (response.error) {
          console.log('❌ ChromeAIService: Error reason:', response.error);
        }
      }
      
      return this.available;
    } catch (error) {
      console.error('❌ ChromeAIService: checkAvailability failed:', error);
      console.error('❌ ChromeAIService: Error message:', error.message);
      console.error('❌ ChromeAIService: Error stack:', error.stack);
      this.available = false;
      return false;
    }
  }

  async initialize() {
    console.log('🔧 ChromeAIService: initialize() called');
    console.log('🔧 ChromeAIService: available =', this.available);
    return this.available;
  }

  async generate(prompt, context) {
    console.log('🤖 ChromeAIService: generate() called');
    console.log('🤖 ChromeAIService: available =', this.available);
    
    try {
      await this.ensureOffscreen();
      
      console.log('📨 ChromeAIService: Sending generateChromeAI message...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'generateChromeAI',
        prompt: prompt,
        context: context
      });
      
      console.log('📨 ChromeAIService: Received generation response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ ChromeAIService: generation failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.name
      };
    }
  }

  async *generateStream(prompt, context) {
    console.log('🤖 ChromeAIService: generateStream() called (not implemented)');
    // Streaming not implemented yet
    const result = await this.generate(prompt, context);
    if (result.success) {
      yield result.response;
    }
  }

  getStatus() {
    console.log('📊 ChromeAIService: getStatus() called');
    const status = {
      name: this.name,
      available: this.available,
      ready: this.available,
      description: 'Built-in Chrome AI (Gemini Nano) - Free, fast, private'
    };
    console.log('📊 ChromeAIService: Returning status:', status);
    return status;
  }

  async destroy() {
    console.log('🗑️ ChromeAIService: destroy() called');
    // Offscreen document persists
  }
}

self.ChromeAIService = ChromeAIService;