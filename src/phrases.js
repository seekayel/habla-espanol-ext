/**
 * Phrase Data Loader for Habla Español
 * Loads phrases from data/phrases.json configuration
 */

class PhraseLoader {
  constructor() {
    this.data = null;
    this.phrases = [];
    this.categories = [];
  }

  /**
   * Load phrases from JSON file
   * @param {string} path - Path to phrases.json
   * @returns {Promise<void>}
   */
  async load(path = 'data/phrases.json') {
    try {
      const response = await fetch(chrome.runtime.getURL(path));
      this.data = await response.json();
      this.phrases = this.data.phrases || [];
      this.categories = this.data.categories || [];
    } catch (error) {
      console.error('Failed to load phrases:', error);
      throw error;
    }
  }

  /**
   * Get all phrases
   * @returns {Array}
   */
  getPhrases() {
    return this.phrases;
  }

  /**
   * Get a phrase by ID
   * @param {number} id
   * @returns {Object|null}
   */
  getPhrase(id) {
    return this.phrases.find(p => p.id === id) || null;
  }

  /**
   * Get phrases by category
   * @param {string} categoryId
   * @returns {Array}
   */
  getPhrasesByCategory(categoryId) {
    return this.phrases.filter(p => p.category === categoryId);
  }

  /**
   * Get category info
   * @param {string} categoryId
   * @returns {Object|null}
   */
  getCategory(categoryId) {
    return this.categories.find(c => c.id === categoryId) || null;
  }

  /**
   * Get all categories
   * @returns {Array}
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Generate SVG image for a phrase
   * @param {Object} phrase
   * @returns {string} SVG data URL
   */
  generatePhraseImage(phrase) {
    const category = this.getCategory(phrase.category);
    const bgColor = category?.color || '#6366f1';
    const emoji = phrase.emoji || '💬';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.darkenColor(bgColor, 30)};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect width="400" height="300" fill="url(#bg)" rx="24"/>
        <text x="200" y="130" font-size="80" text-anchor="middle" filter="url(#shadow)">${emoji}</text>
        <text x="200" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.9">${this.escapeXml(phrase.english)}</text>
        <text x="200" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.6">${this.escapeXml(category?.name || '')}</text>
      </svg>
    `.trim();

    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  /**
   * Escape XML special characters
   * @param {string} str
   * @returns {string}
   */
  escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Darken a hex color
   * @param {string} color - Hex color
   * @param {number} percent - Amount to darken
   * @returns {string}
   */
  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}

// Export for both browser and module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PhraseLoader };
} else if (typeof window !== 'undefined') {
  window.PhraseLoader = PhraseLoader;
}
