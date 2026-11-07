import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLayout } from '../state/layout';
import { useTheme } from '../state/theme';
import { T } from './index';

export function HomeHero({ name, onOpen }: { name?: string; onOpen?: () => void }) {
  const { desktop, compact } = useLayout(); const { dark } = useTheme();
  return <LinearGradient testID="home-hero" colors={dark ? ['#1B2A78', '#1648A6', '#5F52BD'] : ['#203BAE', '#216FE0', '#8B7AF4']}
    start={{ x: 1, y: .8 }} end={{ x: 0, y: 0 }} style={{ borderRadius: 28, padding: desktop ? 30 : 22,
      minHeight: desktop ? 238 : undefined, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(166,195,255,.35)',
      boxShadow: '0 14px 34px rgba(31,73,177,.2)' }}>
    <View pointerEvents="none" style={{ position: 'absolute', width: 300, height: 175, borderRadius: 110,
      backgroundColor: 'rgba(131,218,255,.3)', left: 40, top: -105, transform: [{ rotate: '-18deg' }] }} />
    <View pointerEvents="none" style={{ position: 'absolute', width: 420, height: 420, borderRadius: 180,
      backgroundColor: 'rgba(180,168,255,.13)', left: -180, top: -200, transform: [{ rotate: '-35deg' }] }} />
    <View pointerEvents="none" style={{ position: 'absolute', width: 420, height: 280, borderRadius: 130,
      borderWidth: 1, borderColor: 'rgba(205,221,255,.12)', left: -140, bottom: -180, transform: [{ rotate: '25deg' }] }} />
    <View style={{ marginLeft: desktop ? 320 : 0, gap: 9, zIndex: 1 }}>
      <T style={{ color: '#E0E9FF', fontSize: 12 }}>👋 {name ? `سلام ${name}؛ به نکسورا خوش آمدید` : 'به نکسورا خوش آمدید'}</T>
      <T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: desktop ? 29 : compact ? 24 : 27,
        lineHeight: desktop ? 46 : 40 }}>هر درخواست، شروع یک ارتباط پایدار!</T>
      <T style={{ color: '#DBE8FF', fontSize: 12, lineHeight: 24 }}>مدیریت سفارش‌ها، محصولات و مشتریان در یک سامانهٔ یکپارچه، سریع و امن.</T>
      {onOpen && <Pressable accessibilityRole="button" accessibilityLabel="بررسی درخواست‌ها" onPress={onOpen}
        style={({ pressed }) => ({ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 9,
          backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, marginTop: 2,
          opacity: pressed ? .82 : 1, boxShadow: '0 6px 14px rgba(19,37,108,.15)' })}>
        <T style={{ color: '#213CAA', fontSize: 12, fontFamily: 'Vazirmatn_700Bold' }}>بررسی درخواست‌ها</T>
        <View style={{ width: 22, height: 22, borderRadius: 8, backgroundColor: '#EDF1FF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" color="#3555DF" size={16} />
        </View>
      </Pressable>}
    </View>
    <Image accessible={false} source={require('../../assets/illustrations/dashboard-poster.webp')} contentFit="contain"
      style={desktop ? { position: 'absolute', width: 350, height: 245, left: 5, bottom: -13 }
        : { width: '100%', height: 175, marginTop: 8, marginBottom: -32, alignSelf: 'center' }} />
  </LinearGradient>;
}
