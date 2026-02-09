/**
 * Popup Controller for Habla Español
 * Handles menu actions and stats display
 */

class PopupController {
  constructor() {
    this.storage = null;
    this.srs = null;
    this.phrases = [];
  }

  async init() {
    try {
      // Initialize storage
      this.storage = new Storage();
      await this.storage.init();

      // Load phrases from JSON
      const response = await fetch(chrome.runtime.getURL('data/phrases.json'));
      const data = await response.json();
      this.phrases = data.phrases || [];

      // Initialize SRS
      this.srs = new SpacedRepetition(this.storage, this.phrases);

      // Update stats display
      await this.updateStats();

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to initialize popup:', error);
    }
  }

  setupEventListeners() {
    // Practice Now - opens quiz screen in new tab
    document.getElementById('practiceBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('quiz.html')
      });
      window.close();
    });

    // Test Quiz Screen - simulates visiting blocked site
    document.getElementById('testBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('quiz.html?test=true')
      });
      window.close();
    });

    // Reset Progress
    document.getElementById('resetBtn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        await this.storage.clearAll();
        await this.updateStats();
        alert('Progress has been reset.');
      }
    });

    // Run Tests link
    document.getElementById('testsLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: chrome.runtime.getURL('tests/test-runner.html')
      });
      window.close();
    });
  }

  async updateStats() {
    try {
      const stats = await this.srs.getStats();

      document.getElementById('learnedCount').textContent = stats.learned;
      document.getElementById('dueCount').textContent = stats.dueToday;

    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});
