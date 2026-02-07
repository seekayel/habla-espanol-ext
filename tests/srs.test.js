/**
 * Tests for Spaced Repetition System
 */

// Mock Storage for testing
class MockStorage {
  constructor() {
    this.data = new Map();
  }

  async init() {
    return Promise.resolve();
  }

  async getProgress(phraseId) {
    return this.data.get(phraseId) || null;
  }

  async saveProgress(progress) {
    this.data.set(progress.phraseId, progress);
  }

  async getAllProgress() {
    return Array.from(this.data.values());
  }

  async clearAll() {
    this.data.clear();
  }
}

// Test data
const testPhrases = [
  { id: 1, text: 'Hola', category: 'basics' },
  { id: 2, text: 'Buenos días', category: 'basics' },
  { id: 3, text: 'Gracias', category: 'basics' },
];

function registerSRSTests(runner) {
  runner.describe('SpacedRepetition', () => {
    let storage;
    let srs;

    runner.beforeEach(() => {
      storage = new MockStorage();
      srs = new SpacedRepetition(storage, testPhrases);
    });

    runner.it('should create initial progress with correct defaults', () => {
      const progress = srs.createInitialProgress(1);

      assert.equal(progress.phraseId, 1);
      assert.equal(progress.easeFactor, 2.5);
      assert.equal(progress.interval, 0);
      assert.equal(progress.repetitions, 0);
      assert.equal(progress.nextReview, 0);
      assert.equal(progress.lastReview, null);
      assert.equal(progress.totalReviews, 0);
      assert.equal(progress.correctReviews, 0);
    });

    runner.it('should increase interval after correct answer (quality 4)', () => {
      const progress = srs.createInitialProgress(1);
      const updated = srs.calculateNextReview(progress, 4);

      assert.equal(updated.interval, 1, 'First interval should be 1 day');
      assert.equal(updated.repetitions, 1);
      assert.ok(updated.nextReview > Date.now());
    });

    runner.it('should set interval to 6 days on second correct review', () => {
      let progress = srs.createInitialProgress(1);
      progress = srs.calculateNextReview(progress, 4);
      progress = srs.calculateNextReview(progress, 4);

      assert.equal(progress.interval, 6, 'Second interval should be 6 days');
      assert.equal(progress.repetitions, 2);
    });

    runner.it('should multiply interval by ease factor on third+ review', () => {
      let progress = srs.createInitialProgress(1);
      progress = srs.calculateNextReview(progress, 4);  // 1 day
      progress = srs.calculateNextReview(progress, 4);  // 6 days
      progress = srs.calculateNextReview(progress, 4);  // 6 * 2.5 = 15 days

      // Ease factor decreases slightly with quality 4
      assert.ok(progress.interval >= 14 && progress.interval <= 16);
    });

    runner.it('should reset interval on incorrect answer (quality < 3)', () => {
      let progress = srs.createInitialProgress(1);
      progress = srs.calculateNextReview(progress, 4);  // Pass
      progress = srs.calculateNextReview(progress, 4);  // Pass
      progress = srs.calculateNextReview(progress, 2);  // Fail

      assert.equal(progress.interval, 1);
      assert.equal(progress.repetitions, 0);
    });

    runner.it('should decrease ease factor on low quality answers', () => {
      let progress = srs.createInitialProgress(1);
      const initialEase = progress.easeFactor;

      progress = srs.calculateNextReview(progress, 2);

      assert.ok(progress.easeFactor < initialEase, 'Ease factor should decrease');
    });

    runner.it('should increase ease factor on high quality answers', () => {
      let progress = srs.createInitialProgress(1);
      progress.easeFactor = 2.0; // Set below max

      progress = srs.calculateNextReview(progress, 5);

      assert.ok(progress.easeFactor > 2.0, 'Ease factor should increase');
    });

    runner.it('should never let ease factor go below 1.3', () => {
      let progress = srs.createInitialProgress(1);

      // Many failures
      for (let i = 0; i < 20; i++) {
        progress = srs.calculateNextReview(progress, 0);
      }

      assert.ok(progress.easeFactor >= 1.3, 'Ease factor should not go below 1.3');
    });

    runner.it('should track total and correct reviews', () => {
      let progress = srs.createInitialProgress(1);

      progress = srs.calculateNextReview(progress, 4);  // Correct
      progress = srs.calculateNextReview(progress, 2);  // Incorrect
      progress = srs.calculateNextReview(progress, 5);  // Correct

      assert.equal(progress.totalReviews, 3);
      assert.equal(progress.correctReviews, 2);
    });

    runner.it('should return first phrase when no progress exists', async () => {
      const phrase = await srs.getNextPhrase();

      assert.equal(phrase.id, 1);
    });

    runner.it('should return due phrase over new phrase', async () => {
      // Add progress for phrase 1 with past due date
      await storage.saveProgress({
        phraseId: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: Date.now() - 1000,  // Due in the past
        lastReview: Date.now() - 86400000,
        totalReviews: 1,
        correctReviews: 1,
      });

      const phrase = await srs.getNextPhrase();

      assert.equal(phrase.id, 1);
    });

    runner.it('should return new phrase when none are due', async () => {
      // Add progress for phrase 1 with future due date
      await storage.saveProgress({
        phraseId: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: Date.now() + 86400000,  // Due tomorrow
        lastReview: Date.now(),
        totalReviews: 1,
        correctReviews: 1,
      });

      const phrase = await srs.getNextPhrase();

      assert.equal(phrase.id, 2, 'Should return next new phrase');
    });

    runner.it('should record correct review', async () => {
      await srs.recordReview(1, true, false);

      const progress = await storage.getProgress(1);

      assert.ok(progress);
      assert.equal(progress.repetitions, 1);
      assert.equal(progress.correctReviews, 1);
    });

    runner.it('should record skipped review as failure', async () => {
      await srs.recordReview(1, false, true);

      const progress = await storage.getProgress(1);

      assert.ok(progress);
      assert.equal(progress.repetitions, 0);
      assert.equal(progress.correctReviews, 0);
      assert.equal(progress.totalReviews, 1);
    });

    runner.it('should calculate statistics correctly', async () => {
      // Add some progress
      await storage.saveProgress({
        phraseId: 1,
        easeFactor: 2.5,
        interval: 30,  // Mastered
        repetitions: 5,
        nextReview: Date.now() - 1000,  // Due
        lastReview: Date.now() - 86400000,
        totalReviews: 5,
        correctReviews: 4,
      });

      await storage.saveProgress({
        phraseId: 2,
        easeFactor: 2.0,
        interval: 3,
        repetitions: 2,
        nextReview: Date.now() + 86400000,
        lastReview: Date.now(),
        totalReviews: 3,
        correctReviews: 2,
      });

      const stats = await srs.getStats();

      assert.equal(stats.totalPhrases, 3);
      assert.equal(stats.learned, 2);
      assert.equal(stats.mastered, 1);
      assert.equal(stats.dueNow, 1);
      assert.equal(stats.totalReviews, 8);
      assert.approximately(stats.accuracy, 0.75, 0.01);
    });
  });
}

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerSRSTests, MockStorage };
} else if (typeof window !== 'undefined') {
  window.registerSRSTests = registerSRSTests;
  window.MockStorage = MockStorage;
}
