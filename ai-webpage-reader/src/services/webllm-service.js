/**
 * WebLLM Service (With Offscreen Document)
 * Uses offscreen document to access WebGPU from service worker
 */

class WebLLMService {
  constructor() {
    this.name = 'WebLLM';
    this.available = false;
    this.offscreenCreated = false;
  }

  /**
   * Ensure offscreen document exists
   */
  async ensureOffscreen() {
    if (this.offscreenCreated) return;
    
    try {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      if (existingContexts.length > 0) {
        this.offscreenCreated = true;
        return;
      }
      
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'Access Chrome AI and WebLLM APIs'
      });
      
      this.offscreenCreated = true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.offscreenCreated = true;
      } else {
        throw error;
      }
    }
  }

  async checkAvailability() {
    try {
      await this.ensureOffscreen();
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'checkWebLLM' 
      });
      
      this.available = response.available;
      console.log(`WebLLM available: ${this.available}`);
      return this.available;
    } catch (error) {
      console.error('WebLLM check failed:', error);
      return false;
    }
  }

  async initialize() {
    return this.available;
  }

  async generate(prompt, context) {
    try {
      await this.ensureOffscreen();
      
      const response = await chrome.runtime.sendMessage({
        action: 'generateWebLLM',
        prompt: prompt,
        context: context
      });
      
      return response;
    } catch (error) {
      console.error('WebLLM generation failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.name
      };
    }
  }

  async *generateStream(prompt, context) {
    const result = await this.generate(prompt, context);
    if (result.success) {
      yield result.response;
    }
  }

  getStatus() {
    return {
      name: this.name,
      available: this.available,
      ready: this.available,
      description: 'In-browser AI - No server needed, works offline'
    };
  }

  async destroy() {
    // Offscreen document persists
  }
}

self.WebLLMService = WebLLMService;