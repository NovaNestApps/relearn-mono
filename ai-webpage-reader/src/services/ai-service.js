/**
 * Unified AI Service
 * Manages all AI providers with automatic fallback.
 *
 * Priority: OpenAI > Chrome AI > WebLLM
 *   - OpenAI: cloud, requires API key, best quality
 *   - Chrome AI: on-device Gemini Nano, free, private
 *   - WebLLM: browser WASM, offline fallback
 */

class AIService {
  constructor() {
    this.providers = {
      openai: new OpenAIService(),
      chromeAI: new ChromeAIService(),
      webllm: new WebLLMService()
    };

    this.activeProvider = null;
    this.initialized = false;
  }

  async initialize() {
    console.log('🔄 Initializing AI Service...');

    const status = {
      openai: await this.providers.openai.checkAvailability(),
      chromeAI: await this.providers.chromeAI.checkAvailability(),
      webllm: await this.providers.webllm.checkAvailability()
    };

    console.log('📊 AI Provider Status:', status);

    // Set active provider based on priority: OpenAI > Chrome AI > WebLLM
    if (status.openai) {
      this.activeProvider = 'openai';
      await this.providers.openai.initialize();
      console.log('✅ Active provider: OpenAI');
    } else if (status.chromeAI) {
      this.activeProvider = 'chromeAI';
      await this.providers.chromeAI.initialize();
      console.log('✅ Active provider: Chrome AI');
    } else if (status.webllm) {
      this.activeProvider = 'webllm';
      console.log('✅ Active provider: WebLLM (lazy init)');
    } else {
      this.activeProvider = null;
      console.log('❌ No AI providers available! Configure an OpenAI API key in settings.');
    }

    this.initialized = true;

    // Return full status including activeProvider
    return this.getStatus();
  }

  async generate(prompt, context) {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerOrder = this.getProviderOrder();
    
    console.log(`🔄 Attempting generation with providers: ${providerOrder.join(' → ')}`);

    for (const providerName of providerOrder) {
      const provider = this.providers[providerName];
      
      try {
        console.log(`⏳ Trying provider: ${provider.name}`);
        const result = await provider.generate(prompt, context);

        if (result.success) {
          console.log(`✅ Success with provider: ${provider.name}`);
          return result;
        }

        console.warn(`⚠️ Provider ${provider.name} failed:`, result.error);
      } catch (error) {
        console.error(`❌ Provider ${providerName} threw error:`, error);
      }
    }

    console.error('❌ All AI providers failed');
    return {
      success: false,
      error: 'All AI providers failed. Please check setup.',
      provider: 'None'
    };
  }

  async *generateStream(prompt, context) {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerOrder = this.getProviderOrder();

    for (const providerName of providerOrder) {
      const provider = this.providers[providerName];
      
      try {
        console.log(`Streaming with provider: ${provider.name}`);
        
        for await (const chunk of provider.generateStream(prompt, context)) {
          yield { chunk, provider: provider.name };
        }
        
        return;
      } catch (error) {
        console.error(`Streaming failed for ${providerName}:`, error);
      }
    }

    throw new Error('All AI providers failed for streaming');
  }

  getProviderOrder() {
    const order = [];
    const priority = ['openai', 'chromeAI', 'webllm'];

    for (const name of priority) {
      const provider = this.providers[name];
      if (provider.available) {
        order.push(name);
      }
    }

    return order;
  }

  getStatus() {
    console.log('📊 AIService: getStatus() called');
    console.log('📊 AIService: activeProvider =', this.activeProvider);

    const status = {
      openai: this.providers.openai.getStatus(),
      chromeAI: this.providers.chromeAI.getStatus(),
      webllm: this.providers.webllm.getStatus(),
      activeProvider: this.activeProvider,
      initialized: this.initialized
    };
    
    console.log('📊 AIService: Returning status:', status);
    
    return status;
  }

  setActiveProvider(providerName) {
    if (this.providers[providerName] && this.providers[providerName].available) {
      this.activeProvider = providerName;
      console.log(`Switched active provider to: ${providerName}`);
      return true;
    }
    return false;
  }

  getActiveProvider() {
    if (this.activeProvider) {
      return this.providers[this.activeProvider].getStatus();
    }
    return null;
  }

  async reinitialize() {
    console.log('🔄 Reinitializing AI Service...');
    this.initialized = false;
    this.activeProvider = null;
    return await this.initialize();
  }

  async destroy() {
    for (const provider of Object.values(this.providers)) {
      await provider.destroy();
    }
    this.activeProvider = null;
    this.initialized = false;
  }
}

// Make available in global scope for service worker
self.AIService = AIService;