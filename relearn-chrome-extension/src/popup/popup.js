/**
 * Popup Script - With Storage Integration
 * Clean, focused on user experience
 */

// DOM Elements
const elements = {
  providerName: document.getElementById('providerName'),
  readPageBtn: document.getElementById('readPageBtn'),
  askQuestionBtn: document.getElementById('askQuestionBtn'),
  questionSection: document.getElementById('questionSection'),
  questionInput: document.getElementById('questionInput'),
  cancelQuestionBtn: document.getElementById('cancelQuestionBtn'),
  submitQuestionBtn: document.getElementById('submitQuestionBtn'),
  resultsSection: document.getElementById('resultsSection'),
  resultsContent: document.getElementById('resultsContent'),
  resultsProvider: document.getElementById('resultsProvider'),
  saveResultBtn: document.getElementById('saveResultBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  storageWarning: document.getElementById('storageWarning'),
  storageWarningText: document.getElementById('storageWarningText'),
  closeStorageWarning: document.getElementById('closeStorageWarning')
};

const authElements = {
  authScreen: document.getElementById('authScreen'),
  mainScreen: document.getElementById('mainScreen'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginBtnText: document.getElementById('loginBtnText'),
  loginBtnSpinner: document.getElementById('loginBtnSpinner'),
  registerName: document.getElementById('registerName'),
  registerEmail: document.getElementById('registerEmail'),
  registerPassword: document.getElementById('registerPassword'),
  registerBtn: document.getElementById('registerBtn'),
  registerBtnText: document.getElementById('registerBtnText'),
  registerBtnSpinner: document.getElementById('registerBtnSpinner'),
  showRegisterLink: document.getElementById('showRegisterLink'),
  showLoginLink: document.getElementById('showLoginLink'),
  authError: document.getElementById('authError'),
  authErrorText: document.getElementById('authErrorText'),
  userInfo: document.getElementById('userInfo'),
  userName: document.getElementById('userName'),
  logoutBtn: document.getElementById('logoutBtn')
};

// State
let aiStatus = null;
let currentContext = null;
let currentTab = null;
let markdownReady = false;
let currentSummary = null; // Store current summary text
let currentProvider = null; // Store current provider
let currentSavedId = null; // Track if current summary is saved
let pageId = null;
let renderedSummaries = []; // Cache for card click → show summary

/**
 * Wait for markdown libraries to load
 */
function waitForMarkdown() {
  return new Promise((resolve) => {
    if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
      markdownReady = true;
      console.log('✅ Markdown libraries loaded');
      resolve(true);
      return;
    }
    
    // Wait up to 3 seconds for libraries to load
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
        markdownReady = true;
        console.log('✅ Markdown libraries loaded');
        clearInterval(checkInterval);
        resolve(true);
      } else if (attempts > 30) {
        console.warn('⚠️ Markdown libraries failed to load, using plain text fallback');
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Check storage usage and show warning if needed
 */
async function checkStorageWarning() {
  try {
    const usage = await StorageManager.getStorageUsage();
    
    if (usage.warningLevel !== 'normal') {
      showStorageWarning(usage);
    }
  } catch (error) {
    console.error('Failed to check storage:', error);
  }
}

/**
 * Show storage warning
 */
function showStorageWarning(usage) {
  const warningTexts = {
    medium: `Storage is ${usage.percentage}% full (${formatBytes(usage.bytes)} used). Consider deleting old summaries.`,
    high: `Storage is ${usage.percentage}% full (${formatBytes(usage.bytes)} used). Delete summaries to continue saving.`,
    critical: `Storage almost full! ${usage.percentage}% used. Cannot save new summaries until you free up space.`
  };
  
  elements.storageWarningText.textContent = warningTexts[usage.warningLevel] || warningTexts.medium;
  elements.storageWarning.classList.remove('hidden', 'warning-high', 'warning-critical');
  
  if (usage.warningLevel === 'high') {
    elements.storageWarning.classList.add('warning-high');
  } else if (usage.warningLevel === 'critical') {
    elements.storageWarning.classList.add('warning-critical');
  }
}

/**
 * Format bytes to readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Check if page is accessible
 */
function isAccessiblePage(url) {
  if (!url) return false;
  
  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'view-source:',
    'data:',
    'file://'
  ];
  
  return !restrictedPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * Get detailed error message for restricted pages
 */
function getRestrictedPageMessage(url) {
  if (!url) {
    return 'Cannot access page information. Please make sure you have navigated to a webpage.';
  }
  
  if (url.startsWith('chrome://') || url.startsWith('edge://')) {
    return 'Browser settings pages cannot be read. Please open a regular website (like Wikipedia, news sites, etc.)';
  }
  
  if (url.startsWith('chrome-extension://')) {
    return 'Extension pages cannot be read. Please navigate to a regular website.';
  }
  
  if (url.startsWith('about:')) {
    return 'This page type cannot be read. Please navigate to a regular website.';
  }
  
  if (url.startsWith('chrome://newtab') || url === 'chrome://newtab/') {
    return 'The new tab page cannot be read. Please navigate to any website first.';
  }
  
  return 'This page cannot be accessed. Please try a different webpage.';
}

/**
 * Update provider display
 */
function updateProviderDisplay() {
  if (!aiStatus) return;
  
  const activeProvider = aiStatus.activeProvider;
  
  if (activeProvider) {
    const provider = aiStatus[activeProvider];
    elements.providerName.textContent = provider.name || activeProvider;
  } else {
    elements.providerName.textContent = 'No AI available';
    elements.providerName.style.color = '#fca5a5';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  elements.readPageBtn.addEventListener('click', handleReadPage);
  elements.askQuestionBtn.addEventListener('click', showQuestionInput);
  elements.cancelQuestionBtn.addEventListener('click', hideQuestionInput);
  elements.submitQuestionBtn.addEventListener('click', handleAskQuestion);
  elements.saveResultBtn.addEventListener('click', handleSaveResult);
  elements.copyResultBtn.addEventListener('click', copyResult);
  elements.closeStorageWarning.addEventListener('click', () => {
    elements.storageWarning.classList.add('hidden');
  });

  // Enter to submit question
  elements.questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAskQuestion();
    }
  });

  const viewSummariesBtn = document.getElementById('viewSummariesBtn');
  if (viewSummariesBtn) {
    viewSummariesBtn.addEventListener('click', () => switchTab('history'));
  }

  const homeNavBtn = document.getElementById('homeNavBtn');
  if (homeNavBtn) {
    homeNavBtn.addEventListener('click', () => switchTab('home'));
  }

  const historyNavBtn = document.getElementById('historyNavBtn');
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => switchTab('history'));
  }

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => switchTab('settings'));
  }

  const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener('click', () => authElements.logoutBtn.click());
  }

  const historySearch = document.getElementById('historySearch');
  if (historySearch) {
    let searchTimer;
    historySearch.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadHistorySummaries(e.target.value), 300);
    });
  }

  const saveOpenAIBtn = document.getElementById('saveOpenAIBtn');
  const clearOpenAIBtn = document.getElementById('clearOpenAIBtn');

  if (saveOpenAIBtn) {
    saveOpenAIBtn.addEventListener('click', handleSaveOpenAIKey);
  }

  if (clearOpenAIBtn) {
    clearOpenAIBtn.addEventListener('click', handleClearOpenAIKey);
  }
}

async function loadOpenAISettings() {
  const config = await StorageManager.getOpenAIConfig();
  const apiKeyInput = document.getElementById('openaiApiKey');
  const modelSelect = document.getElementById('openaiModel');
  if (config) {
    apiKeyInput.value = config.apiKey ? '••••••••' : '';
    apiKeyInput.dataset.hasKey = config.apiKey ? 'true' : 'false';
    if (config.model && modelSelect) modelSelect.value = config.model;
  } else {
    apiKeyInput.value = '';
    apiKeyInput.dataset.hasKey = 'false';
  }
}

async function handleSaveOpenAIKey() {
  const apiKeyInput = document.getElementById('openaiApiKey');
  const modelSelect = document.getElementById('openaiModel');
  const statusEl = document.getElementById('settingsSaveStatus');
  const key = apiKeyInput.value.trim();

  if (!key || key === '••••••••') {
    statusEl.textContent = 'Enter a valid API key';
    statusEl.style.color = '#e53e3e';
    statusEl.classList.remove('hidden');
    return;
  }

  if (!key.startsWith('sk-')) {
    statusEl.textContent = 'Key should start with sk-';
    statusEl.style.color = '#e53e3e';
    statusEl.classList.remove('hidden');
    return;
  }

  const model = modelSelect ? modelSelect.value : 'gpt-4o-mini';
  await StorageManager.saveOpenAIConfig(key, model);

  statusEl.textContent = '⏳ Activating OpenAI...';
  statusEl.style.color = '#6366f1';
  statusEl.classList.remove('hidden');

  apiKeyInput.value = '••••••••';
  apiKeyInput.dataset.hasKey = 'true';

  chrome.runtime.sendMessage({ action: 'reinitializeAI' }, (response) => {
    if (response?.success && response.status?.openai?.available) {
      statusEl.textContent = '✓ OpenAI active — ready to use';
      statusEl.style.color = '#38a169';
      aiStatus = response.status;
      updateProviderDisplay();
    } else {
      statusEl.textContent = '⚠ Saved but activation failed — check key is valid';
      statusEl.style.color = '#e53e3e';
    }
    setTimeout(() => statusEl.classList.add('hidden'), 4000);
  });
}

async function handleClearOpenAIKey() {
  const statusEl = document.getElementById('settingsSaveStatus');
  await StorageManager.clearOpenAIConfig();
  document.getElementById('openaiApiKey').value = '';
  statusEl.textContent = 'API key removed.';
  statusEl.style.color = '#718096';
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 2000);
}


async function handleReadPage() {
  try {
    showLoading('Preparing...');
    hideError();
    hideWarning();

    // Reset saved state for new page read
    currentSavedId = null;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    console.log('Processing tab:', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      status: tab.status
    });
    
    // Check if we can access this page
    if (!isAccessiblePage(tab.url)) {
      throw new Error(getRestrictedPageMessage(tab.url));
    }

    // Check for Chrome Web Store
    if (tab.url && tab.url.includes('chrome.google.com/webstore')) {
      throw new Error('Chrome Web Store pages cannot be read due to security restrictions. Please try a different website.');
    }
    
    // Wait for page to be fully loaded
    if (tab.status !== 'complete') {
      updateLoadingText('Waiting for page to load...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Inject content script
    updateLoadingText('Preparing page reader...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/utils/dom-parser.js']
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/ui/notification.js']
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
      
      // Wait for scripts to initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('✅ Content scripts injected');
    } catch (injectError) {
      console.error('Script injection error:', injectError);
      // Continue anyway - scripts might already be injected
    }
    
    updateLoadingText('Extracting content...');
    
    // Extract content from page
    let contentResponse;
    try {
      contentResponse = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractContent' 
      });
      console.log('Content response received:', contentResponse?.success);
    } catch (msgError) {
      console.error('Message sending failed:', msgError);
      throw new Error('Failed to communicate with the page. Please refresh the page and try again.');
    }
    
    if (!contentResponse || !contentResponse.success) {
      throw new Error(contentResponse?.error || 'Failed to extract content from page. The page might be using complex JavaScript.');
    }
    
    currentContext = contentResponse.data;
      // Validate that we have content
    if (!currentContext.content || currentContext.content.trim().length < 10) {
      throw new Error('No readable content found on this page. The page might be empty, loading, or use unsupported content types.');
    }
    
    // ============================================
    // Save page to backend FIRST
    // ============================================
    updateLoadingText('Saving page to server...');
    
try {
      const pageData = {
        url: currentContext.url,
        title: currentContext.title,
        content: currentContext.content,
        favicon: currentContext.metadata?.favicon || null
      };
      
      console.log('📤 Saving page to backend...');
      console.log('🔍 DEBUG: pageData:', { url: pageData.url, title: pageData.title, contentLength: pageData.content.length });
      
      const pageResponse = await APIService.createPage(pageData);
      
      console.log('🔍 DEBUG: Full pageResponse:', pageResponse);
      console.log('🔍 DEBUG: pageResponse.success:', pageResponse.success);
      console.log('🔍 DEBUG: pageResponse.data:', pageResponse.data);

    if (pageResponse.success) {
        // Adjust this depending on your API: id vs _id
        const id = pageResponse.data?.page?.id ?? pageResponse.data?.page?._id;

        if (!id) {
            console.warn('No page id in response shape:', pageResponse);
        } else {
            // set both, if you need the global too
            currentContext.pageId = id;
            pageId = id;

            console.log('✅ Page saved to backend:', id);
            console.log('🔍 DEBUG: Verification - currentContext.pageId:', currentContext.pageId);
        }
    }
else {
        console.warn('⚠️ Failed to save page to backend:', pageResponse.error);
      }
    } catch (backendError) {
      console.error('❌ Backend save error:', backendError);
      // Continue anyway - don't block AI processing
    }
    
    updateLoadingText('Analyzing with AI...');
    
    // Send to AI for processing
    const aiResponse = await chrome.runtime.sendMessage({
      action: 'readPage',
      data: currentContext
    });
    
    console.log('AI response:', aiResponse?.success);
    
    hideLoading();
    
    if (aiResponse.success) {
      currentSummary = aiResponse.response;
      currentProvider = aiResponse.provider;
      
      showResults(aiResponse.response, aiResponse.provider);
    } else {
      throw new Error(aiResponse.error || 'AI processing failed. Please check your AI provider settings.');
    }
    
  } catch (error) {
    console.error('Read page failed:', error);
    hideLoading();
    showError(error.message);
  }
}

/**
 * Show question input
 */
function showQuestionInput() {
  elements.questionSection.classList.remove('hidden');
  elements.questionInput.focus();
  hideError();
  hideWarning();
}

/**
 * Hide question input
 */
function hideQuestionInput() {
  elements.questionSection.classList.add('hidden');
  elements.questionInput.value = '';
}

/**
 * Handle asking a question
 */
async function handleAskQuestion() {
  const question = elements.questionInput.value.trim();
  
  if (!question) {
    showError('Please enter a question');
    return;
  }
  
  try {
    hideError();
    hideWarning();
    hideResults();
    showLoading('Getting answer...');
    
    // Reset saved state for Q&A
    currentSavedId = null;
    
    // Get current context if not already available
    if (!currentContext) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab || !isAccessiblePage(tab.url)) {
        throw new Error(getRestrictedPageMessage(tab?.url));
      }

      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/utils/dom-parser.js', 'src/ui/notification.js', 'src/content/content.js']
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.log('Content script injection note:', e.message);
      }
      
      const contentResponse = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractContent' 
      });
      
      if (contentResponse && contentResponse.success) {
        currentContext = contentResponse.data;
      } else {
        throw new Error('Failed to extract page content. Please refresh and try again.');
      }
    }
    
    // Ask AI
    const aiResponse = await chrome.runtime.sendMessage({
      action: 'askQuestion',
      prompt: question,
      context: currentContext
    });
    
    hideLoading();
    hideQuestionInput();
    
    if (aiResponse.success) {
      currentSummary = aiResponse.response;
      currentProvider = aiResponse.provider;
      showResults(aiResponse.response, aiResponse.provider);
    } else {
      throw new Error(aiResponse.error || 'Failed to get answer from AI');
    }
    
  } catch (error) {
    console.error('Ask question failed:', error);
    hideLoading();
    showError(error.message);
  }
}



/**
 * REPLACE handleSaveResult function in popup.js
 * This version starts polling after saving to backend
 */

async function handleSaveResult() {
    try {
        // Check if already saved
        if (currentSavedId) {
            showSuccess('Already saved!');
            return;
        }

        // Check storage
        const usage = await StorageManager.getStorageUsage();
        if (usage.warningLevel === 'critical') {
            showError('Storage is full! Please delete some summaries before saving new ones.');
            showStorageWarning(usage);
            return;
        }

        if (!currentSummary || !currentContext) {
            showError('No summary to save. Please read a page first.');
            return;
        }

        showLoading('Saving summary...');

        // Get favicon
        let favicon = null;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.favIconUrl) {
                favicon = tabs[0].favIconUrl;
            }
        } catch (e) {
            console.log('Could not get favicon:', e);
        }

        // Prepare summary data
        const summaryData = {
            url: currentContext.url,
            title: currentContext.title,
            summary: currentSummary,
            pageContent: currentContext.content,
            provider: currentProvider,
            model: aiStatus?.ollama?.model || aiStatus?.chromeAI?.name || '',
            wordCount: currentContext.wordCount || 0,
            metadata: {
                author: currentContext.metadata?.author || null,
                favicon: favicon,
                readingTime: currentContext.readingTime || 0,
                images: currentContext.images || []
            },
            pageId: currentContext.pageId || null
        };

        // Save to local storage first
        const result = await StorageManager.saveSummary(summaryData);

        if (!result.success) {
            hideLoading();
            showError('Failed to save summary locally: ' + result.error);
            return;
        }

        currentSavedId = result.id;
        console.log('✅ Summary saved locally:', currentSavedId);

        // Save summary to backend
        let jobId = null;
// Save summary to backend
        try {
            if (currentContext.pageId) {
                console.log('📤 Saving summary to backend...');

                const backendResponse = await APIService.generateSummary(
                    currentContext.pageId,
                    currentSummary
                );

                if (backendResponse.success) {
                    console.log('✅ Summary saved to backend:', backendResponse.data.summary.id);

                    // Update local storage with backend ID
                    await StorageManager.updateSummary(currentSavedId, {
                        backendSummaryId: backendResponse.data.summary.id,
                        syncedToBackend: true,
                        syncedAt: new Date().toISOString()
                    });
                } else {
                    console.warn('⚠️ Backend summary save failed:', backendResponse.error);
                }
            }
        } catch (backendError) {
            console.error('❌ Backend save error:', backendError);
        }

        hideLoading();

        // Update save button to show success
        elements.saveResultBtn.classList.add('btn-success');
        const originalHTML = elements.saveResultBtn.innerHTML;
        elements.saveResultBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

        // Show success message
        const message = jobId
            ? 'Summary saved! Syncing to cloud...'
            : 'Summary saved locally!';
        showSuccess(message);

        // Check storage again
        await checkStorageWarning();

        // Update summaries count
        await updateSummariesCount();

        // Refresh recent summaries list
        await loadRecentSummaries();

        // Reset button after 3 seconds
        setTimeout(() => {
            elements.saveResultBtn.innerHTML = originalHTML;
            elements.saveResultBtn.classList.remove('btn-success');
        }, 3000);

    } catch (error) {
        console.error('Save failed:', error);
        hideLoading();
        showError('Failed to save summary: ' + error.message);
    }
}

/**
 * Update summaries count badge
 */
async function updateSummariesCount() {
  try {
    const countElement = document.getElementById('summariesCount');
    if (!countElement) return;

    const isAuth = await APIService.isAuthenticated();
    if (isAuth) {
      const response = await APIService.getSummaries(1, 1);
      if (response.success) {
        countElement.textContent = response.data.pagination.total;
        return;
      }
    }

    const summaries = await StorageManager.getAllSummaries();
    countElement.textContent = summaries.length;
  } catch (error) {
    console.error('Failed to update summaries count:', error);
  }
}

/**
 * Show results with markdown rendering (with fallback)
 */
function showResults(text, provider) {
  // Store raw text for copying
  elements.resultsContent.setAttribute('data-raw-text', text);
  
  // Check if markdown libraries are available
  if (markdownReady && typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    try {
      // Configure marked options
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
      });

      // Render markdown to HTML
      const htmlContent = marked.parse(text);
      elements.resultsContent.innerHTML = htmlContent;
      
      // Apply syntax highlighting to any code blocks
      elements.resultsContent.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
      
      console.log('✅ Markdown rendered successfully');
    } catch (error) {
      console.error('Markdown rendering failed:', error);
      // Fallback to plain text
      renderPlainText(text);
    }
  } else {
    // Libraries not loaded, use plain text with basic formatting
    console.warn('Markdown libraries not available, using plain text');
    renderPlainText(text);
  }
  
  // Update provider badge
  const badgeText = elements.resultsProvider.querySelector('.badge-text');
  badgeText.textContent = `Powered by ${provider}`;
  
  elements.resultsSection.classList.remove('hidden');
  
  // Scroll to results
  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Render plain text with basic formatting (fallback)
 */
function renderPlainText(text) {
  elements.resultsContent.innerHTML = '';
  
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inOrderedList) {
        html += '</ol>';
        inOrderedList = false;
      }
      continue;
    }
    
    // Format inline markdown (bold, italic, code)
    let formattedLine = formatInlineMarkdown(line);
    
    // Detect headers
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<h3>${formatInlineMarkdown(line.substring(4))}</h3>`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<h2>${formatInlineMarkdown(line.substring(3))}</h2>`;
    } else if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<h1>${formatInlineMarkdown(line.substring(2))}</h1>`;
    }
    // Detect unordered list items
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${formatInlineMarkdown(line.substring(2))}</li>`;
    }
    // Detect ordered list items
    else if (/^\d+\.\s/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) {
        html += '<ol>';
        inOrderedList = true;
      }
      html += `<li>${formatInlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`;
    }
    // Regular paragraph
    else {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += `<p>${formattedLine}</p>`;
    }
  }
  
  // Close any open lists
  if (inList) html += '</ul>';
  if (inOrderedList) html += '</ol>';
  
  elements.resultsContent.innerHTML = html;
  console.log('✅ Plain text rendered with basic formatting');
}

/**
 * Format inline markdown: **bold**, *italic*, `code`
 */
function formatInlineMarkdown(text) {
  // Escape HTML first
  text = escapeHtml(text);
  
  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not if it's part of **)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
  
  // Inline code: `code`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Links: [text](url)
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  return text;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Hide results
 */
function hideResults() {
  elements.resultsSection.classList.add('hidden');
  // Reset save button state
  elements.saveResultBtn.classList.remove('btn-success');
}

/**
 * Copy result to clipboard (plain text, not HTML)
 */
async function copyResult() {
  try {
    const text = elements.resultsContent.getAttribute('data-raw-text') || 
                 elements.resultsContent.innerText;
    
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalHTML = elements.copyResultBtn.innerHTML;
    elements.copyResultBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    elements.copyResultBtn.style.color = '#10b981';
    
    setTimeout(() => {
      elements.copyResultBtn.innerHTML = originalHTML;
      elements.copyResultBtn.style.color = '';
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    showError('Failed to copy to clipboard');
  }
}

/**
 * Show loading overlay
 */
function showLoading(text = 'Processing...') {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.remove('hidden');
}

/**
 * Update loading text
 */
function updateLoadingText(text) {
  elements.loadingText.textContent = text;
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

/**
 * Show warning message (non-dismissible info)
 */
function showWarning(message) {
  // Reuse error UI but with different styling
  elements.errorText.textContent = '💡 ' + message;
  elements.errorMessage.classList.remove('hidden');
  elements.errorMessage.style.background = '#fef3c7';
  elements.errorMessage.style.borderColor = '#fcd34d';
}

/**
 * Hide warning
 */
function hideWarning() {
  elements.errorMessage.style.background = '';
  elements.errorMessage.style.borderColor = '';
  hideError();
}

/**
 * Show success message
 */
function showSuccess(message) {
  elements.errorText.textContent = '✅ ' + message;
  elements.errorMessage.classList.remove('hidden');
  elements.errorMessage.style.background = '#d1fae5';
  elements.errorMessage.style.borderColor = '#6ee7b7';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideError();
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.errorMessage.style.background = '';
  elements.errorMessage.style.borderColor = '';
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    hideError();
  }, 10000);
}

/**
 * Hide error message
 */
function hideError() {
  elements.errorMessage.classList.add('hidden');
}

async function checkAuth() {
  console.log('🔐 Checking authentication...');
  
  const isAuth = await APIService.isAuthenticated();
  
  if (isAuth) {
    // User is authenticated - show main app
    console.log('✅ User authenticated');
    authElements.authScreen.classList.add('hidden');
    authElements.mainScreen.classList.remove('hidden');
    
    // Load and display user info
    const user = await StorageManager.getUserInfo();
    if (user) {
      const displayName = user.name || user.email;
      authElements.userName.textContent = displayName;
      const settingsUserNameEl = document.getElementById('settingsUserName');
      if (settingsUserNameEl) settingsUserNameEl.textContent = displayName;
    }
    
    // Continue with normal app initialization
    return true;
  } else {
    // User not authenticated - show login screen
    console.log('❌ User not authenticated');
    authElements.authScreen.classList.remove('hidden');
    authElements.mainScreen.classList.add('hidden');
    return false;
  }
}

/**
 * Show auth error message
 */
function showAuthError(message) {
  authElements.authErrorText.textContent = message;
  authElements.authError.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    authElements.authError.classList.add('hidden');
  }, 5000);
}

/**
 * Hide auth error message
 */
function hideAuthError() {
  authElements.authError.classList.add('hidden');
}

/**
 * Toggle between login and register forms
 */
authElements.showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  authElements.loginForm.classList.add('hidden');
  authElements.registerForm.classList.remove('hidden');
  hideAuthError();
});

authElements.showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  authElements.registerForm.classList.add('hidden');
  authElements.loginForm.classList.remove('hidden');
  hideAuthError();
});

/**
 * Handle login form submission
 */
authElements.loginBtn.addEventListener('click', async () => {
  const email = authElements.loginEmail.value.trim();
  const password = authElements.loginPassword.value;
  
  // Validation
  if (!email || !password) {
    showAuthError('Please enter both email and password');
    return;
  }
  
  // Show loading state
  authElements.loginBtn.disabled = true;
  authElements.loginBtnText.classList.add('hidden');
  authElements.loginBtnSpinner.classList.remove('hidden');
  hideAuthError();
  
  try {
    console.log('🔐 Attempting login...');
    const response = await APIService.login(email, password);
    
    if (response.success) {
      console.log('✅ Login successful!');
      
      // Show main app
      authElements.authScreen.classList.add('hidden');
      authElements.mainScreen.classList.remove('hidden');
      
      // Update user info
      const loginDisplayName = response.data.user.name || response.data.user.email;
      authElements.userName.textContent = loginDisplayName;
      const settingsUserNameElLogin = document.getElementById('settingsUserName');
      if (settingsUserNameElLogin) settingsUserNameElLogin.textContent = loginDisplayName;

      // Clear form
      authElements.loginEmail.value = '';
      authElements.loginPassword.value = '';
      
      // Initialize the main app
      await initializeApp();
      
    } else {
      console.error('❌ Login failed:', response.error);
      showAuthError(response.error || 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    showAuthError('An error occurred. Please try again.');
  } finally {
    // Reset button state
    authElements.loginBtn.disabled = false;
    authElements.loginBtnText.classList.remove('hidden');
    authElements.loginBtnSpinner.classList.add('hidden');
  }
});

/**
 * Handle register form submission
 */
authElements.registerBtn.addEventListener('click', async () => {
  const name = authElements.registerName.value.trim();
  const email = authElements.registerEmail.value.trim();
  const password = authElements.registerPassword.value;
  
  // Validation
  if (!name || !email || !password) {
    showAuthError('Please fill in all fields');
    return;
  }
  
  if (password.length < 8) {
    showAuthError('Password must be at least 8 characters long');
    return;
  }
  
  // Show loading state
  authElements.registerBtn.disabled = true;
  authElements.registerBtnText.classList.add('hidden');
  authElements.registerBtnSpinner.classList.remove('hidden');
  hideAuthError();
  
  try {
    console.log('🔐 Attempting registration...');
    const response = await APIService.register(email, password, name);
    
    if (response.success) {
      console.log('✅ Registration successful!');
      
      // Show main app
      authElements.authScreen.classList.add('hidden');
      authElements.mainScreen.classList.remove('hidden');
      
      // Update user info
      const regDisplayName = response.data.user.name || response.data.user.email;
      authElements.userName.textContent = regDisplayName;
      const settingsUserNameElReg = document.getElementById('settingsUserName');
      if (settingsUserNameElReg) settingsUserNameElReg.textContent = regDisplayName;

      // Clear form
      authElements.registerName.value = '';
      authElements.registerEmail.value = '';
      authElements.registerPassword.value = '';
      
      // Initialize the main app
      await initializeApp();
      
    } else {
      console.error('❌ Registration failed:', response.error);
      showAuthError(response.error || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    showAuthError('An error occurred. Please try again.');
  } finally {
    // Reset button state
    authElements.registerBtn.disabled = false;
    authElements.registerBtnText.classList.remove('hidden');
    authElements.registerBtnSpinner.classList.add('hidden');
  }
});

/**
 * Handle logout
 */
authElements.logoutBtn.addEventListener('click', async () => {
  console.log('🔐 Logging out...');

  try {
    await APIService.logout();

    // Clear local summaries so next user doesn't see stale data
    await StorageManager.clearAllSummaries();

    // Reset in-memory state
    currentSummary = null;
    currentContext = null;
    currentSavedId = null;
    pageId = null;

    // Hide any visible results
    hideResults();
    hideError();

    // Show login screen
    authElements.mainScreen.classList.add('hidden');
    authElements.authScreen.classList.remove('hidden');

    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('❌ Logout error:', error);
  }
});

/**
 * Handle Enter key on login form
 */
authElements.loginPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    authElements.loginBtn.click();
  }
});

authElements.loginEmail.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    authElements.loginPassword.focus();
  }
});

/**
 * Handle Enter key on register form
 */
authElements.registerPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    authElements.registerBtn.click();
  }
});

async function initializeApp() {
  console.log('🚀 Initializing main app...');
  
  // Wait for markdown libraries
  await waitForMarkdown();
  console.log('📚 Markdown libraries:', markdownReady ? 'Ready' : 'Not available (using fallback)');

  // Get current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    console.log('Current tab info:', currentTab);
  } catch (error) {
    console.error('Failed to get current tab:', error);
  }

  // Initialize AI
  try {
    const response = await chrome.runtime.sendMessage({ action: 'initializeAI' });
    if (response && response.status) {
      aiStatus = response.status;
      updateProviderDisplay();
    }
  } catch (error) {
    console.error('Failed to initialize AI:', error);
  }

  // Check storage usage and show warning if needed
  await checkStorageWarning();

  // Setup event listeners
  setupEventListeners();

  // Update summaries count
  await updateSummariesCount();

  // Load recent summaries on home tab
  await loadRecentSummaries();

  console.log('✅ Main app ready');
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
  const tabs = {
    home: { panel: document.getElementById('homeTab'), btn: document.getElementById('homeNavBtn') },
    history: { panel: document.getElementById('historyTab'), btn: document.getElementById('historyNavBtn') },
    settings: { panel: document.getElementById('settingsPanel'), btn: document.getElementById('settingsBtn') }
  };

  Object.entries(tabs).forEach(([name, { panel, btn }]) => {
    if (name === tabName) {
      panel?.classList.remove('hidden');
      btn?.classList.add('active');
    } else {
      panel?.classList.add('hidden');
      btn?.classList.remove('active');
    }
  });

  if (tabName === 'history') loadHistorySummaries();
  if (tabName === 'settings') loadOpenAISettings();
}

async function loadRecentSummaries() {
  const container = document.getElementById('recentSummariesList');
  if (!container) return;

  try {
    const summaries = (await StorageManager.getAllSummaries()).slice(0, 5);

    if (!summaries.length) {
      container.innerHTML = '<div class="empty-state">Read a page to get started</div>';
      return;
    }

    renderedSummaries = summaries;
    container.innerHTML = summaries.map((s, i) => renderSummaryCard(s, i)).join('');
  } catch (err) {
    console.error('loadRecentSummaries:', err);
  }
}

async function loadHistorySummaries(query = '') {
  const container = document.getElementById('historyList');
  if (!container) return;

  try {
    let summaries = await StorageManager.getAllSummaries();

    if (query) {
      const q = query.toLowerCase();
      summaries = summaries.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.summary || '').toLowerCase().includes(q)
      );
    }

    if (!summaries.length) {
      container.innerHTML = `<div class="empty-state">${query ? 'No results found' : 'No saved summaries yet'}</div>`;
      return;
    }

    renderedSummaries = summaries;
    container.innerHTML = summaries.map((s, i) => renderSummaryCard(s, i)).join('');
  } catch (err) {
    console.error('loadHistorySummaries:', err);
    container.innerHTML = '<div class="empty-state">Failed to load summaries</div>';
  }
}

function renderSummaryCard(s, index) {
  const title = s.title || s.page?.title || 'Untitled';
  const url = s.url || s.page?.url || '';
  const content = s.content || s.summary || '';
  const date = s.createdAt ? getTimeAgo(new Date(s.createdAt)) : '';
  const preview = stripMarkdown(content).slice(0, 120);

  return `
    <div class="summary-card" data-index="${index}">
      <div class="card-meta-row">
        <span class="card-badge card-badge-purple">Summary</span>
        <span class="card-date">${date}</span>
        ${url ? `<button class="btn-ghost" data-open-url="${escapeAttr(url)}" style="margin-left:auto;font-size:11px;padding:0" title="Open page">↗</button>` : ''}
      </div>
      <div class="card-title">${escapeHtml(title)}</div>
      <div class="card-preview">${escapeHtml(preview)}${content.length > 120 ? '…' : ''}</div>
    </div>
  `;
}

// Clicking a card navigates to details.html (flashcards, quizzes, full summary)
document.addEventListener('click', (e) => {
  // External link button — open URL, don't bubble to card
  const openBtn = e.target.closest('[data-open-url]');
  if (openBtn) {
    e.stopPropagation();
    chrome.tabs.create({ url: openBtn.dataset.openUrl });
    return;
  }

  const card = e.target.closest('.summary-card[data-index]');
  if (card) {
    const idx = parseInt(card.dataset.index, 10);
    const s = renderedSummaries[idx];
    if (!s || !s.id) return;
    const detailsUrl = chrome.runtime.getURL(`src/popup/details.html?id=${s.id}`);
    window.location.href = detailsUrl;
  }
});

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function stripMarkdown(text) {
  return (text || '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .trim();
}

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Initialize on popup open
 */
async function init() {
  console.log('🚀 Popup initializing...');
  
  // Check authentication first
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    await initializeApp();
  } else {
    console.log('👤 Showing login screen');
  }
}

// Initialize once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
