import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../state/session';
import { useTheme } from '../state/theme';
import { Text } from 'react-native';
import { useReducedMotion } from '../state/motion';

export function Bell() {
  const { api, can } = useSession();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const angle = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false), [active, setActive] = useState(AppState.currentState === 'active');
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => { const subscription = AppState.addEventListener('change', state => setActive(state === 'active')); return () => subscription.remove(); }, []);
  const query = useQuery({ queryKey: ['newsletter-notifications'], enabled: can('subscribers:read'),
    refetchInterval: 30_000, queryFn: ({ signal }) => api.request<{ unread: number }>('/api/admin/newsletter-notifications', { signal }) });
  const unread = query.data?.unread || 0;
  useEffect(() => {
    if (!unread || reduced || !active || !focused) { angle.setValue(0); return; }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(angle, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(angle, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(angle, { toValue: -.6, duration: 110, useNativeDriver: true }),
      Animated.timing(angle, { toValue: .35, duration: 100, useNativeDriver: true }),
      Animated.timing(angle, { toValue: 0, duration: 90, useNativeDriver: true }), Animated.delay(4500),
    ]));
    motion.start(); return () => { motion.stop(); angle.setValue(0); };
  }, [unread, reduced, active, focused, angle]);
  if (!can('subscribers:read')) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`اعلان‌های خبرنامه، ${query.data?.unread || 0} خوانده‌نشده`}
    onPress={() => router.push('/newsletter')} style={{ padding: 10, borderRadius: 18, backgroundColor: c.card }}>
    <Animated.View testID="notification-bell-motion" style={{ transform: [{ rotate: angle.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) }] }}>
      <Ionicons name="notifications-outline" size={23} color={c.ink} />
    </Animated.View>
    {!!query.data?.unread && <View style={{ position: 'absolute', right: 0, top: -3, backgroundColor: '#EA4D79', borderRadius: 12, minWidth: 20, alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Vazirmatn_700Bold' }}>{query.data.unread > 99 ? '99+' : query.data.unread}</Text></View>}
  </Pressable>;
}
