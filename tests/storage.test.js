/**
 * Tests for Storage Layer
 * Note: These tests require IndexedDB support
 */

function registerStorageTests(runner) {
  runner.describe('Storage', () => {
    let storage;

    runner.beforeEach(async () => {
      storage = new Storage();
      await storage.init();
      await storage.clearAll();
    });

    runner.afterEach(async () => {
      if (storage) {
        await storage.clearAll();
        storage.close();
      }
    });

    runner.it('should initialize without errors', async () => {
      const newStorage = new Storage();
      await newStorage.init();
      assert.ok(newStorage.db);
      newStorage.close();
    });

    runner.it('should save and retrieve progress', async () => {
      const progress = {
        phraseId: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: Date.now(),
        lastReview: Date.now(),
        totalReviews: 1,
        correctReviews: 1,
      };

      await storage.saveProgress(progress);
      const retrieved = await storage.getProgress(1);

      assert.ok(retrieved);
      assert.equal(retrieved.phraseId, 1);
      assert.equal(retrieved.easeFactor, 2.5);
    });

    runner.it('should return null for non-existent progress', async () => {
      const result = await storage.getProgress(999);
      assert.equal(result, null);
    });

    runner.it('should update existing progress', async () => {
      const progress = {
        phraseId: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: Date.now(),
        lastReview: Date.now(),
        totalReviews: 1,
        correctReviews: 1,
      };

      await storage.saveProgress(progress);

      progress.interval = 6;
      progress.repetitions = 2;
      await storage.saveProgress(progress);

      const retrieved = await storage.getProgress(1);
      assert.equal(retrieved.interval, 6);
      assert.equal(retrieved.repetitions, 2);
    });

    runner.it('should get all progress records', async () => {
      await storage.saveProgress({ phraseId: 1, easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: Date.now(), lastReview: null, totalReviews: 1, correctReviews: 1 });
      await storage.saveProgress({ phraseId: 2, easeFactor: 2.3, interval: 6, repetitions: 2, nextReview: Date.now(), lastReview: null, totalReviews: 2, correctReviews: 2 });

      const all = await storage.getAllProgress();

      assert.equal(all.length, 2);
    });

    runner.it('should get due for review', async () => {
      const now = Date.now();

      // Due phrase
      await storage.saveProgress({
        phraseId: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: now - 1000, // Past due
        lastReview: null,
        totalReviews: 1,
        correctReviews: 1,
      });

      // Not due phrase
      await storage.saveProgress({
        phraseId: 2,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: now + 86400000, // Due tomorrow
        lastReview: null,
        totalReviews: 1,
        correctReviews: 1,
      });

      const due = await storage.getDueForReview();

      assert.equal(due.length, 1);
      assert.equal(due[0].phraseId, 1);
    });

    runner.it('should clear all data', async () => {
      await storage.saveProgress({ phraseId: 1, easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: Date.now(), lastReview: null, totalReviews: 1, correctReviews: 1 });
      await storage.saveProgress({ phraseId: 2, easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: Date.now(), lastReview: null, totalReviews: 1, correctReviews: 1 });

      await storage.clearAll();

      const all = await storage.getAllProgress();
      assert.equal(all.length, 0);
    });
  });
}

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerStorageTests };
} else if (typeof window !== 'undefined') {
  window.registerStorageTests = registerStorageTests;
}
