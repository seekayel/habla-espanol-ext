/**
 * Background Service Worker for Habla Español
 * Handles extension lifecycle and bypass management
 */

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
      }
    });
  }
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
      // Temporarily disable blocking rule
      chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['block_rules']
      }).catch(console.error);

      // Re-enable after bypass expires
      const delay = bypassUntil - Date.now();
      setTimeout(() => {
        chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ['block_rules']
        }).catch(console.error);
      }, delay);
    } else {
      // Ensure blocking is enabled
      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['block_rules']
      }).catch(console.error);
    }
  }
});

console.log('Habla Español background service started');
