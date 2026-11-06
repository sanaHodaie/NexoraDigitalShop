import React from 'react';
import { Tabs } from 'expo-router';
import { Animated, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../src/state/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gate } from '../../src/ui/Gate';
import { colors, T } from '../../src/ui';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'grid-outline', requests: 'chatbubbles-outline', inventory: 'cube-outline', activity: 'pulse-outline', account: 'person-circle-outline',
};
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { c, dark } = useTheme();
  return <Gate><Tabs screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: c.background } }} tabBar={({ state, descriptors, emitter, navigateToTab }) =>
    <View style={{ zIndex: 100, elevation: 20, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 14, paddingTop: 8 }}>
    <BlurView intensity={70} blurMethod="dimezisBlurViewSdk31Plus" tint={dark ? 'dark' : 'light'} style={{ flexDirection: 'row-reverse', paddingVertical: 9, paddingHorizontal: 8,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 32, overflow: 'hidden', boxShadow: '0 8px 28px rgba(24,49,92,.15)' }}>
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={descriptors[route.key].options.title} accessibilityState={{ selected }}
          onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
          style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 5, borderRadius: 24, backgroundColor: selected ? c.pale : 'transparent' }}>
          <View style={selected ? { backgroundColor: '#3265EC', borderRadius: 22, padding: 9, marginTop: -7, marginBottom: -3 } : { padding: 4 }}>
          <Ionicons name={icons[route.name] || 'ellipse-outline'} size={22} color={selected ? 'white' : c.muted} /></View>
          <T style={{ fontSize: 10, color: selected ? c.blue : c.muted, textAlign: 'center' }}>{descriptors[route.key].options.title}</T>
        </Pressable>;
      })}
    </BlurView></View>}>
    <Tabs.Screen name="index" options={{ title: 'خانه' }} />
    <Tabs.Screen name="requests" options={{ title: 'درخواست‌ها' }} />
    <Tabs.Screen name="inventory" options={{ title: 'محصولات' }} />
    <Tabs.Screen name="activity" options={{ title: 'رویدادها' }} />
    <Tabs.Screen name="account" options={{ title: 'حساب' }} />
  </Tabs></Gate>;
}
