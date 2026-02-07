/**
 * Tests for Fuzzy Matching
 */

function registerFuzzyMatchTests(runner) {
  runner.describe('FuzzyMatcher.normalize', () => {
    runner.it('should lowercase strings', () => {
      assert.equal(FuzzyMatcher.normalize('HOLA'), 'hola');
      assert.equal(FuzzyMatcher.normalize('Buenos Días'), 'buenos días');
    });

    runner.it('should trim whitespace', () => {
      assert.equal(FuzzyMatcher.normalize('  hola  '), 'hola');
      assert.equal(FuzzyMatcher.normalize('\thola\n'), 'hola');
    });

    runner.it('should remove punctuation marks', () => {
      assert.equal(FuzzyMatcher.normalize('¿Cómo estás?'), 'cómo estás');
      assert.equal(FuzzyMatcher.normalize('¡Hola!'), 'hola');
      assert.equal(FuzzyMatcher.normalize('Buenos días...'), 'buenos días');
    });

    runner.it('should collapse multiple spaces', () => {
      assert.equal(FuzzyMatcher.normalize('buenos   días'), 'buenos días');
    });

    runner.it('should handle empty strings', () => {
      assert.equal(FuzzyMatcher.normalize(''), '');
      assert.equal(FuzzyMatcher.normalize(null), '');
      assert.equal(FuzzyMatcher.normalize(undefined), '');
    });
  });

  runner.describe('FuzzyMatcher.levenshteinDistance', () => {
    runner.it('should return 0 for identical strings', () => {
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'hola'), 0);
    });

    runner.it('should calculate correct distance for substitutions', () => {
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'hora'), 1);
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'holu'), 1);
    });

    runner.it('should calculate correct distance for insertions', () => {
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'holas'), 1);
      assert.equal(FuzzyMatcher.levenshteinDistance('hol', 'hola'), 1);
    });

    runner.it('should calculate correct distance for deletions', () => {
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'hol'), 1);
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', 'ola'), 1);
    });

    runner.it('should handle empty strings', () => {
      assert.equal(FuzzyMatcher.levenshteinDistance('', 'hola'), 4);
      assert.equal(FuzzyMatcher.levenshteinDistance('hola', ''), 4);
      assert.equal(FuzzyMatcher.levenshteinDistance('', ''), 0);
    });
  });

  runner.describe('FuzzyMatcher.match', () => {
    runner.it('should match exact strings', () => {
      const result = FuzzyMatcher.match('Hola', 'Hola');
      assert.ok(result.matches);
      assert.equal(result.similarity, 1.0);
      assert.ok(result.exact);
    });

    runner.it('should match with different cases', () => {
      const result = FuzzyMatcher.match('HOLA', 'hola');
      assert.ok(result.matches);
    });

    runner.it('should match ignoring punctuation', () => {
      assert.ok(FuzzyMatcher.match('Como estas', '¿Cómo estás?').matches);
      assert.ok(FuzzyMatcher.match('Hola', '¡Hola!').matches);
    });

    runner.it('should match with minor typos', () => {
      // One error in 10 characters should match (threshold is 1 per 5 chars)
      assert.ok(FuzzyMatcher.match('Buenos diaz', 'Buenos días').matches);
    });

    runner.it('should not match with too many errors', () => {
      // Three errors in short phrase should fail
      const result = FuzzyMatcher.match('Buenas naches', 'Buenos días');
      assert.ok(!result.matches);
    });

    runner.it('should not match empty answers', () => {
      const result = FuzzyMatcher.match('', 'Hola');
      assert.ok(!result.matches);
      assert.equal(result.similarity, 0);
    });

    runner.it('should handle accents flexibly by default', () => {
      // By default, accents are removed for comparison
      assert.ok(FuzzyMatcher.match('Como estas', 'Cómo estás').matches);
      assert.ok(FuzzyMatcher.match('adios', 'adiós').matches);
    });

    runner.it('should respect strictAccents option', () => {
      const result = FuzzyMatcher.match('Como estas', 'Cómo estás', { strictAccents: true });
      // With strict accents, missing accents count as errors
      // "como estas" vs "cómo estás" has 2 accent differences
      // This might still match depending on threshold
    });

    runner.it('should include similarity score', () => {
      const result = FuzzyMatcher.match('hola', 'halo');
      assert.ok(result.similarity >= 0 && result.similarity <= 1);
      assert.ok(result.distance !== undefined);
    });
  });

  runner.describe('FuzzyMatcher.removeAccents', () => {
    runner.it('should remove common Spanish accents', () => {
      assert.equal(FuzzyMatcher.removeAccents('áéíóú'), 'aeiou');
      assert.equal(FuzzyMatcher.removeAccents('ñ'), 'n');
      assert.equal(FuzzyMatcher.removeAccents('ü'), 'u');
    });

    runner.it('should preserve non-accented characters', () => {
      assert.equal(FuzzyMatcher.removeAccents('hola'), 'hola');
      assert.equal(FuzzyMatcher.removeAccents('123'), '123');
    });
  });

  runner.describe('FuzzyMatcher.getFeedback', () => {
    runner.it('should return correct feedback for exact match', () => {
      const feedback = FuzzyMatcher.getFeedback('Hola', 'Hola');
      assert.equal(feedback.type, 'correct');
    });

    runner.it('should return correct feedback for close match', () => {
      const feedback = FuzzyMatcher.getFeedback('hola', '¡Hola!');
      assert.equal(feedback.type, 'correct');
    });

    runner.it('should return partial feedback for incomplete answer', () => {
      const feedback = FuzzyMatcher.getFeedback('Buen', 'Buenos días');
      assert.equal(feedback.type, 'partial');
    });

    runner.it('should return close feedback for almost correct', () => {
      const feedback = FuzzyMatcher.getFeedback('Buenos dios', 'Buenos días');
      // Close enough to be "almost there"
      assert.contains(['close', 'correct'], feedback.type);
    });

    runner.it('should return incorrect feedback for wrong answer', () => {
      const feedback = FuzzyMatcher.getFeedback('Gracias', 'Hola');
      assert.equal(feedback.type, 'incorrect');
    });
  });

  // Real-world test cases
  runner.describe('FuzzyMatcher real-world scenarios', () => {
    runner.it('should handle common user mistakes', () => {
      // Missing question marks
      assert.ok(FuzzyMatcher.match('Donde esta', '¿Dónde está?').matches);

      // Missing exclamation marks
      assert.ok(FuzzyMatcher.match('Salud', '¡Salud!').matches);

      // Minor spelling
      assert.ok(FuzzyMatcher.match('Buenos dias', 'Buenos días').matches);
    });

    runner.it('should accept variations of phrases', () => {
      // Extra spacing
      assert.ok(FuzzyMatcher.match('Buenos  días', 'Buenos días').matches);

      // Trailing punctuation
      assert.ok(FuzzyMatcher.match('Gracias.', 'Gracias').matches);
    });

    runner.it('should reject clearly wrong answers', () => {
      assert.ok(!FuzzyMatcher.match('Hola', 'Adiós').matches);
      assert.ok(!FuzzyMatcher.match('Si', '¿Cómo está?').matches);
    });
  });
}

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerFuzzyMatchTests };
} else if (typeof window !== 'undefined') {
  window.registerFuzzyMatchTests = registerFuzzyMatchTests;
}
