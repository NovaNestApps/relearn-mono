/**
 * Summaries Page Script (UPDATED with Backend Integration)
 * Fetches summaries from both local storage and backend
 */

// State
let allSummaries = [];
let filteredSummaries = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let isLoading = false;

// DOM Elements
const elements = {
    summariesGrid: document.getElementById('summariesGrid'),
    summaryCount: document.getElementById('summaryCount'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    sortSelect: document.getElementById('sortSelect'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    exportBtn: document.getElementById('exportBtn'),
    syncStatus: document.getElementById('syncStatus'),
    syncBtn: document.getElementById('syncBtn')
};

/**
 * Initialize the page
 */
async function init() {
    console.log('🚀 Summaries page initializing...');

    // Set up event listeners
    setupEventListeners();

    // Load summaries from both sources
    await loadAllSummaries();

    console.log('✅ Summaries page ready');
}

/**
 * Load summaries from both local storage and backend
 */
async function loadAllSummaries() {
    showLoading(true);

    try {
        // Check if user is authenticated
        const isAuth = await APIService.isAuthenticated();

        // Load from local storage
        const localSummaries = await StorageManager.getAllSummaries();
        console.log(`📦 Loaded ${localSummaries.length} local summaries`);

        let backendSummaries = [];

        // Load from backend if authenticated
        if (isAuth) {
            console.log('🔐 User authenticated, fetching from backend...');
            updateSyncStatus('syncing', 'Syncing...');

            try {
                const response = await APIService.getSummaries(1, 100); // Get first 100

                if (response.success && response.data.summaries) {
                    backendSummaries = response.data.summaries;
                    console.log(`☁️ Loaded ${backendSummaries.length} backend summaries`);
                    updateSyncStatus('synced', `Synced (${backendSummaries.length} on server)`);
                } else {
                    console.warn('⚠️ Failed to fetch backend summaries:', response.error);
                    updateSyncStatus('error', 'Sync failed');
                }
            } catch (error) {
                console.error('❌ Error fetching backend summaries:', error);
                updateSyncStatus('error', 'Sync failed');
            }
        } else {
            console.log('👤 User not authenticated, showing local only');
            updateSyncStatus('offline', 'Local only');
        }

        // Merge summaries (prefer backend data, fill in with local)
        allSummaries = mergeSummaries(localSummaries, backendSummaries);

        console.log(`📊 Total summaries: ${allSummaries.length}`);

        // Apply filters and render
        applyFiltersAndSort();

    } catch (error) {
        console.error('❌ Error loading summaries:', error);
        showError('Failed to load summaries');
    } finally {
        showLoading(false);
    }
}

/**
 * Merge local and backend summaries
 * @param {Array} localSummaries - Summaries from local storage
 * @param {Array} backendSummaries - Summaries from backend
 * @returns {Array} Merged summaries
 */
function mergeSummaries(localSummaries, backendSummaries) {
    const merged = new Map();

    // Add local summaries first, normalizing timestamp field
    localSummaries.forEach(summary => {
        merged.set(summary.id, {
            ...summary,
            timestamp: summary.createdAt || summary.timestamp,
            source: 'local',
            synced: false
        });
    });

    // Add/update with backend summaries
    backendSummaries.forEach(backendSummary => {
        const backendId = backendSummary.id;

        // Check if a local copy already linked to this backend summary
        const localByBackendId = Array.from(merged.values()).find(s => s.backendSummaryId === backendId);
        if (localByBackendId) {
            localByBackendId.synced = true;
            localByBackendId.backendId = backendId;
            return;
        }

        // Fall back: match by pageId (only when pageId is non-null)
        const sharedPageId = backendSummary.pageId;
        if (sharedPageId) {
            const localByPage = Array.from(merged.values()).find(s => s.pageId === sharedPageId);
            if (localByPage) {
                localByPage.synced = true;
                localByPage.backendId = backendId;
                return;
            }
        }

        // No local copy found — add backend summary as its own entry
        merged.set(backendId, {
            id: backendId,
            url: backendSummary.page?.url || '',
            title: backendSummary.page?.title || 'Untitled',
            summary: backendSummary.content,
            timestamp: backendSummary.createdAt,
            provider: 'Backend',
            model: backendSummary.type || 'default',
            pageId: backendSummary.pageId,
            source: 'backend',
            synced: true,
            backendData: backendSummary
        });
    });

    return Array.from(merged.values());
}

/**
 * Update sync status indicator
 */
function updateSyncStatus(status, text) {
    if (!elements.syncStatus) return;

    elements.syncStatus.className = `sync-status sync-${status}`;
    elements.syncStatus.textContent = text;
}

/**
 * Apply filters and sorting
 */
function applyFiltersAndSort() {
    // Start with all summaries
    filteredSummaries = [...allSummaries];

    // Apply search filter
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredSummaries = filteredSummaries.filter(summary =>
            summary.title.toLowerCase().includes(searchTerm) ||
            summary.url.toLowerCase().includes(searchTerm) ||
            summary.summary.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    if (currentFilter !== 'all') {
        filteredSummaries = filteredSummaries.filter(summary => {
            if (currentFilter === 'local') return summary.source === 'local';
            if (currentFilter === 'synced') return summary.synced === true;
            return true;
        });
    }

    // Apply sorting
    filteredSummaries.sort((a, b) => {
        switch (currentSort) {
            case 'date-desc':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'date-asc':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });

    // Render
    renderSummaries();
}

/**
 * Render summaries to the grid
 */
function renderSummaries() {
    // Update count
    elements.summaryCount.textContent = `${filteredSummaries.length} ${filteredSummaries.length === 1 ? 'Summary' : 'Summaries'}`;

    // Show empty state if no summaries
    if (filteredSummaries.length === 0) {
        elements.summariesGrid.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }

    // Show grid
    elements.summariesGrid.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');

    // Render cards
    elements.summariesGrid.innerHTML = filteredSummaries.map(summary => createSummaryCard(summary)).join('');

    // Attach event listeners to cards
    attachCardEventListeners();
}

/**
 * Create HTML for a summary card
 */
function createSummaryCard(summary) {
    const date = new Date(summary.timestamp);
    const timeAgo = getTimeAgo(date);
    const favicon = summary.metadata?.favicon || getFaviconFromUrl(summary.url);
    const syncDot = summary.synced
        ? '<span class="sync-badge synced" title="Synced to cloud"></span>'
        : '<span class="sync-badge local" title="Local only"></span>';
    const preview = escapeHtml(truncate(stripMarkdown(summary.summary), 180));

    return `
    <div class="summary-card" data-id="${summary.id}">
      <div class="card-header">
        <div class="card-favicon">
          ${favicon ? `<img src="${favicon}" alt="" onerror="this.style.display='none'">` : '🌐'}
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(summary.title)}</h3>
          <a href="${summary.url}" class="card-url" target="_blank" title="${summary.url}" onclick="event.stopPropagation()">
            ${truncateUrl(summary.url)}
          </a>
        </div>
        ${syncDot}
      </div>

      <div class="card-summary">${preview}</div>

      <div class="card-footer">
        <div class="card-meta">
          <span class="card-date">${timeAgo}</span>
          <span class="card-provider">${summary.provider || 'AI'}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn copy-btn" data-id="${summary.id}" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="card-btn delete-btn" data-id="${summary.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', debounce(() => {
        applyFiltersAndSort();
    }, 300));

    // Filters
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFiltersAndSort();
        });
    });

    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });

    // Sync button
    if (elements.syncBtn) {
        elements.syncBtn.addEventListener('click', async () => {
            await loadAllSummaries();
        });
    }

    // Export
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportSummaries);
    }

    // Clear all
    if (elements.clearAllBtn) {
        elements.clearAllBtn.addEventListener('click', clearAllSummaries);
    }
}

/**
 * Attach event listeners to cards
 */
function attachCardEventListeners() {
    // Entire card click → navigate to detail
    document.querySelectorAll('.summary-card').forEach(card => {
        card.addEventListener('click', () => {
            viewSummary(card.dataset.id);
        });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            await copySummary(id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            await deleteSummary(id);
        });
    });
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    isLoading = show;
    if (elements.loadingSpinner) {
        elements.loadingSpinner.classList.toggle('hidden', !show);
    }
}

/**
 * View full summary in modal or new page
 */
function viewSummary(id) {
    const url = chrome.runtime.getURL(`src/popup/details.html?id=${id}`);
    window.location.href = url;
}

/**
 * Copy summary to clipboard
 */
async function copySummary(id) {
    const summary = allSummaries.find(s => s.id === id);
    if (!summary) return;

    try {
        await navigator.clipboard.writeText(summary.summary);

        // Show feedback
        const btn = document.querySelector(`.copy-btn[data-id="${id}"]`);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard');
    }
}

/**
 * Delete a summary
 */
async function deleteSummary(id) {
    const summary = allSummaries.find(s => s.id === id);
    if (!summary) return;

    if (!confirm(`Delete summary for "${summary.title}"?`)) {
        return;
    }

    try {
        // Delete from local storage
        await StorageManager.deleteSummary(id);
        console.log('✅ Deleted from local storage');

        // Delete from backend if it's synced
        if (summary.synced && summary.backendId) {
            const isAuth = await APIService.isAuthenticated();
            if (isAuth) {
                const response = await APIService.deleteSummary(summary.backendId);
                if (response.success) {
                    console.log('✅ Deleted from backend');
                } else {
                    console.warn('⚠️ Failed to delete from backend:', response.error);
                }
            }
        }

        // Reload summaries
        await loadAllSummaries();

    } catch (error) {
        console.error('❌ Failed to delete:', error);
        alert('Failed to delete summary');
    }
}

/**
 * Clear all summaries
 */
async function clearAllSummaries() {
    if (!confirm('Delete ALL summaries? This cannot be undone!')) {
        return;
    }

    if (!confirm('Are you absolutely sure? This will delete all local summaries.')) {
        return;
    }

    try {
        // Clear local storage
        await StorageManager.clearAllSummaries();
        console.log('✅ Cleared all local summaries');

        // Note: We don't delete from backend automatically
        // Backend summaries will still exist

        // Reload
        await loadAllSummaries();

    } catch (error) {
        console.error('❌ Failed to clear summaries:', error);
        alert('Failed to clear summaries');
    }
}

/**
 * Export summaries to JSON
 */
function exportSummaries() {
    try {
        const dataStr = JSON.stringify(allSummaries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `summaries-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        console.log('✅ Summaries exported');
    } catch (error) {
        console.error('❌ Export failed:', error);
        alert('Failed to export summaries');
    }
}

/**
 * Show error message
 */
function showError(message) {
    alert(message);
}

/**
 * Strip markdown syntax for plain-text preview
 */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`{1,3}(.+?)`{1,3}/gs, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Utility functions
 */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function truncateUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

function getFaviconFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
        return null;
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }

    return 'Just now';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}