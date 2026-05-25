/**
 * API Service for Relearn
 * Handles all HTTP requests to the backend API
 */

let APIService = {
    // Base configuration
    baseURL: 'http://localhost:3001',

    /**
     * Make HTTP request with proper headers and error handling
     * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
     * @param {object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<object>} - Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authorization header if token exists
        const tokens = await this.getTokens();
        if (tokens && tokens.accessToken && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);

            const response = await fetch(url, config);
            const data = await response.json();

            // Handle different status codes
            if (response.ok) {
                console.log(`✅ API Success: ${endpoint}`, data);
                return { success: true, data };
            }

            // Handle errors
            console.error(`❌ API Error: ${endpoint}`, data);

            // Handle 401 Unauthorized - token might be expired
            if (response.status === 401) {
                console.log('🔄 Token expired, attempting refresh...');

                // Try to refresh token if this wasn't already a refresh request
                if (!endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry the original request with new token
                        console.log('🔄 Retrying request with new token...');
                        return this.request(endpoint, options);
                    }
                }

                // If refresh failed or this was a refresh/login request, clear auth
                await this.clearAuth();
                return {
                    success: false,
                    error: 'Session expired. Please login again.',
                    status: 401
                };
            }

            // Return error response
            return {
                success: false,
                error: data.message || data.error || 'An error occurred',
                status: response.status,
                data
            };

        } catch (error) {
            console.error(`❌ Network Error: ${endpoint}`, error);
            return {
                success: false,
                error: error.message || 'Network error. Please check your connection.',
                networkError: true
            };
        }
    },

    /**
     * Get stored tokens
     */
    async getTokens() {
        try {
            const data = await chrome.storage.local.get('auth_tokens');
            return data.auth_tokens || null;
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return null;
        }
    },

    /**
     * Save tokens to storage
     */
    async saveTokens(accessToken, refreshToken) {
        try {
            await chrome.storage.local.set({
                auth_tokens: {
                    accessToken,
                    refreshToken,
                    savedAt: new Date().toISOString()
                }
            });
            console.log('✅ Tokens saved');
            return true;
        } catch (error) {
            console.error('Failed to save tokens:', error);
            return false;
        }
    },

    /**
     * Clear authentication data
     */
    async clearAuth() {
        try {
            await chrome.storage.local.remove(['auth_tokens', 'user_info']);
            console.log('✅ Auth cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear auth:', error);
            return false;
        }
    },

    // ============================================
    // AUTHENTICATION ENDPOINTS
    // ============================================

    /**
     * Register a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} name - User name
     * @returns {Promise<object>} - Response with user data and tokens
     */
    async register(email, password, name) {
        const response = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
            skipAuth: true // Don't send auth header for register
        });

        if (response.success) {
            // Save tokens
            await this.saveTokens(
                response.data.accessToken,
                response.data.refreshToken
            );

            // Save user info
            await this.saveUserInfo(response.data.user);
        }

        return response;
    },

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<object>} - Response with user data and tokens
     */
    async login(email, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true // Don't send auth header for login
        });

        if (response.success) {
            // Save tokens
            await this.saveTokens(
                response.data.accessToken,
                response.data.refreshToken
            );

            // Save user info
            await this.saveUserInfo(response.data.user);
        }

        return response;
    },

    /**
     * Get current user info
     * @returns {Promise<object>} - Current user data
     */
    async getCurrentUser() {
        const response = await this.request('/api/auth/me', {
            method: 'GET'
        });

        if (response.success) {
            // Update stored user info
            await this.saveUserInfo(response.data);
        }

        return response;
    },

    /**
     * Refresh access token using refresh token
     * @returns {Promise<boolean>} - True if refresh successful
     */
    async refreshToken() {
        try {
            const tokens = await this.getTokens();

            if (!tokens || !tokens.refreshToken) {
                console.log('❌ No refresh token available');
                return false;
            }

            const response = await this.request('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: tokens.refreshToken }),
                skipAuth: true
            });

            if (response.success) {
                // Save new tokens
                await this.saveTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );
                console.log('✅ Token refreshed successfully');
                return true;
            }

            console.log('❌ Token refresh failed');
            return false;

        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return false;
        }
    },

    /**
     * Logout user
     * @returns {Promise<object>} - Logout response
     */
    async logout() {
        // Call logout endpoint
        const response = await this.request('/api/auth/logout', {
            method: 'POST'
        });

        // Clear local auth data regardless of API response
        await this.clearAuth();

        return response;
    },

    /**
     * Save user info to storage
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
            return true;
        } catch (error) {
            console.error('Failed to save user info:', error);
            return false;
        }
    },

    /**
     * Get stored user info
     */
    async getUserInfo() {
        try {
            const data = await chrome.storage.local.get('user_info');
            return data.user_info || null;
        } catch (error) {
            console.error('Failed to get user info:', error);
            return null;
        }
    },

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} - True if user has valid token
     */
    async isAuthenticated() {
        const tokens = await this.getTokens();
        return tokens && tokens.accessToken ? true : false;
    },

    // ============================================
    // PAGES ENDPOINTS (For future use)
    // ============================================

    /**
     * Create a new page
     * @param {object} pageData - Page data (url, title, content, favicon)
     * @returns {Promise<object>} - Created page data
     */
    async createPage(pageData) {
        return await this.request('/api/pages', {
            method: 'POST',
            body: JSON.stringify(pageData)
        });
    },

    /**
     * Get all pages with pagination
     * @param {number} page - Page number (default: 1)
     * @param {number} limit - Items per page (default: 10)
     * @returns {Promise<object>} - Pages list with pagination
     */
    async getPages(page = 1, limit = 10) {
        return await this.request(`/api/pages?page=${page}&limit=${limit}`, {
            method: 'GET'
        });
    },

    /**
     * Get a specific page by ID
     * @param {string} pageId - Page ID
     * @returns {Promise<object>} - Page data
     */
    async getPage(pageId) {
        return await this.request(`/api/pages/${pageId}`, {
            method: 'GET'
        });
    },

    /**
     * Search pages
     * @param {string} query - Search query
     * @returns {Promise<object>} - Search results
     */
    async searchPages(query) {
        return await this.request(`/api/pages/search?query=${encodeURIComponent(query)}`, {
            method: 'GET'
        });
    },

    /**
     * Update a page
     * @param {string} pageId - Page ID
     * @param {object} updates - Fields to update
     * @returns {Promise<object>} - Updated page data
     */
    async updatePage(pageId, updates) {
        return await this.request(`/api/pages/${pageId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    },

    /**
     * Delete a page
     * @param {string} pageId - Page ID
     * @returns {Promise<object>} - Deletion response
     */
    async deletePage(pageId) {
        return await this.request(`/api/pages/${pageId}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // SUMMARIES ENDPOINTS
    // ============================================

    /**
     * Generate/Save a summary for a page
     * @param {string} pageId - Page ID
     * @param {string} content - Summary content
     * @returns {Promise<object>} - Job info with jobId
     */
    async generateSummary(pageId, content) {
        return await this.request('/api/summaries/generate', {
            method: 'POST',
            body: JSON.stringify({
                pageId,
                content
            })
        });
    },

    /**
     * Get all summaries for the current user
     * @param {number} page - Page number (default: 1)
     * @param {number} limit - Results per page (default: 50)
     * @returns {Promise<object>} - List of summaries
     */
    async getSummaries(page = 1, limit = 50) {
        return await this.request(`/api/summaries?page=${page}&limit=${limit}`, {
            method: 'GET'
        });
    },

    /**
     * Get all summaries for a specific page
     * @param {string} pageId - Page ID
     * @returns {Promise<object>} - List of summaries
     */
    async getSummariesByPage(pageId) {
        return await this.request(`/api/summaries/page/${pageId}`, {
            method: 'GET'
        });
    },

    /**
     * Get a specific summary by ID
     * @param {string} summaryId - Summary ID
     * @returns {Promise<object>} - Summary data
     */
    async getSummary(summaryId) {
        return await this.request(`/api/summaries/${summaryId}`, {
            method: 'GET'
        });
    },

    /**
     * Delete a summary
     * @param {string} summaryId - Summary ID
     * @returns {Promise<object>} - Deletion response
     */
    async deleteSummary(summaryId) {
        return await this.request(`/api/summaries/${summaryId}`, {
            method: 'DELETE'
        });
    },

    // ============================================
// QUIZ ENDPOINTS
// ============================================

    /**
     * Create quiz for a summary
     * @param {string} summaryId - Summary ID
     * @param {Array} questions - Quiz questions
     * @returns {Promise<object>} - Created quiz
     */
    async createQuiz(summaryId, questions) {
        return await this.request('/api/quizzes', {
            method: 'POST',
            body: JSON.stringify({ summaryId, questions })
        });
    },

    /**
     * Get quizzes for a summary
     * @param {string} summaryId - Summary ID
     * @returns {Promise<object>} - List of quizzes
     */
    async getQuizzes(summaryId) {
        return await this.request(`/api/quizzes/summary/${summaryId}`, {
            method: 'GET'
        });
    },

    /**
     * Delete quiz
     * @param {string} quizId - Quiz ID
     * @returns {Promise<object>} - Deletion response
     */
    async deleteQuiz(quizId) {
        return await this.request(`/api/quizzes/${quizId}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // FLASHCARD ENDPOINTS
    // ============================================

    /**
     * Create a single flashcard for a page
     * @param {string} pageId - Backend page ID
     * @param {object} flashcard - Flashcard data
     * @param {string} flashcard.question
     * @param {string} flashcard.answer
     * @param {string} [flashcard.difficulty='medium']
     * @returns {Promise<object>} - Created flashcard
     */
    async createFlashcard(pageId, flashcard) {
        return await this.request('/api/flashcards', {
            method: 'POST',
            body: JSON.stringify({
                pageId,
                question: flashcard.question,
                answer: flashcard.answer,
                difficulty: flashcard.difficulty || 'medium'
            })
        });
    },

    /**
     * Create multiple flashcards for a page (backend has single-create endpoint only).
     * @param {string} pageId - Backend page ID
     * @param {Array} flashcards - Flashcards array
     * @returns {Promise<object>} - Batch result
     */
    async createFlashcards(pageId, flashcards) {
        const items = Array.isArray(flashcards) ? flashcards : [];
        const results = [];
        const failures = [];

        for (let i = 0; i < items.length; i += 1) {
            const item = items[i];
            if (!item?.question || !item?.answer) {
                failures.push({
                    index: i,
                    error: 'Invalid flashcard payload'
                });
                continue;
            }

            const res = await this.createFlashcard(pageId, item);
            if (res.success) {
                results.push(res.data.flashcard || res.data);
            } else {
                failures.push({
                    index: i,
                    error: res.error || 'Failed to create flashcard',
                    status: res.status
                });
            }
        }

        return {
            success: failures.length === 0,
            data: {
                created: results,
                createdCount: results.length,
                failedCount: failures.length,
                failures
            },
            error: failures.length > 0
                ? `Created ${results.length}/${items.length} flashcards`
                : null
        };
    },

    /**
     * Get job status for a summary generation job
     * @param {string} jobId - Job ID
     * @returns {Promise<object>} - Job status and summary (if complete)
     */
    async getJobStatus(jobId) {
        return await this.request(`/api/summaries/job/${jobId}`, {
            method: 'GET'
        });
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.APIService = APIService;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
