/**
 * Fuzzy Matching for Spanish Phrase Validation
 * Handles punctuation, accents, and minor typos
 */

class FuzzyMatcher {
  /**
   * Normalize a string for comparison
   * - Lowercase
   * - Trim whitespace
   * - Remove punctuation marks
   * @param {string} str
   * @returns {string}
   */
  static normalize(str) {
    if (!str) return '';

    return str
      .toLowerCase()
      .trim()
      // Remove Spanish punctuation and common marks
      .replace(/[¿¡?!.,;:'"()[\]{}…—–-]/g, '')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  static levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Check if answer matches expected phrase
   * @param {string} answer - User's answer
   * @param {string} expected - Expected phrase
   * @param {Object} options - Matching options
   * @returns {Object} { matches: boolean, similarity: number }
   */
  static match(answer, expected, options = {}) {
    const {
      maxDistance = null,        // Max Levenshtein distance (null = auto)
      minSimilarity = 0.85,      // Minimum similarity ratio
      strictAccents = false      // Whether to require exact accent matches
    } = options;

    // Normalize both strings
    let normalizedAnswer = this.normalize(answer);
    let normalizedExpected = this.normalize(expected);

    // Handle accents if not strict
    if (!strictAccents) {
      normalizedAnswer = this.removeAccents(normalizedAnswer);
      normalizedExpected = this.removeAccents(normalizedExpected);
    }

    // Exact match after normalization
    if (normalizedAnswer === normalizedExpected) {
      return { matches: true, similarity: 1.0, exact: true };
    }

    // Empty answer
    if (normalizedAnswer.length === 0) {
      return { matches: false, similarity: 0, exact: false };
    }

    // Calculate distance
    const distance = this.levenshteinDistance(normalizedAnswer, normalizedExpected);
    const maxLen = Math.max(normalizedAnswer.length, normalizedExpected.length);
    const similarity = 1 - (distance / maxLen);

    // Determine max allowed distance
    const allowedDistance = maxDistance !== null
      ? maxDistance
      : Math.floor(normalizedExpected.length / 5); // 1 error per 5 characters

    const matches = distance <= allowedDistance && similarity >= minSimilarity;

    return {
      matches,
      similarity,
      distance,
      exact: false
    };
  }

  /**
   * Remove accent marks from a string
   * @param {string} str
   * @returns {string}
   */
  static removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Get helpful feedback for incorrect answers
   * @param {string} answer
   * @param {string} expected
   * @returns {Object}
   */
  static getFeedback(answer, expected) {
    const result = this.match(answer, expected);

    if (result.matches) {
      return {
        type: 'correct',
        message: result.exact ? 'Perfect!' : 'Close enough!'
      };
    }

    const normalizedAnswer = this.normalize(answer);
    const normalizedExpected = this.normalize(expected);

    // Check if it's a partial match (beginning matches)
    if (normalizedExpected.startsWith(normalizedAnswer) && normalizedAnswer.length >= 3) {
      return {
        type: 'partial',
        message: 'Keep going...'
      };
    }

    // Check similarity for "almost there" feedback
    if (result.similarity >= 0.7) {
      return {
        type: 'close',
        message: 'Almost! Check your spelling.'
      };
    }

    return {
      type: 'incorrect',
      message: 'Try again'
    };
  }
}

// Export for both browser and module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FuzzyMatcher };
} else if (typeof window !== 'undefined') {
  window.FuzzyMatcher = FuzzyMatcher;
}
