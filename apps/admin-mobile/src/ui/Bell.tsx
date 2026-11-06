import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../state/session';
import { useTheme } from '../state/theme';
import { Text } from 'react-native';

export function Bell() {
  const { api, can } = useSession();
  const { c } = useTheme();
  const query = useQuery({ queryKey: ['newsletter-notifications'], enabled: can('subscribers:read'),
    refetchInterval: 30_000, queryFn: ({ signal }) => api.request<{ unread: number }>('/api/admin/newsletter-notifications', { signal }) });
  if (!can('subscribers:read')) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`اعلان‌های خبرنامه، ${query.data?.unread || 0} خوانده‌نشده`}
    onPress={() => router.push('/newsletter')} style={{ padding: 10, borderRadius: 18, backgroundColor: c.card }}>
    <Ionicons name="notifications-outline" size={24} color={c.ink} />
    {!!query.data?.unread && <View style={{ position: 'absolute', right: 0, top: -3, backgroundColor: '#EA4D79', borderRadius: 12, minWidth: 20, alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Vazirmatn_700Bold' }}>{query.data.unread > 99 ? '99+' : query.data.unread}</Text></View>}
  </Pressable>;
}
