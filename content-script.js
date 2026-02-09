/**
 * Content Script for Habla Español
 * Injects an opaque overlay with quiz iframe on news.google.com.
 * The original page loads underneath — after quiz completion the overlay
 * is removed, revealing the page the user intended to visit.
 */

(function () {
  // Create opaque overlay immediately (before page renders)
  const overlay = document.createElement('div');
  overlay.id = 'habla-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#000;opacity:1;transition:opacity 0.3s ease;';
  document.documentElement.appendChild(overlay);

  function removeOverlay() {
    overlay.style.opacity = '0';
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 400);
  }

  // Check bypass status
  chrome.storage.local.get('bypassUntil', (data) => {
    if (data.bypassUntil && data.bypassUntil > Date.now()) {
      // Bypass active — remove overlay immediately
      removeOverlay();
      return;
    }

    // No bypass — show quiz iframe
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('quiz.html');
    iframe.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;border:none;z-index:2147483647;';
    iframe.allow = '';
    overlay.appendChild(iframe);

    // Listen for quiz completion message from iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'HABLA_QUIZ_COMPLETE') {
        const cooldownMs = event.data.cooldownMs || 0;
        chrome.storage.local.set({ bypassUntil: Date.now() + cooldownMs }, () => {
          removeOverlay();
        });
      }
    });
  });
})();
