import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';
const palettes = {
  light: { ink: '#152E52', muted: '#566E8D', background: '#F0F5FF', card: 'rgba(255,255,255,0.76)',
    line: 'rgba(179,204,239,0.45)', input: 'rgba(241,247,255,0.86)', pale: '#E3EDFF', blue: '#285DDB', green: '#087B67', danger: '#B42449' },
  dark: { ink: '#EBF2FF', muted: '#A6BAD8', background: '#0C1628', card: 'rgba(24,42,68,0.86)',
    line: 'rgba(146,183,234,0.18)', input: 'rgba(10,24,44,0.76)', pale: '#213C65', blue: '#9BBDFF', green: '#72E0BC', danger: '#FFA5BB' },
};
type Theme = { mode: ThemeMode; dark: boolean; c: typeof palettes.light; setMode: (mode: ThemeMode) => void };
const Context = createContext<Theme>({ mode: 'auto', dark: false, c: palettes.light, setMode: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, update] = useState<ThemeMode>('auto');
  const chosen = useRef(false);
  useEffect(() => { AsyncStorage.getItem('nexora.theme').then(value => {
    if (!chosen.current && (value === 'light' || value === 'dark' || value === 'auto')) update(value);
  }).catch(() => {}); }, []);
  const dark = mode === 'dark' || (mode === 'auto' && system === 'dark');
  const setMode = (value: ThemeMode) => { chosen.current = true; update(value); void AsyncStorage.setItem('nexora.theme', value).catch(() => {}); };
  useEffect(() => { if (Platform.OS === 'web') { document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'; } }, [dark]);
  const value = useMemo(() => ({ mode, dark, c: dark ? palettes.dark : palettes.light, setMode }), [mode, dark]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
