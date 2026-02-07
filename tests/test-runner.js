/**
 * Lightweight Test Runner for Habla Español
 * No external dependencies required
 */

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
  }

  /**
   * Define a test suite
   * @param {string} name - Suite name
   * @param {Function} fn - Suite function containing tests
   */
  describe(name, fn) {
    this.currentSuite = {
      name,
      tests: [],
      beforeEach: null,
      afterEach: null,
    };
    this.suites.push(this.currentSuite);
    fn();
    this.currentSuite = null;
  }

  /**
   * Define a test case
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error('it() must be called inside describe()');
    }
    this.currentSuite.tests.push({ name, fn, skip: false });
  }

  /**
   * Skip a test
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  skip(name, fn) {
    if (!this.currentSuite) {
      throw new Error('skip() must be called inside describe()');
    }
    this.currentSuite.tests.push({ name, fn, skip: true });
  }

  /**
   * Set up function to run before each test
   * @param {Function} fn
   */
  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = fn;
    }
  }

  /**
   * Set up function to run after each test
   * @param {Function} fn
   */
  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach = fn;
    }
  }

  /**
   * Run all test suites
   * @returns {Promise<Object>} Results
   */
  async run() {
    console.log('\n🧪 Running tests...\n');

    for (const suite of this.suites) {
      console.log(`📦 ${suite.name}`);

      for (const test of suite.tests) {
        this.results.total++;

        if (test.skip) {
          this.results.skipped++;
          console.log(`  ⏭️  ${test.name} (skipped)`);
          continue;
        }

        try {
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          await test.fn();

          if (suite.afterEach) {
            await suite.afterEach();
          }

          this.results.passed++;
          console.log(`  ✅ ${test.name}`);
        } catch (error) {
          this.results.failed++;
          console.log(`  ❌ ${test.name}`);
          console.log(`     Error: ${error.message}`);
          if (error.stack) {
            const stackLines = error.stack.split('\n').slice(1, 3);
            stackLines.forEach(line => console.log(`     ${line.trim()}`));
          }
        }
      }
    }

    // Print summary
    console.log('\n' + '─'.repeat(50));
    console.log(`Results: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.skipped} skipped`);
    console.log('─'.repeat(50) + '\n');

    return this.results;
  }
}

/**
 * Assertion library
 */
const assert = {
  /**
   * Assert that a value is truthy
   */
  ok(value, message) {
    if (!value) {
      throw new Error(message || `Expected ${value} to be truthy`);
    }
  },

  /**
   * Assert equality (===)
   */
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },

  /**
   * Assert deep equality
   */
  deepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${actualStr} to deeply equal ${expectedStr}`);
    }
  },

  /**
   * Assert inequality
   */
  notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `Expected ${JSON.stringify(actual)} to not equal ${JSON.stringify(expected)}`);
    }
  },

  /**
   * Assert that a function throws
   */
  throws(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  },

  /**
   * Assert a value is within a range
   */
  inRange(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
    }
  },

  /**
   * Assert approximate equality (for floats)
   */
  approximately(actual, expected, delta, message) {
    if (Math.abs(actual - expected) > delta) {
      throw new Error(message || `Expected ${actual} to be approximately ${expected} (±${delta})`);
    }
  },

  /**
   * Assert that array contains value
   */
  contains(arr, value, message) {
    if (!arr.includes(value)) {
      throw new Error(message || `Expected array to contain ${JSON.stringify(value)}`);
    }
  },

  /**
   * Assert that a value is an instance of a class
   */
  instanceOf(value, cls, message) {
    if (!(value instanceof cls)) {
      throw new Error(message || `Expected value to be instance of ${cls.name}`);
    }
  },
};

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, assert };
} else if (typeof window !== 'undefined') {
  window.TestRunner = TestRunner;
  window.assert = assert;
}
