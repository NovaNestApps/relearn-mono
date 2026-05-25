/**
 * Storage Utility for Relearn
 * Manages chrome.storage.local for summaries, flashcards, and quizzes
 */

const StorageManager = {
  // Storage keys
KEYS: {
    SUMMARIES: 'summaries',
    SETTINGS: 'settings',
    STATS: 'stats',
    AUTH_TOKENS: 'auth_tokens',  
    USER_INFO: 'user_info'          
  },

  // Storage limits (in bytes)
  LIMITS: {
    TOTAL: 10 * 1024 * 1024, // 10MB
    WARNING_75: 7.5 * 1024 * 1024, // 7.5MB
    WARNING_90: 9 * 1024 * 1024, // 9MB
    WARNING_95: 9.5 * 1024 * 1024 // 9.5MB
  },

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Get current storage usage
   */
  async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        const percentage = (bytes / this.LIMITS.TOTAL) * 100;
        resolve({
          bytes: bytes,
          percentage: Math.round(percentage),
          available: this.LIMITS.TOTAL - bytes,
          warningLevel: this.getWarningLevel(bytes)
        });
      });
    });
  },

  /**
   * Get warning level based on usage
   */
  getWarningLevel(bytes) {
    if (bytes >= this.LIMITS.WARNING_95) return 'critical';
    if (bytes >= this.LIMITS.WARNING_90) return 'high';
    if (bytes >= this.LIMITS.WARNING_75) return 'medium';
    return 'normal';
  },

  /**
   * Initialize storage with default structure
   */
  async initialize() {
    try {
      const data = await chrome.storage.local.get([this.KEYS.SUMMARIES, this.KEYS.SETTINGS, this.KEYS.STATS]);
      
      // Initialize summaries if not exists
      if (!data[this.KEYS.SUMMARIES]) {
        await chrome.storage.local.set({ [this.KEYS.SUMMARIES]: {} });
      }

      // Initialize settings if not exists
      if (!data[this.KEYS.SETTINGS]) {
        await chrome.storage.local.set({
          [this.KEYS.SETTINGS]: {
            preferredProvider: 'ollama',
            autoSave: false,
            theme: 'light',
            storageWarningShown: false
          }
        });
      }

      // Initialize stats if not exists
      if (!data[this.KEYS.STATS]) {
        await chrome.storage.local.set({
          [this.KEYS.STATS]: {
            totalSummaries: 0,
            totalFlashcards: 0,
            totalQuizzes: 0,
            lastUpdated: new Date().toISOString()
          }
        });
      }

      console.log('✅ Storage initialized');
      return true;
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      return false;
    }
  },

  /**
   * Save a summary
   */
  async saveSummary(summaryData) {
    try {
      // Get current summaries
      const data = await chrome.storage.local.get(this.KEYS.SUMMARIES);
      const summaries = data[this.KEYS.SUMMARIES] || {};

      // Create summary object with full schema
      const summary = {
        id: summaryData.id || this.generateUUID(),
        url: summaryData.url,
        title: summaryData.title,
        summary: summaryData.summary,
        pageContent: summaryData.pageContent || '',
        provider: summaryData.provider,
        model: summaryData.model || '',
        createdAt: summaryData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: summaryData.wordCount || 0,
        tags: summaryData.tags || [],
        metadata: {
          author: summaryData.metadata?.author || null,
          favicon: summaryData.metadata?.favicon || null,
          readingTime: summaryData.metadata?.readingTime || 0,
          images: summaryData.metadata?.images || []
        },
        flashcards: summaryData.flashcards || [],
        quizzes: summaryData.quizzes || []
      };

      // Check storage before saving
      const usage = await this.getStorageUsage();
      if (usage.warningLevel === 'critical') {
        throw new Error('Storage is almost full. Please delete some summaries before saving new ones.');
      }

      // Save summary
      summaries[summary.id] = summary;
      await chrome.storage.local.set({ [this.KEYS.SUMMARIES]: summaries });

      // Update stats
      await this.updateStats();

      console.log('✅ Summary saved:', summary.id);
      return { success: true, id: summary.id, summary: summary };
    } catch (error) {
      console.error('❌ Failed to save summary:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a summary by ID
   */
  async getSummary(id) {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SUMMARIES);
      const summaries = data[this.KEYS.SUMMARIES] || {};
      return summaries[id] || null;
    } catch (error) {
      console.error('❌ Failed to get summary:', error);
      return null;
    }
  },

  /**
   * Get all summaries
   */
  async getAllSummaries() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SUMMARIES);
      const summaries = data[this.KEYS.SUMMARIES] || {};
      
      // Convert object to array and sort by createdAt (newest first)
      const summariesArray = Object.values(summaries).sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      return summariesArray;
    } catch (error) {
      console.error('❌ Failed to get summaries:', error);
      return [];
    }
  },

  /**
   * Delete a summary by ID
   */
  async deleteSummary(id) {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SUMMARIES);
      const summaries = data[this.KEYS.SUMMARIES] || {};
      
      if (summaries[id]) {
        delete summaries[id];
        await chrome.storage.local.set({ [this.KEYS.SUMMARIES]: summaries });
        await this.updateStats();
        console.log('✅ Summary deleted:', id);
        return { success: true };
      }
      
      return { success: false, error: 'Summary not found' };
    } catch (error) {
      console.error('❌ Failed to delete summary:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update a summary
   */
  async updateSummary(id, updates) {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SUMMARIES);
      const summaries = data[this.KEYS.SUMMARIES] || {};
      
      if (!summaries[id]) {
        return { success: false, error: 'Summary not found' };
      }

      // Update summary with new data
      summaries[id] = {
        ...summaries[id],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ [this.KEYS.SUMMARIES]: summaries });
      console.log('✅ Summary updated:', id);
      return { success: true, summary: summaries[id] };
    } catch (error) {
      console.error('❌ Failed to update summary:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add flashcards to a summary
   */
  async addFlashcards(summaryId, flashcards) {
    try {
      const summary = await this.getSummary(summaryId);
      if (!summary) {
        return { success: false, error: 'Summary not found' };
      }

      // Add IDs to flashcards if not present
      const flashcardsWithIds = flashcards.map(card => ({
        id: card.id || this.generateUUID(),
        front: card.front,
        back: card.back,
        tags: card.tags || [],
        difficulty: card.difficulty || 'medium',
        createdAt: card.createdAt || new Date().toISOString(),
        lastReviewed: card.lastReviewed || null,
        correctCount: card.correctCount || 0,
        incorrectCount: card.incorrectCount || 0
      }));

      summary.flashcards = [...(summary.flashcards || []), ...flashcardsWithIds];
      
      return await this.updateSummary(summaryId, { flashcards: summary.flashcards });
    } catch (error) {
      console.error('❌ Failed to add flashcards:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add quiz to a summary
   */
  async addQuiz(summaryId, quiz) {
    try {
      const summary = await this.getSummary(summaryId);
      if (!summary) {
        return { success: false, error: 'Summary not found' };
      }

      // Add ID to quiz if not present
      const quizWithId = {
        id: quiz.id || this.generateUUID(),
        title: quiz.title,
        questions: quiz.questions.map(q => ({
          id: q.id || this.generateUUID(),
          type: q.type,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          hint: q.hint || '',
          points: q.points || 1
        })),
        totalPoints: quiz.totalPoints || quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0),
        createdAt: quiz.createdAt || new Date().toISOString(),
        attempts: quiz.attempts || []
      };

      summary.quizzes = [...(summary.quizzes || []), quizWithId];
      
      return await this.updateSummary(summaryId, { quizzes: summary.quizzes });
    } catch (error) {
      console.error('❌ Failed to add quiz:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update stats
   */
  async updateStats() {
    try {
      const summaries = await this.getAllSummaries();
      
      let totalFlashcards = 0;
      let totalQuizzes = 0;
      
      summaries.forEach(summary => {
        totalFlashcards += (summary.flashcards || []).length;
        totalQuizzes += (summary.quizzes || []).length;
      });

      const usage = await this.getStorageUsage();

      await chrome.storage.local.set({
        [this.KEYS.STATS]: {
          totalSummaries: summaries.length,
          totalFlashcards: totalFlashcards,
          totalQuizzes: totalQuizzes,
          lastUpdated: new Date().toISOString(),
          storageUsedBytes: usage.bytes,
          storagePercentage: usage.percentage
        }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to update stats:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get stats
   */
  async getStats() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.STATS);
      return data[this.KEYS.STATS] || {
        totalSummaries: 0,
        totalFlashcards: 0,
        totalQuizzes: 0,
        lastUpdated: new Date().toISOString(),
        storageUsedBytes: 0,
        storagePercentage: 0
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return null;
    }
  },

  /**
   * Clear all data (use with caution!)
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      await this.initialize();
      console.log('✅ All storage cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Export all data as JSON
   */
  async exportData() {
    try {
      const data = await chrome.storage.local.get(null);
      return {
        success: true,
        data: data,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Import data from JSON
   */
  async importData(data) {
    try {
      await chrome.storage.local.set(data);
      console.log('✅ Data imported successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // AUTHENTICATION STORAGE METHODS
  // ============================================

  /**
   * Save authentication tokens
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token
   */
  async saveAuthTokens(accessToken, refreshToken) {
    try {
      await chrome.storage.local.set({
        auth_tokens: {
          accessToken,
          refreshToken,
          savedAt: new Date().toISOString()
        }
      });
      console.log('✅ Auth tokens saved');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save auth tokens:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get stored authentication tokens
   * @returns {Promise<Object|null>} Tokens object or null
   */
  async getAuthTokens() {
    try {
      const data = await chrome.storage.local.get('auth_tokens');
      return data.auth_tokens || null;
    } catch (error) {
      console.error('❌ Failed to get auth tokens:', error);
      return null;
    }
  },

  /**
   * Save user information
   * @param {Object} user - User object (id, email, name)
   */
  async saveUserInfo(user) {
    try {
      await chrome.storage.local.set({
        user_info: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          savedAt: new Date().toISOString()
        }
      });
      console.log('✅ User info saved');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save user info:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get stored user information
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserInfo() {
    try {
      const data = await chrome.storage.local.get('user_info');
      return data.user_info || null;
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      return null;
    }
  },

  /**
   * Clear authentication data (logout)
   */
  async clearAuth() {
    try {
      await chrome.storage.local.remove(['auth_tokens', 'user_info']);
      console.log('✅ Auth data cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear auth:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} True if tokens exist
   */
  async isAuthenticated() {
    const tokens = await this.getAuthTokens();
    return tokens && tokens.accessToken ? true : false;
  },

  // ============================================
  // OPENAI CONFIGURATION
  // ============================================

  async saveOpenAIConfig(apiKey, model = 'gpt-4o-mini') {
    try {
      await chrome.storage.local.set({
        openai_config: { apiKey, model, savedAt: new Date().toISOString() }
      });
      console.log('✅ OpenAI config saved');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save OpenAI config:', error);
      return { success: false, error: error.message };
    }
  },

  async getOpenAIConfig() {
    try {
      const data = await chrome.storage.local.get('openai_config');
      return data.openai_config || null;
    } catch (error) {
      console.error('❌ Failed to get OpenAI config:', error);
      return null;
    }
  },

  async clearAllSummaries() {
    try {
      await chrome.storage.local.set({ [this.KEYS.SUMMARIES]: {} });
      await this.updateStats();
      console.log('✅ All summaries cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear summaries:', error);
      return { success: false, error: error.message };
    }
  },

  async clearOpenAIConfig() {
    try {
      await chrome.storage.local.remove('openai_config');
      console.log('✅ OpenAI config cleared');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Initialize storage when script loads
StorageManager.initialize();

// Make available globally
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}