/**
 * Content Script
 * Runs on every webpage, extracts content, handles messages
 * 
 * Why: Content scripts have access to the DOM
 * Communication: Popup/Background → Content Script → DOM
 */

// Initialize parser
const parser = new window.DOMParser();

/**
 * Listen for messages from popup/background
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    handleExtractContent(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'showNotification') {
    showNotification(request.message, request.type, request.duration);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ success: true, active: true });
    return true;
  }
});

/**
 * Extract content from current page
 */
function handleExtractContent(sendResponse) {
  try {
    window.logger?.info('Extracting content from page...');
    
    // Extract all content
    const content = parser.extractContent();
    
    // Add some metadata
    content.extractedAt = new Date().toISOString();
    content.wordCount = parser.getWordCount(content.content);
    content.readingTime = parser.getReadingTime(content.content);
    
    window.logger?.success('Content extracted successfully', {
      title: content.title,
      words: content.wordCount,
      images: content.images.length
    });

    sendResponse({
      success: true,
      data: content
    });
  } catch (error) {
    window.logger?.error('Content extraction failed:', error);
    
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Show notification on page
 */
function showNotification(message, type = 'info', duration = 5000) {
  if (window.NotificationUI) {
    window.NotificationUI.show(message, type, duration);
  }
}

/**
 * Initialize
 */
function initialize() {
  window.logger?.info('Content script loaded on:', window.location.href);
  
  // Listen for keyboard shortcuts (optional future feature)
  document.addEventListener('keydown', (e) => {
    // Alt + Shift + R = Read page
    if (e.altKey && e.shiftKey && e.key === 'R') {
      chrome.runtime.sendMessage({ action: 'triggerRead' });
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}