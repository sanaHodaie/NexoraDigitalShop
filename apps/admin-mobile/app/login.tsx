import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../src/state/theme';
import { useLayout } from '../src/state/layout';
import { useSession } from '../src/state/session';
import { ThemeToggle } from '../src/ui/ThemeToggle';
import { Button, Card, ErrorBox, Field, Loading, Page, T, styles } from '../src/ui';

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
  return <Page><View style={{ width: '100%', maxWidth: 1220, alignSelf: 'center', gap: desktop ? 44 : 26,
    minHeight: desktop ? Math.max(640, height - 90) : undefined, justifyContent: desktop ? 'center' : undefined }}>
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <View style={styles.row}><View style={[styles.brand, { width: 44, height: 44 }]}><T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 23 }}>N</T></View>
        <View><T style={{ fontFamily: 'Vazirmatn_700Bold', letterSpacing: 2, fontSize: 16 }}>NEXORA</T><T style={[styles.muted, { fontSize: 9, letterSpacing: 1.4 }]}>BUSINESS CONTROL</T></View>
      </View><ThemeToggle />
    </View>
    <View style={{ flexDirection: desktop ? 'row-reverse' : 'column', alignItems: 'stretch', gap: desktop ? 64 : 22 }}>
      {desktop && <View testID="login-desktop-story" style={{ flex: 1, justifyContent: 'center', gap: 22, paddingVertical: 10 }}>
        <T style={{ color: c.blue, fontFamily: 'Vazirmatn_700Bold', fontSize: 12 }}>فضایی روشن برای تصمیم‌های هر روز</T>
        <T style={{ fontSize: 42, lineHeight: 65, fontFamily: 'Vazirmatn_700Bold', maxWidth: 580 }}>مدیریت فروشگاه،{ '\n' }با دیدی روشن‌تر.</T>
        <T style={{ color: c.muted, fontSize: 15, lineHeight: 30, maxWidth: 530 }}>سفارش‌ها، محصولات و گفت‌وگوهای مشتریان را در یک فضای آرام، منظم و همیشه در دسترس دنبال کنید.</T>
        <LoginArtwork />
        <View style={[styles.row, { flexWrap: 'wrap', gap: 20 }]}>{[
          ['shield-checkmark-outline', 'دسترسی بر اساس نقش'], ['layers-outline', 'همراه با جریان فروشگاه'],
        ].map(([icon, label]) => <View key={label} style={[styles.row, { gap: 7 }]}><Ionicons name={icon as 'layers-outline'} size={18} color={c.blue} /><T style={styles.muted}>{label}</T></View>)}</View>
      </View>}
      <View style={{ width: desktop ? 420 : '100%', maxWidth: 460, alignSelf: desktop ? 'center' : 'center', gap: 16 }}>
        <Card style={{ padding: desktop ? 32 : 26, borderRadius: 30, gap: 18, boxShadow: dark ? '0 22px 70px rgba(0,0,0,.18)' : '0 22px 70px rgba(39,85,152,.09)' }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ backgroundColor: c.pale, borderRadius: 16, padding: 12 }}><Ionicons name="lock-closed-outline" color={c.blue} size={23} /></View>
            <T style={{ color: c.muted, fontSize: 11 }}>به فضای مدیریت خوش آمدید</T>
          </View>
          <View style={{ gap: 8 }}><T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 29, lineHeight: 44 }}>ورود مدیران</T>
            <T style={styles.muted}>با حساب مدیریت خود وارد شوید و کارهای امروز را با نکسورا پیش ببرید.</T></View>
          {!!session.notice && <T accessibilityRole="alert" style={styles.muted}>{session.notice}</T>}
          <Controller control={form.control} name="email" render={({ field }) => <Field label="ایمیل" autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" autoComplete="email" value={field.value} onChangeText={field.onChange} editable={!form.formState.isSubmitting}
            onBlur={field.onBlur} error={form.formState.errors.email?.message} style={{ textAlign: 'left', writingDirection: 'ltr' }} />} />
          <Controller control={form.control} name="password" render={({ field }) => <View><Field label="رمز عبور" secureTextEntry={!showPassword}
            autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={field.value} onChangeText={field.onChange} editable={!form.formState.isSubmitting}
            style={{ paddingLeft: 52 }} error={form.formState.errors.password?.message} onSubmitEditing={() => void submit()} />
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'} onPress={() => setShowPassword(value => !value)}
              style={{ position: 'absolute', left: 8, top: 35, padding: 10 }}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} color={c.muted} size={22} /></Pressable>
          </View>} />
          <ErrorBox error={error} /><Button busy={form.formState.isSubmitting} onPress={submit}>ورود به مرکز مدیریت</Button>
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
    <T style={[styles.muted, { textAlign: 'center', fontSize: 10 }]}>NEXORA BUSINESS · مدیریت یکپارچه، تجربه‌ای آرام‌تر</T>
  </View></Page>;
}

function LoginArtwork() {
  const { dark } = useTheme();
  return <LinearGradient colors={dark ? ['#163058', '#19517B', '#1D405E'] : ['#DCEBFF', '#CDEBF6', '#E9F4FD']}
    start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ height: 240, borderRadius: 30, overflow: 'hidden', justifyContent: 'center', padding: 24 }}>
    <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', left: -60, top: -70 }} />
    <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 110, backgroundColor: 'rgba(80,145,233,.1)', right: -40, bottom: -60 }} />
    <View style={{ position: 'absolute', left: 40, width: 102, height: 102, borderRadius: 31, backgroundColor: '#2A62D9', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-9deg' }], boxShadow: '0 18px 32px rgba(30,82,169,.22)' }}>
      <T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 61, lineHeight: 90 }}>N</T>
    </View>
    <View style={{ gap: 12, alignSelf: 'flex-end', width: '56%' }}>{[
      ['bag-handle-outline', 'سفارش‌های فروشگاه'], ['cube-outline', 'محصولات و موجودی'], ['chatbubbles-outline', 'ارتباط با مشتریان'],
    ].map(([icon, label]) => <View key={label} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 17, backgroundColor: dark ? 'rgba(15,35,63,.72)' : 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }}>
      <Ionicons name={icon as 'cube-outline'} size={20} color={dark ? '#9BC6FF' : '#2E65BE'} /><T style={{ fontSize: 11 }}>{label}</T>
    </View>)}</View>
  </LinearGradient>;
}
