import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLayout } from '../state/layout';
import { useTheme } from '../state/theme';
import { number } from '../lib/format';
import type { RequestStats } from '../api/types';
import { T, styles } from './index';

export function HomeHero({ requests, onOpen }: { requests?: RequestStats; onOpen?: () => void }) {
  const { desktop, compact } = useLayout(); const { dark } = useTheme();
  const pending = requests ? number(requests.statuses.new || 0) : '—';
  return <LinearGradient testID="home-hero" colors={dark ? ['#142D59', '#204895', '#17647B'] : ['#173F97', '#2766DF', '#238DBA']}
    start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: 32, padding: desktop ? 34 : 24, overflow: 'hidden', gap: 26,
      borderWidth: 1, borderColor: 'rgba(141,190,255,.32)', boxShadow: '0 16px 38px rgba(28,79,169,.18)' }}>
    <View pointerEvents="none" style={{ position: 'absolute', width: 350, height: 350, borderRadius: 200, borderWidth: 1, borderColor: 'rgba(180,224,255,.15)', left: -110, top: -150 }} />
    <View pointerEvents="none" style={{ position: 'absolute', width: 290, height: 290, borderRadius: 180, backgroundColor: 'rgba(109,226,243,.09)', left: 20, bottom: -180 }} />
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 36 }}>
      <View style={{ flex: 1, gap: 13 }}>
        <View style={[styles.row, { gap: 8 }]}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#8CE9EA' }} />
          <T style={{ color: '#CBE7FF', fontSize: 11, letterSpacing: 1 }}>NEXORA / OPERATIONS</T></View>
        <T style={{ color: '#FFFFFF', fontFamily: 'Vazirmatn_700Bold', fontSize: desktop ? 35 : compact ? 26 : 30, lineHeight: desktop ? 55 : 45 }}>هر درخواست، شروع یک ارتباط.</T>
        <T style={{ color: '#D6E9FF', fontSize: 13, maxWidth: 530 }}>درخواست‌های مشتریان را بررسی کنید، به تیم مسیر بدهید و رسیدگی را تا نتیجه دنبال کنید.</T>
        {onOpen && <Pressable accessibilityRole="button" accessibilityLabel="بررسی درخواست‌ها" onPress={onOpen}
          style={({ pressed }) => ({ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: 'white',
            paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginTop: 4, opacity: pressed ? .8 : 1 })}>
          <T style={{ color: '#184997', fontFamily: 'Vazirmatn_700Bold' }}>بررسی درخواست‌ها</T><Ionicons name="arrow-back-outline" color="#184997" size={19} />
        </Pressable>}
      </View>
      {desktop && <View style={{ width: 245, alignItems: 'center', gap: 14 }}>
        <View style={{ width: 174, height: 174, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(209,237,255,.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(199,232,255,.08)' }}>
          <Ionicons name="chatbubbles-outline" size={33} color="#BDEBF9" />
          <T style={{ fontSize: 47, lineHeight: 68, color: 'white', fontFamily: 'Vazirmatn_700Bold' }}>{pending}</T>
          <T style={{ fontSize: 11, color: '#D6E9FF' }}>درخواست تازه</T>
        </View><T style={{ color: '#CBEDFF', fontSize: 11 }}>از گفت‌وگو تا پیگیری نهایی</T>
      </View>}
    </View>
    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderColor: 'rgba(211,234,255,.19)', paddingTop: 18 }}>
      {[['درخواست تازه', pending], ['تأییدشده', requests ? number(requests.statuses.approved || 0) : '—'], ['کل درخواست‌ها', requests ? number(requests.total) : '—']].map(([label, value]) =>
        <View key={label} style={{ flex: 1, minWidth: 70, gap: 2 }}><T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 21 }}>{value}</T><T style={{ color: '#CAE2FF', fontSize: 11 }}>{label}</T></View>)}
    </View>
  </LinearGradient>;
}
