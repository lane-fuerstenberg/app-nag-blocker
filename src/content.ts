import browser from 'webextension-polyfill';

// Set to true for verbose debug logging
const DEBUG = false;

// App-nag patterns - regex patterns that match various "use our app" prompts
const appNagPatterns = [
  /in.the.app/i,          // generic - catches "watch this in the app", "view in the app", etc.
  /open.*in.*app/i,
  /view.*in.*app/i,
  /use.*the.*app/i,
  /get.*the.*app/i,
  /continue.*in.*app/i,
  /better.*in.*the.*app/i,
  /download.*app/i,
  /install.*app/i,
  /try.*the.*app/i,
  /switch.*to.*app/i,
  /get.*full.*experience/i,
];

// Dismiss patterns - regex for common dismiss buttons
const dismissPatterns = [
  /^x$/i,
  /^\s*not now\s*$/i,
  /^\s*no thanks\s*$/i,
  /^\s*no,?\s*thanks\s*$/i,
  /^\s*maybe later\s*$/i,
  /^\s*close\s*$/i,
  /^\s*dismiss\s*$/i,
  /^\s*skip\s*$/i,
  /continue.*(?:in|on|with).*(?:browser|web|site)/i,
  /stay.*(?:on|in).*(?:web|browser|site)/i,
  /use.*mobile.*site/i,
];

// Check if element looks like a modal/overlay based on CSS properties
function isModalLike(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  // Fixed position is the key indicator for app-nag banners/modals
  const isFixed = style.position === 'fixed';
  const isAbsoluteWithZIndex = style.position === 'absolute' && parseInt(style.zIndex) > 0;

  const coversSignificantArea =
    rect.width > window.innerWidth * 0.5 ||
    rect.height > window.innerHeight * 0.2;

  // For fixed elements, we're more lenient - they're likely banners/modals
  if (isFixed && coversSignificantArea) {
    return true;
  }

  // For absolute positioned, require z-index
  if (isAbsoluteWithZIndex && coversSignificantArea) {
    return true;
  }

  return false;
}

// Max text length to check (prevents ReDoS on malicious pages with huge text)
const MAX_TEXT_LENGTH = 5000;

// Check if text content matches app-nag phrases
function containsAppNagText(element: HTMLElement): boolean {
  const text = (element.textContent?.toLowerCase() ?? '').slice(0, MAX_TEXT_LENGTH);
  return appNagPatterns.some(pattern => pattern.test(text));
}

// Check if text content matches dismiss phrases
function containsDismissText(text: string): boolean {
  const limitedText = text.slice(0, MAX_TEXT_LENGTH);
  return dismissPatterns.some(pattern => pattern.test(limitedText));
}

// Find clickable dismiss element - first in modal, then globally
function findDismissElement(modal: HTMLElement): HTMLElement | null {
  // Try within modal first
  const inModal = findDismissInContainer(modal);
  if (inModal) {
    return inModal;
  }

  // Search globally if not found in modal
  if (DEBUG) console.log('[App-Nag Blocker] Searching globally for dismiss element');
  return findDismissInContainer(document.body);
}

// Search for dismiss element within a container
function findDismissInContainer(container: HTMLElement): HTMLElement | null {
  // First: check for icon buttons with close-related attributes (X buttons)
  const closeByAttr = container.querySelector<HTMLElement>(
    '[aria-label*="close" i], [aria-label*="dismiss" i], [title*="close" i], ' +
    '[aria-label*="cancel" i], [data-testid*="close" i], [class*="close" i]:not([class*="disclosure"])'
  );
  if (closeByAttr) {
    if (DEBUG) console.log('[App-Nag Blocker] Found dismiss by attribute:', closeByAttr);
    return closeByAttr;
  }

  // Second: check for text-based dismiss buttons
  const clickableSelectors = ['button', 'a', '[role="button"]', '[onclick]', 'span[class]'];
  const candidates: HTMLElement[] = [];

  for (const selector of clickableSelectors) {
    const elements = container.querySelectorAll<HTMLElement>(selector);
    candidates.push(...Array.from(elements));
  }

  // Find elements with dismiss-like text
  for (const candidate of candidates) {
    const text = candidate.textContent?.trim() ?? '';
    if (containsDismissText(text)) {
      const clickable = candidate.closest('a, button, [role="button"]');
      if (clickable instanceof HTMLElement) {
        return clickable;
      }
      return candidate;
    }
  }

  // Also check for any element with exact dismiss text
  const allElements = container.querySelectorAll<HTMLElement>('*');
  for (const el of allElements) {
    const directText = getDirectTextContent(el).trim();
    if (directText && containsDismissText(directText)) {
      const clickable = el.closest('a, button, [role="button"]');
      if (clickable instanceof HTMLElement) {
        return clickable;
      }
      return el;
    }
  }

  return null;
}

// Get text content directly owned by this element (not descendants)
function getDirectTextContent(element: HTMLElement): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  }
  // If no direct text, fall back to full textContent for leaf nodes
  if (!text.trim() && element.children.length === 0) {
    text = element.textContent ?? '';
  }
  return text;
}

// Attempt to dismiss a detected app-nag modal
function dismissModal(modal: HTMLElement): boolean {
  const dismissElement = findDismissElement(modal);

  if (dismissElement) {
    if (DEBUG) console.log('[App-Nag Blocker] Found dismiss element:', dismissElement);
    dismissElement.click();
    console.log('[App-Nag Blocker] Dismissed app-nag');
    return true;
  }

  // No dismiss element found - don't take action (might be false positive)
  console.log('[App-Nag Blocker] No dismiss element found, skipping');
  return false;
}

// Track processed elements to avoid re-checking
let processedElements = new WeakSet<HTMLElement>();

// Check a potential modal element
function checkElement(element: HTMLElement): void {
  if (processedElements.has(element)) {
    return;
  }
  processedElements.add(element);

  const modalLike = isModalLike(element);
  const hasNagText = containsAppNagText(element);

  if (modalLike && !hasNagText) {
    if (DEBUG) console.log('[App-Nag Blocker] Modal-like but no app-nag text:', element.tagName);
  }

  if (!modalLike || !hasNagText) {
    return;
  }

  console.log('[App-Nag Blocker] Detected app-nag modal:', element.tagName, element.className);

  // Hide immediately for better UX
  element.style.visibility = 'hidden';

  // Then dismiss properly (click the button) to clean up site state
  setTimeout(() => {
    dismissModal(element);
  }, 100);
}

// Scan the DOM for potential modals
function scanForModals(): void {
  // Check elements with modal-like class names or ARIA attributes
  const potentialModals = document.querySelectorAll<HTMLElement>(
    '[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"], ' +
    '[class*="banner"], [class*="prompt"], [class*="interstitial"], ' +
    '[role="dialog"], [role="alertdialog"], [aria-modal="true"], ' +
    'header, [class*="header"]'
  );

  for (const element of potentialModals) {
    checkElement(element);
  }

  // Check all fixed-position elements (common for app-nag banners)
  const allElements = document.querySelectorAll<HTMLElement>('*');
  let fixedCount = 0;
  for (const element of allElements) {
    const style = window.getComputedStyle(element);
    if (style.position === 'fixed') {
      fixedCount++;
      checkElement(element);
    }
  }

  if (DEBUG) console.log('[App-Nag Blocker] Scanned', potentialModals.length, 'selector matches,', fixedCount, 'fixed elements');
}

// Debounce function
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Set up mutation observer (auto-disables after timeout)
function setupObserver(disableAfterMs: number): void {
  const debouncedScan = debounce(scanForModals, 300);
  let useDebounce = false;

  // After 3 seconds, switch to debounced mode
  setTimeout(() => {
    useDebounce = true;
    if (DEBUG) console.log('[App-Nag Blocker] Switched to debounced mode');
  }, 3000);

  const observer = new MutationObserver(() => {
    if (useDebounce) {
      debouncedScan();
    } else {
      scanForModals();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  // Disable observer after timeout
  setTimeout(() => {
    observer.disconnect();
    if (DEBUG) console.log('[App-Nag Blocker] Observer disabled');
  }, disableAfterMs);
}

interface MessageResponse {
  success: boolean;
  data?: {
    enabled: boolean;
    whitelist: string[];
  };
}

// Check if extension is enabled and site is not whitelisted
async function shouldRun(): Promise<boolean> {
  try {
    const response = await browser.runtime.sendMessage({ type: 'getSettings' }) as MessageResponse | undefined;
    if (!response?.success || !response.data) {
      return true; // Default to enabled if settings unavailable
    }

    const settings = response.data;
    if (!settings.enabled) {
      return false;
    }

    const hostname = window.location.hostname;
    return !settings.whitelist.includes(hostname);
  } catch (error) {
    console.error('[App-Nag Blocker] Error checking settings:', error);
    return true; // Default to enabled on error
  }
}

// Initialize the content script
async function init(): Promise<void> {
  const enabled = await shouldRun();
  if (!enabled) {
    console.log('[App-Nag Blocker] Disabled for this site');
    return;
  }

  console.log('[App-Nag Blocker] Active on', window.location.hostname);

  // Initial scan
  scanForModals();

  // Watch for dynamically added modals (disables after 10 seconds)
  setupObserver(10000);
}

init();
