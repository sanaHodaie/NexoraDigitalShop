import type { ExpoConfig } from 'expo/config';

const production = process.env.APP_VARIANT === 'production';
if (production && process.env.EXPO_PUBLIC_WEB_SAME_ORIGIN !== '1') {
  const api = new URL(process.env.EXPO_PUBLIC_API_URL || 'http://missing');
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || !['', '/'].includes(api.pathname)) {
    throw new Error('Set EXPO_PUBLIC_API_URL to an HTTPS API origin before building production.');
  }
}
const config: ExpoConfig = {
  name: 'Nexora Business', slug: 'nexora-admin', scheme: 'nexora-admin', version: '0.2.0',
  orientation: 'default', userInterfaceStyle: 'automatic', icon: './assets/icon.png',
  experiments: { baseUrl: process.env.APP_WEB_BASE_PATH || '' },
  ios: { supportsTablet: true, bundleIdentifier: 'com.nexora.business' },
  android: { package: 'com.nexora.business', adaptiveIcon: {
    foregroundImage: './assets/android-icon-foreground.png', backgroundColor: '#132B4B',
  } },
  web: { favicon: './assets/favicon.png', output: 'single', bundler: 'metro' },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font', ['expo-image-picker', { photosPermission: 'برای انتخاب تصویر محصول به گالری دسترسی لازم است.', cameraPermission: false, microphonePermission: false }],
    ['expo-build-properties', { android: { usesCleartextTraffic: !production } }]],
};
export default config;
