import type { ExpoConfig } from 'expo/config';

const production = process.env.APP_VARIANT === 'production';
if (production) {
  const api = new URL(process.env.EXPO_PUBLIC_API_URL || 'http://missing');
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || !['', '/'].includes(api.pathname)) {
    throw new Error('Set EXPO_PUBLIC_API_URL to an HTTPS API origin before building production.');
  }
}
const config: ExpoConfig = {
  name: 'Nexora Business', slug: 'nexora-admin', scheme: 'nexora-admin', version: '0.1.0',
  orientation: 'default', userInterfaceStyle: 'light', icon: './assets/icon.png',
  ios: { supportsTablet: true, bundleIdentifier: 'com.nexora.business' },
  android: { package: 'com.nexora.business', adaptiveIcon: {
    foregroundImage: './assets/android-icon-foreground.png', backgroundColor: '#132B4B',
  } },
  web: { favicon: './assets/favicon.png', output: 'single', bundler: 'metro' },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font',
    ['expo-build-properties', { android: { usesCleartextTraffic: !production } }]],
};
export default config;
