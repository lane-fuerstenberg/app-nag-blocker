import browser from 'webextension-polyfill';
import { Settings, Message, MessageResponse, getDefaultSettings } from './types';

const VALID_MESSAGE_TYPES = ['getSettings', 'updateSettings', 'isWhitelisted', 'addToWhitelist', 'removeFromWhitelist'] as const;

function isValidMessage(msg: unknown): msg is Message {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return typeof m.type === 'string' &&
    (VALID_MESSAGE_TYPES as readonly string[]).includes(m.type);
}

async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get('settings');
  if (result.settings && typeof result.settings === 'object') {
    return result.settings as Settings;
  }
  return getDefaultSettings();
}

async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Validate hostname format (basic check for valid domain-like string)
function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  // Must contain at least one dot (except localhost) and only valid characters
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
}

async function handleMessage(message: Message): Promise<MessageResponse> {
  const settings = await getSettings();

  switch (message.type) {
    case 'getSettings': {
      return { success: true, data: settings };
    }

    case 'updateSettings': {
      if (message.payload && typeof message.payload === 'object') {
        const newSettings = { ...settings, ...message.payload };
        await saveSettings(newSettings);
        return { success: true, data: newSettings };
      }
      return { success: false };
    }

    case 'isWhitelisted': {
      if (typeof message.payload === 'string') {
        const hostname = getHostname(message.payload);
        return { success: true, data: settings.whitelist.includes(hostname) };
      }
      return { success: false };
    }

    case 'addToWhitelist': {
      if (typeof message.payload === 'string') {
        const hostname = getHostname(message.payload);
        if (hostname && isValidHostname(hostname) && !settings.whitelist.includes(hostname)) {
          settings.whitelist.push(hostname);
          await saveSettings(settings);
        }
        return { success: true, data: settings };
      }
      return { success: false };
    }

    case 'removeFromWhitelist': {
      if (typeof message.payload === 'string') {
        const hostname = message.payload;
        if (!isValidHostname(hostname)) {
          return { success: false };
        }
        settings.whitelist = settings.whitelist.filter(h => h !== hostname);
        await saveSettings(settings);
        return { success: true, data: settings };
      }
      return { success: false };
    }

    default:
      return { success: false };
  }
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isValidMessage(message)) {
    return Promise.resolve({ success: false });
  }
  return handleMessage(message);
});

console.log('[App-Nag Blocker] Background script loaded');
