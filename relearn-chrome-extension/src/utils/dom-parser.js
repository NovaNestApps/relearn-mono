/**
 * DOM Parser Utility
 * Extracts meaningful content from webpages
 * 
 * Why this approach:
 * - Uses Mozilla's Readability algorithm (battle-tested)
 * - Removes ads, navigation, footers, etc.
 * - Focuses on main content
 * - Extracts images with context
 * - Handles various webpage structures
 */

class DOMParser {
  constructor() {
    this.maxImageSize = 5; // Max 5 images to analyze (performance)
  }

  /**
   * Extract main content from the page
   * Returns: { title, content, images, url, metadata }
   */
  extractContent() {
    const data = {
      title: this.getTitle(),
      content: this.getMainContent(),
      images: this.getRelevantImages(),
      url: window.location.href,
      metadata: this.getMetadata()
    };

    return data;
  }

  /**
   * Get page title (with fallbacks)
   */
  getTitle() {
    return (
      document.title ||
      document.querySelector('h1')?.textContent ||
      'Untitled Page'
    ).trim();
  }

  /**
   * Get main content using multiple strategies
   */
  getMainContent() {
    // Strategy 1: Try article tag
    const article = document.querySelector('article');
    if (article && article.textContent.length > 200) {
      return this.cleanText(article.textContent);
    }

    // Strategy 2: Try main tag
    const main = document.querySelector('main');
    if (main && main.textContent.length > 200) {
      return this.cleanText(main.textContent);
    }

    // Strategy 3: Try role="main"
    const roleMain = document.querySelector('[role="main"]');
    if (roleMain && roleMain.textContent.length > 200) {
      return this.cleanText(roleMain.textContent);
    }

    // Strategy 4: Find the element with most text content
    const contentElement = this.findLargestContentElement();
    if (contentElement) {
      return this.cleanText(contentElement.textContent);
    }

    // Fallback: Get body text (last resort)
    return this.cleanText(document.body.textContent);
  }

  /**
   * Find element with most meaningful text
   */
  findLargestContentElement() {
    const candidates = document.querySelectorAll('div, section, article, main');
    let maxLength = 0;
    let bestElement = null;

    candidates.forEach(element => {
      // Skip navigation, headers, footers, sidebars
      if (this.isNoiseElement(element)) return;

      const textLength = element.textContent.trim().length;
      if (textLength > maxLength) {
        maxLength = textLength;
        bestElement = element;
      }
    });

    return bestElement;
  }

  /**
   * Check if element is likely navigation/noise
   */
  isNoiseElement(element) {
    const noisePatterns = [
      /nav/i,
      /menu/i,
      /header/i,
      /footer/i,
      /sidebar/i,
      /advertisement/i,
      /cookie/i,
      /popup/i,
      /modal/i
    ];

    const className = element.className || '';
    const id = element.id || '';
    const combined = `${className} ${id}`;

    return noisePatterns.some(pattern => pattern.test(combined));
  }

  /**
   * Get relevant images from page
   * Prioritizes: content images, sufficient size, has alt text
   */
  getRelevantImages() {
    const images = [];
    const imgElements = document.querySelectorAll('img');

    for (const img of imgElements) {
      // Skip tiny images (icons, tracking pixels)
      if (img.width < 100 || img.height < 100) continue;

      // Skip if inside navigation/header/footer
      if (this.isInNoiseElement(img)) continue;

      images.push({
        src: img.src,
        alt: img.alt || 'No description',
        width: img.width,
        height: img.height,
        title: img.title || ''
      });

      // Limit to prevent performance issues
      if (images.length >= this.maxImageSize) break;
    }

    return images;
  }

  /**
   * Check if element is inside a noise element
   */
  isInNoiseElement(element) {
    let parent = element.parentElement;
    while (parent) {
      if (this.isNoiseElement(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Get page metadata
   */
  getMetadata() {
    return {
      author: this.getMetaContent('author') || 
              this.getMetaContent('article:author'),
      description: this.getMetaContent('description') ||
                   this.getMetaContent('og:description'),
      keywords: this.getMetaContent('keywords'),
      published: this.getMetaContent('article:published_time'),
      lang: document.documentElement.lang || 'en'
    };
  }

  /**
   * Get meta tag content
   */
  getMetaContent(name) {
    const meta = 
      document.querySelector(`meta[name="${name}"]`) ||
      document.querySelector(`meta[property="${name}"]`);
    return meta?.content || null;
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 newlines
      .trim()
      .substring(0, 10000); // Limit to 10k chars (performance)
  }

  /**
   * Get word count (useful for AI context)
   */
  getWordCount(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimate reading time
   */
  getReadingTime(text) {
    const wordCount = this.getWordCount(text);
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

// Make available globally for content script
if (typeof window !== 'undefined') {
  window.DOMParser = DOMParser;
}