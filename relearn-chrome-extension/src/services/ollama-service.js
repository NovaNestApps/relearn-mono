/**
 * Ollama Service (OPTIMIZED for Educational Content)
 * Connects to local Ollama server
 */

class OllamaService {
    constructor() {
        this.name = 'Ollama (Local)';
        this.baseUrl = 'http://127.0.0.1:11434';  // ✅ CHANGED: Use 127.0.0.1 to match Ollama server
        this.available = false;
        this.model = 'qwen2.5:14b'; // Your installed model
        this.availableModels = [];
        this.contextWindow = 128000; // 128K tokens for Qwen2.5
        this.maxOutputTokens = 8192; // 8K output tokens
    }

    async checkAvailability() {
        try {
            console.log('Checking Ollama availability...');

            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.availableModels = data.models || [];

                // Filter out cloud models (they require authentication)
                const localModels = this.availableModels.filter(m => !m.name.includes('-cloud'));

                this.available = localModels.length > 0;

                if (this.available && localModels.length > 0) {
                    // Prefer these models in order for educational content
                    // Prioritize larger context windows and better reasoning
                    const preferredModels = [
                        'qwen2.5:14b',     // Best quality (your model!)
                        'qwen2.5:7b',      // Good quality, faster
                        'qwen2.5:32b',     // If you have it
                        'llama3.2:3b',     // Fast fallback with 128K context
                        'llama3.2:1b',     // Fastest fallback
                        'gemma2:27b',      // High quality but only 8K context
                        'gemma2:9b',       // Good quality, limited context
                        'mistral:7b',      // Stable fallback
                        'deepseek-r1:14b', // Excellent reasoning
                        'deepseek-r1:7b'   // Good reasoning
                    ];

                    let selectedModel = null;
                    for (const preferred of preferredModels) {
                        const found = localModels.find(m =>
                            m.name === preferred ||
                            m.name.startsWith(preferred.split(':')[0])
                        );
                        if (found) {
                            selectedModel = found.name;
                            break;
                        }
                    }

                    // Fallback to first local model
                    this.model = selectedModel || localModels[0].name;

                    // Update context window based on model
                    this.updateModelSpecs(this.model);

                    console.log(`✅ Ollama available! Using model: ${this.model}`);
                    console.log(`📊 Context window: ${this.contextWindow} tokens`);
                    console.log(`📊 Max output: ${this.maxOutputTokens} tokens`);
                    console.log(`Local models available: ${localModels.map(m => m.name).join(', ')}`);

                    if (this.availableModels.filter(m => m.name.includes('-cloud')).length > 0) {
                        console.log(`⚠️ Cloud models skipped: ${this.availableModels.filter(m => m.name.includes('-cloud')).map(m => m.name).join(', ')}`);
                    }
                }

                return this.available;
            }

            console.log('Ollama: Server responded but not OK:', response.status);
            return false;
        } catch (error) {
            console.log('Ollama: Not available -', error.message);
            return false;
        }
    }

    /**
     * Update model specifications based on model name
     */
    updateModelSpecs(modelName) {
        const specs = {
            'qwen2.5': { context: 128000, output: 8192 },
            'llama3.2': { context: 128000, output: 4096 },
            'llama3.1': { context: 128000, output: 4096 },
            'gemma2': { context: 8192, output: 4096 },
            'mistral': { context: 32768, output: 8192 },
            'deepseek-r1': { context: 64000, output: 8192 },
            'codellama': { context: 16384, output: 4096 }
        };

        for (const [key, spec] of Object.entries(specs)) {
            if (modelName.includes(key)) {
                this.contextWindow = spec.context;
                this.maxOutputTokens = spec.output;
                return;
            }
        }

        // Default fallback
        this.contextWindow = 8192;
        this.maxOutputTokens = 2048;
    }

    async initialize() {
        return this.available;
    }

    async generate(prompt, context) {
        try {
            const fullPrompt = this.buildPrompt(prompt, context);

            console.log(`Generating with Ollama model: ${this.model}`);
            console.log(`📊 Prompt length: ~${Math.floor(fullPrompt.length / 4)} tokens (est.)`);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        // Optimized settings for educational content
                        temperature: 0.7,        // Balance creativity and accuracy
                        top_p: 0.9,              // Nucleus sampling
                        top_k: 40,               // Limit vocabulary for coherence
                        num_predict: this.maxOutputTokens, // Use full output capacity
                        num_ctx: Math.min(this.contextWindow, 32768), // Context window (cap at 32K for speed)
                        repeat_penalty: 1.1,     // Reduce repetition
                        stop: ['\n\n\n']         // Stop at triple newlines
                    },
                    system: this.getSystemPrompt()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            console.log('✅ Ollama generation successful');
            console.log(`📊 Response length: ${data.response.length} characters`);

            return {
                success: true,
                response: data.response,
                provider: this.name,
                model: this.model,
                stats: {
                    contextWindow: this.contextWindow,
                    outputTokens: Math.floor(data.response.length / 4), // Rough estimate
                    totalDuration: data.total_duration,
                    loadDuration: data.load_duration,
                    evalCount: data.eval_count
                }
            };
        } catch (error) {
            console.error('❌ Ollama generation failed:', error);
            return {
                success: false,
                error: error.message,
                provider: this.name
            };
        }
    }

    async *generateStream(prompt, context) {
        try {
            const fullPrompt = this.buildPrompt(prompt, context);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: fullPrompt,
                    stream: true,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        top_k: 40,
                        num_predict: this.maxOutputTokens,
                        num_ctx: Math.min(this.contextWindow, 32768),
                        repeat_penalty: 1.1
                    },
                    system: this.getSystemPrompt()
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            yield json.response;
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        } catch (error) {
            console.error('Ollama streaming failed:', error);
            throw error;
        }
    }

    /**
     * Build optimized prompt for educational content
     */
    buildPrompt(userPrompt, context) {
        // Calculate approximate token count (rough: 1 token ≈ 4 characters)
        const estimateTokens = (text) => Math.floor(text.length / 4);

        // Reserve tokens for response (25% of max output)
        const reservedForResponse = this.maxOutputTokens * 0.25;

        // Available tokens for context
        const availableTokens = Math.min(this.contextWindow, 32768) - reservedForResponse;

        let prompt = `# Webpage Analysis Task\n\n`;
        prompt += `## Page Information\n`;
        prompt += `Title: ${context.title}\n`;
        prompt += `URL: ${context.url}\n\n`;

        // Smart content truncation based on available context
        if (context.content) {
            const contentTokens = estimateTokens(context.content);
            const maxContentChars = Math.floor(availableTokens * 4 * 0.8); // 80% for main content

            if (contentTokens > availableTokens * 0.8) {
                console.log(`⚠️ Content truncated: ${contentTokens} → ${Math.floor(availableTokens * 0.8)} tokens`);
                prompt += `## Main Content (truncated to fit context):\n${context.content.substring(0, maxContentChars)}...\n\n`;
            } else {
                prompt += `## Main Content:\n${context.content}\n\n`;
            }
        }

        // Add image descriptions if present
        if (context.images && context.images.length > 0) {
            prompt += `## Images on Page:\n`;
            context.images.slice(0, 5).forEach((img, i) => {
                prompt += `${i + 1}. ${img.alt || 'Unlabeled image'} (${img.width}x${img.height}px)\n`;
            });
            prompt += '\n';
        }

        // Add metadata if available
        if (context.metadata) {
            if (context.metadata.author) {
                prompt += `Author: ${context.metadata.author}\n`;
            }
            if (context.metadata.published) {
                prompt += `Published: ${context.metadata.published}\n`;
            }
            prompt += '\n';
        }

        // User's specific request
        prompt += `## User Request:\n${userPrompt}\n\n`;
        prompt += `## Instructions:\n`;
        prompt += `Provide a clear, well-structured response focused on educational value. Use markdown formatting when appropriate.`;

        return prompt;
    }

    /**
     * Get system prompt optimized for educational content
     */
    getSystemPrompt() {
        return `You are an expert educational assistant specialized in analyzing webpages and creating study materials.

Your capabilities:
- Create clear, concise summaries
- Extract key concepts and main ideas
- Generate effective study notes
- Design quiz questions and flashcards
- Identify important information hierarchically
- Describe visual content meaningfully

Response guidelines:
- Be clear and educational
- Use proper markdown formatting
- Structure information logically
- Focus on key learning points
- Make content easy to understand
- Be concise but comprehensive

When creating educational content:
- Summaries: 2-4 paragraphs covering main points
- Notes: Use bullet points and hierarchical structure
- Quizzes: Mix question types (multiple choice, short answer, true/false)
- Flashcards: Front = question/term, Back = answer/definition
- Key points: 5-10 most important takeaways`;
    }

    setModel(modelName) {
        this.model = modelName;
        this.updateModelSpecs(modelName);
        console.log(`Model switched to: ${modelName}`);
        console.log(`Context: ${this.contextWindow}, Output: ${this.maxOutputTokens}`);
    }

    getModels() {
        return this.availableModels;
    }

    getStatus() {
        return {
            name: this.name,
            available: this.available,
            ready: this.available,
            model: this.model,
            models: this.availableModels.map(m => m.name),
            contextWindow: this.contextWindow,
            maxOutputTokens: this.maxOutputTokens,
            description: `Local Qwen2.5 14B - 128K context, 8K output - Optimal for educational content`
        };
    }

    async destroy() {
        // Nothing to clean up
    }
}

// Make available in global scope for service worker
self.OllamaService = OllamaService;