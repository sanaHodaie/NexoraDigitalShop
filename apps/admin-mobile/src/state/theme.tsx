import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';
const palettes = {
  light: { ink: '#172D4D', muted: '#5B6F8D', background: '#EDF3FB', card: 'rgba(255,255,255,0.68)',
    line: 'rgba(255,255,255,0.9)', input: 'rgba(255,255,255,0.58)', pale: '#DFE9FF', blue: '#3265EC', green: '#087B67', danger: '#B42449' },
  dark: { ink: '#EAF1FF', muted: '#A8B9D5', background: '#101A2D', card: 'rgba(31,47,73,0.76)',
    line: 'rgba(169,194,239,0.17)', input: 'rgba(12,24,44,0.65)', pale: '#263D67', blue: '#94B7FF', green: '#72E0BC', danger: '#FFA5BB' },
};
type Theme = { mode: ThemeMode; dark: boolean; c: typeof palettes.light; setMode: (mode: ThemeMode) => void };
const Context = createContext<Theme>({ mode: 'auto', dark: false, c: palettes.light, setMode: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, update] = useState<ThemeMode>('auto');
  useEffect(() => { AsyncStorage.getItem('nexora.theme').then(value => {
    if (value === 'light' || value === 'dark' || value === 'auto') update(value);
  }).catch(() => {}); }, []);
  const dark = mode === 'dark' || (mode === 'auto' && system === 'dark');
  const setMode = (value: ThemeMode) => { update(value); void AsyncStorage.setItem('nexora.theme', value).catch(() => {}); };
  useEffect(() => { if (Platform.OS === 'web') document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; }, [dark]);
  const value = useMemo(() => ({ mode, dark, c: dark ? palettes.dark : palettes.light, setMode }), [mode, dark]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
