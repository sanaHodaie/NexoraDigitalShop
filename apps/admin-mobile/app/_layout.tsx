import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Vazirmatn_400Regular } from '@expo-google-fonts/vazirmatn/400Regular';
import { Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn/700Bold';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider } from '../src/state/session';
import { colors } from '../src/ui';
import { ThemeProvider, useTheme } from '../src/state/theme';
import { AppShell } from '../src/ui/AppShell';

export { ErrorBoundary } from 'expo-router';
export default function Layout() {
  const [loaded, error] = useFonts({ Vazirmatn_400Regular, Vazirmatn_700Bold });
  if (error) throw error;
  if (!loaded) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.blue} /></View>;
  return <SafeAreaProvider><ThemeProvider><SessionProvider><Navigation /></SessionProvider></ThemeProvider></SafeAreaProvider>;
}
function Navigation() {
  const { dark, c } = useTheme();
  return <><StatusBar style={dark ? 'light' : 'dark'} /><AppShell><Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: c.background } }} /></AppShell></>;
}
