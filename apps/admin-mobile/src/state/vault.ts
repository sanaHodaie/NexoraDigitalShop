import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const key = 'nexora.admin.session.v1';
// Web preview deliberately has no persistent token storage.
let memory: string | null = null;
export const vault = {
  async read(baseUrl: string): Promise<string | null> {
    const raw = Platform.OS === 'web' ? memory : await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      return saved.baseUrl === baseUrl && typeof saved.token === 'string' ? saved.token : null;
    } catch { return null; }
  },
  async save(baseUrl: string, token: string) {
    const value = JSON.stringify({ baseUrl, token });
    if (Platform.OS === 'web') memory = value;
    else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async clear() {
    memory = null;
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(key);
  },
};
