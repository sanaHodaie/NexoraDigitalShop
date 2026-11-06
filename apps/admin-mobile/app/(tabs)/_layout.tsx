import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gate } from '../../src/ui/Gate';
import { colors, T } from '../../src/ui';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'grid-outline', requests: 'chatbubbles-outline', inventory: 'cube-outline', activity: 'pulse-outline', account: 'person-circle-outline',
};
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return <Gate><Tabs screenOptions={{ headerShown: false }} tabBar={({ state, descriptors, emitter, navigateToTab }) =>
    <View style={{ flexDirection: 'row-reverse', paddingBottom: Math.max(insets.bottom, 10), paddingTop: 12, paddingHorizontal: 8,
      backgroundColor: 'white', borderTopWidth: 1, borderColor: colors.line }}>
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={descriptors[route.key].options.title} accessibilityState={{ selected }}
          onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
          style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 5, borderRadius: 14, backgroundColor: selected ? colors.pale : 'transparent' }}>
          <Ionicons name={icons[route.name] || 'ellipse-outline'} size={23} color={selected ? colors.blue : colors.muted} />
          <T style={{ fontSize: 10, color: selected ? colors.blue : colors.muted, textAlign: 'center' }}>{descriptors[route.key].options.title}</T>
        </Pressable>;
      })}
    </View>}>
    <Tabs.Screen name="index" options={{ title: 'خانه' }} />
    <Tabs.Screen name="requests" options={{ title: 'درخواست‌ها' }} />
    <Tabs.Screen name="inventory" options={{ title: 'محصولات' }} />
    <Tabs.Screen name="activity" options={{ title: 'رویدادها' }} />
    <Tabs.Screen name="account" options={{ title: 'حساب' }} />
  </Tabs></Gate>;
}
