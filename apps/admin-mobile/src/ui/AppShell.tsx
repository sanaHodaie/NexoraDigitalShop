import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname, type Href } from 'expo-router';
import { useLayout } from '../state/layout';
import { useReducedMotion } from '../state/motion';
import { useSession } from '../state/session';
import { useTheme } from '../state/theme';
import { ThemeToggle } from './ThemeToggle';

type Item = { label: string; href: string; icon: keyof typeof Ionicons.glyphMap; permission?: string; match: string[] };
const items: Item[] = [
  { label: 'خانه', href: '/(tabs)', icon: 'grid-outline', match: ['/'] },
  { label: 'درخواست‌ها', href: '/(tabs)/requests', icon: 'chatbubbles-outline', permission: 'orders:read', match: ['/requests'] },
  { label: 'محصولات', href: '/(tabs)/inventory', icon: 'cube-outline', permission: 'products:read', match: ['/inventory', '/products', '/pricing', '/import-products'] },
  { label: 'سفارش‌های سایت', href: '/orders', icon: 'bag-handle-outline', permission: 'orders:read', match: ['/orders'] },
  { label: 'رویدادها', href: '/(tabs)/activity', icon: 'pulse-outline', permission: 'audit:read', match: ['/activity'] },
  { label: 'خبرنامه و اعلان‌ها', href: '/newsletter', icon: 'notifications-outline', permission: 'subscribers:read', match: ['/newsletter'] },
  { label: 'حساب', href: '/(tabs)/account', icon: 'person-circle-outline', match: ['/account'] },
];
const tools: Item[] = [
  { label: 'مشتریان', href: '/customers', icon: 'people-outline', permission: 'users:read', match: ['/customers'] },
  { label: 'محتوای فروشگاه', href: '/content/home', icon: 'albums-outline', permission: 'content:read', match: ['/content/home'] },
  { label: 'مجله و مقاله‌ها', href: '/content/articles', icon: 'document-text-outline', permission: 'content:read', match: ['/content/articles'] },
  { label: 'تنظیمات فروشگاه', href: '/content/settings', icon: 'options-outline', permission: 'content:read', match: ['/content/settings'] },
  { label: 'راهنمای خرید', href: '/assistant', icon: 'sparkles-outline', permission: 'assistant:read', match: ['/assistant'] },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { desktop } = useLayout(); const { manager } = useSession(); const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.background }}>
    <View style={{ flex: 1, marginRight: desktop && manager ? 104 : 0 }}>{children}</View>
    {desktop && manager && <DesktopNavigation />}
  </View>;
}
function DesktopNavigation() {
  const { c, dark } = useTheme(); const { manager, can } = useSession(); const path = usePathname();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false), [pinned, setPinned] = useState(false), [focused, setFocused] = useState(false);
  const keyboard = useRef(false);
  const expanded = hovered || pinned || focused;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { const animation = Animated.timing(progress, { toValue: expanded ? 1 : 0, duration: reduced ? 0 : 180, useNativeDriver: false });
    animation.start(); return () => animation.stop(); }, [expanded, reduced, progress]);
  useEffect(() => { if (Platform.OS !== 'web') return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Tab') keyboard.current = true; };
    const pointer = () => { keyboard.current = false; setFocused(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', pointer);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', pointer); };
  }, []);
  const focus = () => { if (keyboard.current) setFocused(true); };
  const blur = () => { if (Platform.OS === 'web') setTimeout(() => {
    if (!document.activeElement?.closest('[data-testid="desktop-navigation"]')) setFocused(false);
  }, 0); };
  const active = (item: Item) => item.match.some(prefix => prefix === '/' ? path === '/' : path === prefix || path.startsWith(prefix + '/'));
  const link = (item: Item) => {
    if (item.permission && !can(item.permission)) return null;
    const selected = active(item);
    return <Pressable key={item.href} accessibilityRole="button" accessibilityLabel={item.label}
      accessibilityState={{ selected }} onFocus={focus} onBlur={blur} onPress={() => router.navigate(item.href as Href)}
      style={({ pressed }) => ({ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 47, borderRadius: 16,
        marginVertical: 3, paddingHorizontal: 12, backgroundColor: selected ? c.pale : pressed ? c.input : 'transparent' })}>
      <Ionicons name={item.icon} size={23} color={selected ? c.blue : c.muted} />
      <Animated.Text numberOfLines={1} style={{ opacity: progress, width: 164, fontFamily: selected ? 'Vazirmatn_700Bold' : 'Vazirmatn_400Regular',
        textAlign: 'right', color: selected ? c.blue : c.ink, fontSize: 13 }}>{item.label}</Animated.Text>
    </Pressable>;
  };
  return <Animated.View testID="desktop-navigation" style={{ position: 'absolute', top: 16, bottom: 16, right: 14, zIndex: 1000, elevation: 30,
    width: progress.interpolate({ inputRange: [0, 1], outputRange: [80, 270] }), borderRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: c.line, boxShadow: '0 12px 40px rgba(18,49,96,.12)' }}>
    <View onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} style={{ flex: 1 }}>
      <BlurView intensity={65} blurMethod="dimezisBlurViewSdk31Plus" tint={dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: c.card, padding: 12 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, height: 52 }}>
          <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: '#285DDB', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 24, fontFamily: 'Vazirmatn_700Bold' }}>N</Text></View>
          <Animated.Text numberOfLines={1} style={{ opacity: progress, color: c.ink, fontSize: 16, fontFamily: 'Vazirmatn_700Bold' }}>Nexora Business</Animated.Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'بستن منوی مدیریت' : 'باز کردن منوی مدیریت'}
          onFocus={focus} onBlur={blur} onPress={() => { setPinned(!expanded); setHovered(false); setFocused(false); }}
          style={{ alignItems: 'center', padding: 8, marginTop: 8, borderRadius: 12 }}>
          <Ionicons name={expanded ? 'chevron-forward-outline' : 'chevron-back-outline'} size={18} color={c.muted} />
        </Pressable>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {items.map(link)}
          {expanded && <View style={{ borderTopWidth: 1, borderColor: c.line, marginTop: 10, paddingTop: 10 }}>{tools.map(link)}</View>}
        </ScrollView>
        <View style={{ paddingTop: 10, borderTopWidth: 1, borderColor: c.line, gap: 8, alignItems: expanded ? 'stretch' : 'center' }}>
          {expanded && <Text numberOfLines={1} style={{ color: c.muted, fontFamily: 'Vazirmatn_400Regular', fontSize: 11, textAlign: 'right' }}>{manager?.name || manager?.email}</Text>}
          <ThemeToggle />
        </View>
      </BlurView>
    </View>
  </Animated.View>;
}
