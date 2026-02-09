/**
 * Quiz Screen Controller for Habla Español
 * Handles phrase display, answer validation, and navigation
 */

class QuizController {
  constructor() {
    this.storage = null;
    this.srs = null;
    this.phraseLoader = null;
    this.currentPhrase = null;
    this.attempts = 0;
    this.revealTimer = null;
    this.isTestMode = new URLSearchParams(window.location.search).has('test');
    this.settings = { correctCooldownMin: 10, incorrectCooldownMin: 3 };

    this.el = {
      phraseImage: document.getElementById('phraseImage'),
      answerInput: document.getElementById('answerInput'),
      submitBtn: document.getElementById('submitBtn'),
      skipBtn: document.getElementById('skipBtn'),
      feedback: document.getElementById('feedback'),
      revealBar: document.getElementById('revealBar'),
      revealAnswer: document.getElementById('revealAnswer'),
      learnedCount: document.getElementById('learnedCount'),
      dueCount: document.getElementById('dueCount'),
      statsBar: document.getElementById('statsBar'),
      testModeBadge: document.getElementById('testModeBadge'),
      exitTestBtn: document.getElementById('exitTestBtn'),
    };
  }

  async init() {
    try {
      this.storage = new Storage();
      await this.storage.init();

      this.phraseLoader = new PhraseLoader();
      await this.phraseLoader.load('data/phrases.json');

      this.srs = new SpacedRepetition(this.storage, this.phraseLoader.getPhrases());

      await this.loadSettings();
      await this.loadNextPhrase();
      await this.updateStats();
      this.bind();

      if (this.isTestMode) {
        this.el.testModeBadge.classList.add('on');
      }

      this.el.answerInput.focus();
    } catch (err) {
      console.error('Init failed:', err);
      this.setFeedback('Failed to load. Refresh the page.', 'error');
    }
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('settings', (data) => {
        const s = data.settings || {};
        if (typeof s.correctCooldownMin === 'number') {
          this.settings.correctCooldownMin = s.correctCooldownMin;
        }
        if (typeof s.incorrectCooldownMin === 'number') {
          this.settings.incorrectCooldownMin = s.incorrectCooldownMin;
        }
        resolve();
      });
    });
  }

  bind() {
    this.el.submitBtn.addEventListener('click', () => this.submit());
    this.el.answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
    });
    this.el.skipBtn.addEventListener('click', () => this.skip());
    this.el.answerInput.addEventListener('input', () => this.resetFeedback());

    if (this.el.exitTestBtn) {
      this.el.exitTestBtn.addEventListener('click', () => window.close());
    }

    this.el.phraseImage.addEventListener('load', () => {
      this.el.phraseImage.classList.add('loaded');
    });
  }

  // ── Phrase loading ──

  getImagePhrases() {
    return this.phraseLoader.getPhrases().filter(p => p.image);
  }

  async loadNextPhrase() {
    const imagePhrases = this.getImagePhrases();

    if (imagePhrases.length > 0) {
      const next = await this.srs.getNextPhrase();
      this.currentPhrase = (next && next.image) ? next : imagePhrases[Math.floor(Math.random() * imagePhrases.length)];
    } else {
      this.currentPhrase = await this.srs.getNextPhrase();
    }

    if (!this.currentPhrase) {
      this.setFeedback('No phrases available.', 'error');
      return;
    }

    this.el.phraseImage.classList.remove('loaded');

    if (this.currentPhrase.image) {
      this.el.phraseImage.src = chrome.runtime.getURL(this.currentPhrase.image);
    } else {
      this.el.phraseImage.src = this.phraseLoader.generatePhraseImage(this.currentPhrase);
      this.el.phraseImage.classList.add('loaded');
    }

    this.attempts = 0;
    this.el.answerInput.value = '';
    this.resetFeedback();
    this.hideReveal();
  }

  // ── Submission ──

  async submit() {
    const answer = this.el.answerInput.value.trim();
    if (!answer) {
      this.setFeedback('type an answer', 'warning');
      this.shakeInput();
      return;
    }

    this.attempts++;
    const result = FuzzyMatcher.match(answer, this.currentPhrase.text);

    if (result.matches) {
      await this.onCorrect();
    } else {
      await this.onWrong();
    }
  }

  // ── Correct: show answer + congrats, then dismiss ──

  async onCorrect() {
    await this.srs.recordReview(this.currentPhrase.id, true, false);

    this.showReveal(this.currentPhrase.text, true);

    if (this.isTestMode) {
      // In practice mode, show congrats briefly then cycle
      clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(async () => {
        this.hideReveal();
        await this.loadNextPhrase();
        await this.updateStats();
        this.el.answerInput.focus();
      }, 2500);
    } else {
      // Show congrats briefly then dismiss with correct cooldown
      clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(() => {
        this.dismiss(this.settings.correctCooldownMin);
      }, 2500);
    }
  }

  // ── Wrong: show correct answer, then dismiss ──

  async onWrong() {
    this.shakeInput();
    this.flashError();

    this.showReveal(this.currentPhrase.text, false);

    if (this.isTestMode) {
      // In practice mode, show answer briefly then let them try again
      clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(() => {
        this.hideReveal();
      }, 3000);

      if (this.attempts >= 3) {
        await this.srs.recordReview(this.currentPhrase.id, false, false);
      }
    } else {
      // Record failure and dismiss with incorrect cooldown
      await this.srs.recordReview(this.currentPhrase.id, false, false);

      clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(() => {
        this.dismiss(this.settings.incorrectCooldownMin);
      }, 2500);
    }
  }

  // ── Skip / dismiss ──

  async skip() {
    await this.srs.recordReview(this.currentPhrase.id, false, true);

    if (this.isTestMode) {
      await this.loadNextPhrase();
      await this.updateStats();
      this.el.answerInput.focus();
    } else {
      this.dismiss(this.settings.incorrectCooldownMin);
    }
  }

  /**
   * Animate the quiz screen out, then navigate to the destination.
   * @param {number} cooldownMin - Cooldown in minutes before next quiz
   */
  dismiss(cooldownMin) {
    const cooldownMs = cooldownMin * 60000;
    document.body.classList.add('leaving');
    setTimeout(() => {
      if (window.parent !== window) {
        // Inside overlay iframe — notify content script
        window.parent.postMessage({ type: 'HABLA_QUIZ_COMPLETE', cooldownMs }, '*');
      } else {
        // Standalone (popup practice / test) — set bypass and navigate
        chrome.storage.local.set({ bypassUntil: Date.now() + cooldownMs }, () => {
          window.location.href = 'https://news.google.com';
        });
      }
    }, 300);
  }

  // ── Reveal bar ──

  showReveal(spanish, isCorrect = false) {
    this.el.revealAnswer.textContent = spanish;
    this.el.revealBar.classList.toggle('correct', isCorrect);
    this.el.revealBar.classList.add('visible');
    this.el.statsBar.classList.add('hide');
  }

  hideReveal() {
    this.el.revealBar.classList.remove('visible', 'correct');
    this.el.statsBar.classList.remove('hide');
  }

  // ── UI helpers ──

  setFeedback(msg, type = 'info') {
    this.el.feedback.className = 'fb';
    if (type !== 'info') this.el.feedback.classList.add(type);
    this.el.feedback.textContent = msg;
  }

  resetFeedback() {
    this.el.feedback.className = 'fb';
    this.el.feedback.textContent = 'escribe en español';
  }

  shakeInput() {
    const inp = this.el.answerInput;
    inp.classList.remove('shake');
    void inp.offsetWidth;
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 450);
  }

  flashError() {
    const inp = this.el.answerInput;
    inp.classList.add('err');
    setTimeout(() => inp.classList.remove('err'), 1200);
  }

  async updateStats() {
    try {
      const s = await this.srs.getStats();
      this.el.learnedCount.textContent = `${s.learned} learned`;
      this.el.dueCount.textContent = `${s.dueNow} due`;
    } catch (e) {
      console.error('Stats error:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuizController().init();
});
