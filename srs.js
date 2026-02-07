/**
 * SM-2 Spaced Repetition Algorithm for Habla Español
 * Based on SuperMemo 2 algorithm by Piotr Wozniak
 */

class SpacedRepetition {
  /**
   * @param {Storage} storage - Storage instance for persistence
   * @param {Array} phrases - Array of phrase objects
   */
  constructor(storage, phrases) {
    this.storage = storage;
    this.phrases = phrases;
  }

  /**
   * Create initial progress object for a new phrase
   * @param {number} phraseId
   * @returns {Object}
   */
  createInitialProgress(phraseId) {
    return {
      phraseId,
      easeFactor: 2.5,    // Initial ease factor
      interval: 0,         // Days until next review
      repetitions: 0,      // Successful repetitions in a row
      nextReview: 0,       // Timestamp for next review (0 = never reviewed)
      lastReview: null,    // Timestamp of last review
      totalReviews: 0,     // Total number of reviews
      correctReviews: 0    // Number of correct reviews
    };
  }

  /**
   * Calculate new interval and ease factor based on quality
   * @param {Object} progress - Current progress
   * @param {number} quality - Quality of response (0-5)
   *   0 - Complete blackout
   *   1 - Incorrect, but recognized
   *   2 - Incorrect, easy to recall
   *   3 - Correct with serious difficulty
   *   4 - Correct with hesitation
   *   5 - Perfect response
   * @returns {Object} Updated progress
   */
  calculateNextReview(progress, quality) {
    const now = Date.now();
    const updated = { ...progress };

    updated.lastReview = now;
    updated.totalReviews++;

    if (quality >= 3) {
      // Correct response
      updated.correctReviews++;

      if (updated.repetitions === 0) {
        updated.interval = 1;
      } else if (updated.repetitions === 1) {
        updated.interval = 6;
      } else {
        updated.interval = Math.round(updated.interval * updated.easeFactor);
      }

      updated.repetitions++;
    } else {
      // Incorrect response - reset
      updated.repetitions = 0;
      updated.interval = 1;
    }

    // Update ease factor (minimum 1.3)
    const efChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    updated.easeFactor = Math.max(1.3, updated.easeFactor + efChange);

    // Calculate next review timestamp
    updated.nextReview = now + (updated.interval * 24 * 60 * 60 * 1000);

    return updated;
  }

  /**
   * Get the next phrase to review
   * Priority: Due phrases first (oldest first), then new phrases
   * @returns {Promise<Object|null>} Phrase object or null if none available
   */
  async getNextPhrase() {
    const allProgress = await this.storage.getAllProgress();
    const progressMap = new Map(allProgress.map(p => [p.phraseId, p]));
    const now = Date.now();

    // Find due phrases (already reviewed, due for review)
    const duePhrases = [];
    for (const progress of allProgress) {
      if (progress.nextReview <= now && progress.repetitions > 0) {
        duePhrases.push({
          phrase: this.phrases.find(p => p.id === progress.phraseId),
          progress,
          dueTime: progress.nextReview
        });
      }
    }

    // Sort by due time (oldest first)
    duePhrases.sort((a, b) => a.dueTime - b.dueTime);

    if (duePhrases.length > 0) {
      return duePhrases[0].phrase;
    }

    // Find new phrases (never reviewed)
    const reviewedIds = new Set(allProgress.map(p => p.phraseId));
    const newPhrases = this.phrases.filter(p => !reviewedIds.has(p.id));

    if (newPhrases.length > 0) {
      return newPhrases[0];
    }

    // If all phrases reviewed and none due, return the one due soonest
    if (allProgress.length > 0) {
      const nextDue = allProgress.reduce((min, p) =>
        p.nextReview < min.nextReview ? p : min
      );
      return this.phrases.find(p => p.id === nextDue.phraseId);
    }

    return this.phrases[0] || null;
  }

  /**
   * Record a review result
   * @param {number} phraseId
   * @param {boolean} correct - Whether the answer was correct
   * @param {boolean} skipped - Whether the user skipped
   * @returns {Promise<Object>} Updated progress
   */
  async recordReview(phraseId, correct, skipped = false) {
    let progress = await this.storage.getProgress(phraseId);

    if (!progress) {
      progress = this.createInitialProgress(phraseId);
    }

    // Determine quality rating
    let quality;
    if (skipped) {
      quality = 0; // Complete failure
    } else if (correct) {
      quality = 4; // Correct (default to "with hesitation")
    } else {
      quality = 1; // Incorrect but tried
    }

    const updated = this.calculateNextReview(progress, quality);
    await this.storage.saveProgress(updated);

    return updated;
  }

  /**
   * Get statistics for all phrases
   * @returns {Promise<Object>}
   */
  async getStats() {
    const allProgress = await this.storage.getAllProgress();
    const now = Date.now();

    const stats = {
      totalPhrases: this.phrases.length,
      learned: 0,      // Reviewed at least once
      mastered: 0,     // Interval >= 21 days
      dueNow: 0,       // Due for review
      dueToday: 0,     // Due within 24 hours
      averageEase: 0,
      totalReviews: 0,
      accuracy: 0
    };

    let easeSum = 0;
    let correctSum = 0;
    let reviewSum = 0;

    for (const p of allProgress) {
      stats.learned++;
      easeSum += p.easeFactor;
      correctSum += p.correctReviews;
      reviewSum += p.totalReviews;

      if (p.interval >= 21) stats.mastered++;
      if (p.nextReview <= now) stats.dueNow++;
      if (p.nextReview <= now + 24 * 60 * 60 * 1000) stats.dueToday++;
    }

    if (stats.learned > 0) {
      stats.averageEase = easeSum / stats.learned;
    }
    stats.totalReviews = reviewSum;
    if (reviewSum > 0) {
      stats.accuracy = correctSum / reviewSum;
    }

    return stats;
  }
}

// Export for both browser and module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpacedRepetition };
} else if (typeof window !== 'undefined') {
  window.SpacedRepetition = SpacedRepetition;
}
