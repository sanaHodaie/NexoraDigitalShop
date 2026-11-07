import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../src/state/theme';
import { useReducedMotion } from '../src/state/motion';
import { useLayout } from '../src/state/layout';
import { useSession } from '../src/state/session';
import { ThemeToggle } from '../src/ui/ThemeToggle';
import { Card, ErrorBox, Field, Loading, Page, T, styles } from '../src/ui';

const schema = z.object({ email: z.string().trim().pipe(z.email('ایمیل معتبر وارد کنید')), password: z.string().min(1, 'رمز را وارد کنید').max(128) });
export default function Login() {
  const session = useSession(); const { c, dark } = useTheme(); const { desktop, height } = useLayout();
  const [error, setError] = useState(''), [health, setHealth] = useState('');
  const [checking, setChecking] = useState(false), [showPassword, setShowPassword] = useState(false), [connection, setConnection] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  if (!session.ready) return <Page><Loading /></Page>;
  if (session.manager) return <Redirect href="/(tabs)" />;
  const submit = form.handleSubmit(async values => {
    setError('');
    try { await session.login(values.email, values.password); form.reset(); }
    catch (e) { setError(e instanceof Error ? e.message : 'ورود موفق نبود.'); }
  });
  return <Page login><View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', gap: desktop ? 28 : 30,
    minHeight: desktop ? Math.max(680, height - 70) : undefined, justifyContent: desktop ? 'center' : undefined }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={styles.row}><View style={[styles.brand, { width: 44, height: 44 }]}><T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 23 }}>N</T></View>
        <View><T style={{ fontFamily: 'Vazirmatn_700Bold', letterSpacing: 2, fontSize: 16 }}>NEXORA</T><T style={[styles.muted, { fontSize: 9, letterSpacing: 1.4 }]}>BUSINESS CONTROL</T></View>
      </View><ThemeToggle />
    </View>
    <View style={{ flexDirection: desktop ? 'row-reverse' : 'column', alignItems: 'stretch', gap: desktop ? 44 : 22 }}>
      {desktop && <View testID="login-desktop-story" style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
        <View style={{ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: dark ? '#293362' : '#DDDFFF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 24 }}>
          <Ionicons name="bar-chart" size={18} color={dark ? '#B7B9FF' : '#263CF1'} /><T style={{ color: dark ? '#C3CAFF' : '#2633AD', fontSize: 12, fontFamily: 'Vazirmatn_700Bold' }}>راهکار جامع مدیریت فروشگاه</T>
        </View>
        <T style={{ fontSize: 42, lineHeight: 64, fontFamily: 'Vazirmatn_700Bold', textAlign: 'right' }}>مدیریت فروشگاه،{'\n'}با <T style={{ fontSize: 42, lineHeight: 64, color: dark ? '#A3ACFF' : '#193BFA', fontFamily: 'Vazirmatn_700Bold' }}>دیدی روشن‌تر</T></T>
        <T style={{ color: c.ink, fontSize: 14, lineHeight: 27, maxWidth: 480, alignSelf: 'flex-end' }}>سفارش‌ها، محصولات، گفت‌وگوهای مشتریان و گزارش‌ها را در یک فضای یکپارچه و امن مدیریت کنید.</T>
        <LoginArtwork />
      </View>}
      <View style={{ width: desktop ? 400 : '100%', maxWidth: 460, alignSelf: desktop ? 'center' : 'center', gap: 16 }}>
        <Card style={{ overflow: 'visible', marginTop: 18, padding: desktop ? 30 : 25, paddingTop: 42, borderRadius: 32, gap: 14, borderColor: dark ? '#485582' : 'rgba(255,255,255,.95)', backgroundColor: dark ? 'rgba(30,35,67,.78)' : 'rgba(255,255,255,.53)', boxShadow: dark ? '0 22px 70px rgba(0,0,0,.18)' : '0 22px 70px rgba(39,85,152,.09)' }}>
          <LinearGradient colors={dark ? ['#3C477C', '#50446D'] : ['#F7F5FF', '#E8D3FF']} style={{ position: 'absolute', alignSelf: 'center', top: -27, width: 60, height: 60, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.8)', boxShadow: '0 8px 18px rgba(90,70,184,.2)' }}><Ionicons name="lock-closed-outline" color={dark ? '#BBC3FF' : '#3335CD'} size={28} /></LinearGradient>
          <View style={{ gap: 2 }}><T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 27, lineHeight: 42, textAlign: 'center' }}>ورود مدیران</T>
            <T style={{ color: c.muted, textAlign: 'center', fontSize: 12 }}>به پنل مدیریت کسب‌وکار خود خوش آمدید.</T></View>
          {!!session.notice && <T accessibilityRole="alert" style={styles.muted}>{session.notice}</T>}
          <Controller control={form.control} name="email" render={({ field }) => <Field label="ایمیل" autoCapitalize="none" autoCorrect={false}
            placeholder="ایمیل خود را وارد کنید" keyboardType="email-address" autoComplete="email" value={field.value} onChangeText={field.onChange} editable={!form.formState.isSubmitting}
            onBlur={field.onBlur} error={form.formState.errors.email?.message} style={{ textAlign: 'right', writingDirection: 'ltr' }} />} />
          <Controller control={form.control} name="password" render={({ field }) => <View><Field label="رمز عبور" secureTextEntry={!showPassword}
            placeholder="رمز عبور خود را وارد کنید" autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={field.value} onChangeText={field.onChange} editable={!form.formState.isSubmitting}
            style={{ paddingLeft: 52 }} error={form.formState.errors.password?.message} onSubmitEditing={() => void submit()} />
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'} onPress={() => setShowPassword(value => !value)}
              style={{ position: 'absolute', left: 8, top: 35, padding: 10 }}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} color={c.muted} size={22} /></Pressable>
          </View>} />
          <ErrorBox error={error} /><LinearGradient colors={['#558CFF', '#183AF6', '#1229BD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 15, boxShadow: '0 7px 16px rgba(39,67,237,.28)' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="ورود به مرکز مدیریت" disabled={form.formState.isSubmitting} onPress={() => void submit()} style={{ minHeight: 49, alignItems: 'center', justifyContent: 'center', opacity: form.formState.isSubmitting ? .6 : 1 }}>
              <T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold' }}>{form.formState.isSubmitting ? 'در حال ورود…' : 'ورود به مرکز مدیریت'}</T><Ionicons name="arrow-forward" color="white" size={21} style={{ position: 'absolute', left: 16 }} />
            </Pressable></LinearGradient>
          <T style={[styles.muted, { textAlign: 'center', fontSize: 11 }]}>دسترسی هر بخش با مجوز حساب شما تعیین می‌شود.</T>
        </Card>
        <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="اطلاعات اتصال" onPress={() => setConnection(value => !value)} style={{ padding: 8 }}><T style={{ fontSize: 11, color: c.muted }}>اطلاعات اتصال</T></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="بررسی اتصال" disabled={checking} style={{ padding: 8 }} onPress={async () => {
            setChecking(true); setHealth('');
            try { const result = await session.api.request<{ status: string }>('/api/mobile/health'); setHealth(result.status === 'ok' ? 'بک‌اند پاسخ می‌دهد؛ اعتبار حساب جداگانه بررسی می‌شود.' : 'پاسخ سلامت نامعتبر است.'); }
            catch (e) { setHealth(e instanceof Error ? e.message : 'خطای اتصال'); }
            finally { setChecking(false); }
          }}><T style={{ fontSize: 11, color: c.blue }}>{checking ? 'در حال بررسی…' : 'بررسی اتصال'}</T></Pressable>
        </View>
        {(connection || health) && <Card>{connection && <T selectable style={[styles.muted, { writingDirection: 'ltr' }]}>{session.baseUrl}</T>}
          {!!health && <T accessibilityRole="alert" style={styles.muted}>{health}</T>}</Card>}
      </View>
    </View>
    <View style={{ flexDirection: desktop ? 'row-reverse' : 'column', alignItems: 'center', justifyContent: 'space-around', gap: 14, padding: 15, borderRadius: 24, backgroundColor: dark ? 'rgba(35,44,77,.7)' : 'rgba(255,255,255,.46)', borderWidth: 1, borderColor: dark ? '#3A4770' : 'rgba(255,255,255,.8)' }}>{[
      ['desktop-outline', 'قابل استفاده در همه دستگاه‌ها'], ['flash-outline', 'مدیریت یکپارچهٔ فروشگاه'], ['shield-checkmark-outline', 'دسترسی امن بر اساس نقش'],
    ].map(([icon, label]) => <View key={label} style={[styles.row, { gap: 9 }]}><Ionicons name={icon as 'desktop-outline'} size={21} color={dark ? '#AAB7FF' : '#324BFF'} /><T style={{ color: c.ink, fontSize: 11 }}>{label}</T></View>)}</View>
  </View></Page>;
}

function LoginArtwork() {
  const { dark, c } = useTheme();
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) { drift.setValue(0); tilt.setValue(0); return; }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 2700, useNativeDriver: true }),
      Animated.timing(drift, { toValue: -1, duration: 5400, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 2700, useNativeDriver: true }),
    ]));
    motion.start(); return () => { motion.stop(); drift.setValue(0); };
  }, [reduced, drift, tilt]);
  const hover = (value: number) => { if (!reduced) Animated.spring(tilt, { toValue: value, damping: 18, stiffness: 100, useNativeDriver: true }).start(); };
  useEffect(() => () => { tilt.stopAnimation(); }, [tilt]);
  return <View style={{ height: 290, justifyContent: 'center' }}>
    <View pointerEvents="none" style={{ position: 'absolute', left: -50, top: -50, width: 300, height: 300, borderRadius: 120, backgroundColor: dark ? 'rgba(82,76,174,.22)' : 'rgba(161,157,255,.22)', transform: [{ rotate: '-25deg' }] }} />
    <View onPointerEnter={() => hover(1)} onPointerLeave={() => hover(0)} style={{ position: 'absolute', width: '59%', height: 230, left: 0, alignSelf: 'center' }}>
      <Animated.View testID="login-laptop-motion" style={{ flex: 1, transform: [{ perspective: 1000 },
        { translateY: drift.interpolate({ inputRange: [-1, 1], outputRange: [5, -5] }) },
        { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: [reduced ? '0deg' : '-3deg', reduced ? '0deg' : '3deg'] }) },
        { rotateX: drift.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) }],
        borderRadius: 28, boxShadow: '0 20px 32px rgba(47,54,139,.24)' }}>
        <Image accessibilityIgnoresInvertColors accessibilityLabel="تصویر لپ‌تاپ" source={require('../assets/illustrations/login-laptop.webp')} contentFit="cover" style={{ width: '100%', height: '100%', borderRadius: 28 }} />
      </Animated.View>
    </View>
    <View style={{ gap: 13, alignSelf: 'flex-end', width: '43%' }}>{[
      ['bag-handle-outline', 'مدیریت سفارش‌ها'], ['cube-outline', 'محصولات و موجودی'], ['people-outline', 'ارتباط با مشتریان'],
    ].map(([icon, label], index) => <View key={label} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 9, padding: 13, marginLeft: index === 2 ? 15 : 0, borderRadius: 18, backgroundColor: dark ? 'rgba(38,47,84,.9)' : 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', boxShadow: '0 8px 18px rgba(62,76,175,.13)' }}>
      <Ionicons name={icon as 'cube-outline'} size={25} color={dark ? '#AAB7FF' : '#2C41EE'} /><T style={{ flex: 1, fontSize: 11, color: c.ink, fontFamily: 'Vazirmatn_700Bold' }}>{label}</T>
    </View>)}</View>
  </View>;
}
