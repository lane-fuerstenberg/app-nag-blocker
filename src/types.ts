export interface Settings {
  enabled: boolean;
  whitelist: string[];
}

export interface Message {
  type: 'getSettings' | 'updateSettings' | 'isWhitelisted' | 'addToWhitelist' | 'removeFromWhitelist';
  payload?: Partial<Settings> | string;
}

export interface MessageResponse {
  success: boolean;
  data?: Settings | boolean;
}

export function getDefaultSettings(): Settings {
  return {
    enabled: true,
    whitelist: [],
  };
}
