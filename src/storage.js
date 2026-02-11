/**
 * IndexedDB Storage Layer for Habla Español
 * Manages phrase progress and review scheduling
 */

const DB_NAME = 'habla-espanol-db';
const DB_VERSION = 1;
const STORE_NAME = 'phrase_progress';

class Storage {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'phraseId' });
          store.createIndex('nextReview', 'nextReview', { unique: false });
          store.createIndex('repetitions', 'repetitions', { unique: false });
        }
      };
    });
  }

  /**
   * Get progress for a specific phrase
   * @param {number} phraseId
   * @returns {Promise<Object|null>}
   */
  async getProgress(phraseId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(phraseId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Save or update progress for a phrase
   * @param {Object} progress
   * @returns {Promise<void>}
   */
  async saveProgress(progress) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(progress);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get all phrase progress records
   * @returns {Promise<Array>}
   */
  async getAllProgress() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get phrases due for review (nextReview <= now)
   * @returns {Promise<Array>}
   */
  async getDueForReview() {
    const now = Date.now();
    const allProgress = await this.getAllProgress();
    return allProgress.filter(p => p.nextReview <= now);
  }

  /**
   * Clear all progress data (for testing)
   * @returns {Promise<void>}
   */
  async clearAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export for both browser and module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Storage };
} else if (typeof window !== 'undefined') {
  window.Storage = Storage;
}
