import { Platform } from 'react-native';
import { File } from 'expo-file-system';
export const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export async function fileBytes(uri: string, file?: globalThis.File): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return file ? file.arrayBuffer() : (await fetch(uri)).arrayBuffer();
  const bytes = await new File(uri).bytes();
  return Uint8Array.from(bytes).buffer;
}
export function productImage(path: string, baseUrl: string): string {
  if (path.startsWith('/api/media/')) return baseUrl + path;
  if (path.startsWith('/assets/')) {
    const storefront = Platform.OS === 'web' && process.env.EXPO_PUBLIC_WEB_SAME_ORIGIN === '1'
      ? window.location.origin : process.env.EXPO_PUBLIC_STOREFRONT_URL || 'https://nexora-digital-shop.vercel.app';
    return storefront + path;
  }
  return '';
}
