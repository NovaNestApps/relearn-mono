/**
 * OpenAI Service
 * Connects to OpenAI API for summarization, Q&A, flashcards, and quizzes.
 *
 * Models:
 *   Summarization / Q&A  → gpt-4o-mini  (fast, cheap, excellent quality)
 *   Flashcards / Quizzes → gpt-4o-mini  (reliable structured JSON output)
 *   Override via setModel() for gpt-4o if higher quality is needed.
 */

class OpenAIService {
  constructor() {
    this.name = 'OpenAI';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini';
    this.available = false;
    this.apiKey = null;
    this.maxTokens = 4096;
    this.contextWindow = 128000;
  }

  async checkAvailability() {
    try {
      const config = await this._loadConfig();
      if (!config || !config.apiKey) {
        console.log('OpenAI: No API key configured');
        return false;
      }
      this.apiKey = config.apiKey;
      if (config.model) this.model = config.model;

      this.available = true;
      console.log(`✅ OpenAI available. Model: ${this.model}`);
      return true;
    } catch (error) {
      console.log('OpenAI: checkAvailability error:', error.message);
      return false;
    }
  }

  async initialize() {
    return this.available;
  }

  async generate(prompt, context) {
    if (!this.apiKey) {
      return { success: false, error: 'OpenAI API key not configured', provider: this.name };
    }

    try {
      const messages = this._buildMessages(prompt, context);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const msg = err?.error?.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API error: ${msg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error('OpenAI returned empty response');

      console.log(`✅ OpenAI generation success. Tokens used: ${data.usage?.total_tokens ?? '?'}`);
      return {
        success: true,
        response: content,
        provider: this.name,
        model: this.model,
        stats: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens
        }
      };
    } catch (error) {
      console.error('❌ OpenAI generation failed:', error);
      return { success: false, error: error.message, provider: this.name };
    }
  }

  async *generateStream(prompt, context) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = this._buildMessages(prompt, context);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI streaming error: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      for (const line of text.split('\n')) {
        const trimmed = line.replace(/^data: /, '').trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        try {
          const json = JSON.parse(trimmed);
          const chunk = json.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }

  getStatus() {
    return {
      name: this.name,
      available: this.available,
      ready: this.available,
      model: this.model,
      hasApiKey: !!this.apiKey,
      description: `OpenAI ${this.model} — cloud inference, requires API key`
    };
  }

  setModel(model) {
    this.model = model;
    console.log(`OpenAI model set to: ${model}`);
  }

  async destroy() {}

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  _buildMessages(prompt, context) {
    const userContent = this._buildUserContent(prompt, context);
    return [
      { role: 'system', content: this._systemPrompt() },
      { role: 'user', content: userContent }
    ];
  }

  _buildUserContent(prompt, context) {
    let content = '';

    if (context?.title) content += `Page title: ${context.title}\n`;
    if (context?.url)   content += `URL: ${context.url}\n`;

    if (context?.content) {
      const MAX_CHARS = 80000; // ~20k tokens, safe for gpt-4o-mini 128k window
      const truncated = context.content.length > MAX_CHARS
        ? context.content.substring(0, MAX_CHARS) + '\n...[content truncated]'
        : context.content;
      content += `\nPage content:\n${truncated}\n`;
    }

    if (context?.images?.length) {
      content += `\nImages on page:\n`;
      context.images.slice(0, 5).forEach((img, i) => {
        content += `${i + 1}. ${img.alt || 'Unlabeled'} (${img.width}×${img.height})\n`;
      });
    }

    content += `\n${prompt}`;
    return content;
  }

  _systemPrompt() {
    return `You are an expert educational assistant that analyzes webpages and creates study materials.

Capabilities: clear summaries, key concepts, flashcards, quizzes, Q&A.

Guidelines:
- Use markdown formatting for summaries and notes
- For flashcards and quizzes, output ONLY valid JSON with no surrounding text or code blocks
- Be concise but comprehensive
- Focus on key learning points`;
  }

  async _loadConfig() {
    try {
      const data = await chrome.storage.local.get('openai_config');
      return data.openai_config || null;
    } catch {
      return null;
    }
  }
}

self.OpenAIService = OpenAIService;
