import browser from 'webextension-polyfill';
import type { Settings, Message, MessageResponse } from '../types';

const enabledToggle = document.getElementById('enabledToggle') as HTMLInputElement;
const whitelistBtn = document.getElementById('whitelistBtn') as HTMLButtonElement;
const whitelistContainer = document.getElementById('whitelistContainer') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

let currentHostname: string | null = null;

async function sendMessage(message: Message): Promise<MessageResponse | undefined> {
  return browser.runtime.sendMessage(message) as Promise<MessageResponse | undefined>;
}

async function getCurrentTabHostname(): Promise<string | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.url) {
      const url = new URL(tab.url);
      // Only return hostname for http/https pages
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.hostname;
      }
    }
  } catch (error) {
    console.error('Error getting current tab:', error);
  }
  return null;
}

function showStatus(message: string, type: 'success' | 'info' = 'success'): void {
  statusEl.textContent = message;
  statusEl.className = `status visible ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 2000);
}

function renderWhitelist(whitelist: string[]): void {
  whitelistContainer.innerHTML = '';

  if (whitelist.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'whitelist-empty';
    empty.textContent = 'No sites whitelisted';
    whitelistContainer.appendChild(empty);
    return;
  }

  for (const hostname of whitelist) {
    const item = document.createElement('div');
    item.className = 'whitelist-item';

    const hostnameSpan = document.createElement('span');
    hostnameSpan.className = 'whitelist-hostname';
    hostnameSpan.textContent = hostname;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.title = 'Remove';
    removeBtn.textContent = 'x';
    removeBtn.addEventListener('click', async () => {
      await removeFromWhitelist(hostname);
    });

    item.appendChild(hostnameSpan);
    item.appendChild(removeBtn);
    whitelistContainer.appendChild(item);
  }
}


function updateWhitelistButton(settings: Settings): void {
  if (!currentHostname) {
    whitelistBtn.textContent = 'Cannot whitelist this page';
    whitelistBtn.disabled = true;
    return;
  }

  const isWhitelisted = settings.whitelist.includes(currentHostname);
  if (isWhitelisted) {
    whitelistBtn.textContent = `Remove ${currentHostname} from whitelist`;
    whitelistBtn.classList.remove('btn-primary');
    whitelistBtn.classList.add('btn-secondary');
  } else {
    whitelistBtn.textContent = `Whitelist ${currentHostname}`;
    whitelistBtn.classList.remove('btn-secondary');
    whitelistBtn.classList.add('btn-primary');
  }
  whitelistBtn.disabled = false;
}

async function loadSettings(): Promise<void> {
  const response = await sendMessage({ type: 'getSettings' });
  if (response?.success && response.data) {
    const settings = response.data as Settings;
    enabledToggle.checked = settings.enabled;
    renderWhitelist(settings.whitelist);
    updateWhitelistButton(settings);
  }
}

async function toggleEnabled(): Promise<void> {
  const response = await sendMessage({
    type: 'updateSettings',
    payload: { enabled: enabledToggle.checked },
  });
  if (response?.success) {
    showStatus(enabledToggle.checked ? 'Enabled' : 'Disabled');
  }
}

async function toggleWhitelist(): Promise<void> {
  if (!currentHostname) return;

  const response = await sendMessage({ type: 'getSettings' });
  if (!response?.success) return;

  const settings = response.data as Settings;
  const isWhitelisted = settings.whitelist.includes(currentHostname);

  if (isWhitelisted) {
    await removeFromWhitelist(currentHostname);
  } else {
    await addToWhitelist(currentHostname);
  }
}

async function addToWhitelist(hostname: string): Promise<void> {
  const response = await sendMessage({
    type: 'addToWhitelist',
    payload: `https://${hostname}`,
  });
  if (response?.success && response.data) {
    const settings = response.data as Settings;
    renderWhitelist(settings.whitelist);
    updateWhitelistButton(settings);
    showStatus(`Added ${hostname} to whitelist`);
  }
}

async function removeFromWhitelist(hostname: string): Promise<void> {
  const response = await sendMessage({
    type: 'removeFromWhitelist',
    payload: hostname,
  });
  if (response?.success && response.data) {
    const settings = response.data as Settings;
    renderWhitelist(settings.whitelist);
    updateWhitelistButton(settings);
    showStatus(`Removed ${hostname} from whitelist`);
  }
}

async function init(): Promise<void> {
  currentHostname = await getCurrentTabHostname();
  await loadSettings();

  enabledToggle.addEventListener('change', toggleEnabled);
  whitelistBtn.addEventListener('click', toggleWhitelist);
}

init();
