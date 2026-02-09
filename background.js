/**
 * Background Service Worker for Habla Español
 * Handles extension lifecycle, dynamic redirect rules, and bypass management
 */

const REDIRECT_RULE_ID = 100;

/**
 * Install the dynamic redirect rule that sends news.google.com
 * to the quiz page with the original URL encoded in the hash.
 */
function installRedirectRule() {
  const quizUrl = chrome.runtime.getURL('quiz.html');
  return chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [REDIRECT_RULE_ID],
    addRules: [{
      id: REDIRECT_RULE_ID,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: quizUrl + '#\\0'
        }
      },
      condition: {
        regexFilter: '^(https?://news\\.google\\.com.*)$',
        resourceTypes: ['main_frame']
      }
    }]
  });
}

/**
 * Remove the dynamic redirect rule (for bypass periods).
 */
function removeRedirectRule() {
  return chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [REDIRECT_RULE_ID]
  });
}

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Habla Español installed');

    // Initialize storage with default values
    chrome.storage.local.set({
      bypassUntil: 0,
      settings: {
        enabled: true,
        strictAccents: false,
        correctCooldownMin: 10,
        incorrectCooldownMin: 3,
      }
    });
  }

  // Always ensure the dynamic redirect rule is installed
  installRedirectRule().catch(console.error);
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_BYPASS':
      chrome.storage.local.get('bypassUntil', (data) => {
        const bypassActive = data.bypassUntil && data.bypassUntil > Date.now();
        sendResponse({ bypass: bypassActive });
      });
      return true; // Keep channel open for async response

    case 'SET_BYPASS':
      chrome.storage.local.set({
        bypassUntil: Date.now() + (message.duration || 5000)
      }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'CLEAR_BYPASS':
      chrome.storage.local.set({ bypassUntil: 0 }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_SETTINGS':
      chrome.storage.local.get('settings', (data) => {
        sendResponse({ settings: data.settings || {} });
      });
      return true;

    case 'UPDATE_SETTINGS':
      chrome.storage.local.get('settings', (data) => {
        const updated = { ...data.settings, ...message.settings };
        chrome.storage.local.set({ settings: updated }, () => {
          sendResponse({ success: true, settings: updated });
        });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Dynamic rule management for bypass
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.bypassUntil) {
    const bypassUntil = changes.bypassUntil.newValue;

    if (bypassUntil && bypassUntil > Date.now()) {
      // Temporarily remove redirect rule
      removeRedirectRule().catch(console.error);

      // Re-install after bypass expires
      const delay = bypassUntil - Date.now();
      setTimeout(() => {
        installRedirectRule().catch(console.error);
      }, delay);
    } else {
      // Ensure redirect rule is active
      installRedirectRule().catch(console.error);
    }
  }
});

console.log('Habla Español background service started');
