import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/state/theme';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '../src/state/session';
import { Button, Card, colors, ErrorBox, Field, Loading, Page, T, Title, styles } from '../src/ui';

const schema = z.object({ email: z.email('ایمیل معتبر وارد کنید'), password: z.string().min(1, 'رمز را وارد کنید').max(128) });
export default function Login() {
  const session = useSession();
  const theme = useTheme();
  const [error, setError] = useState('');
  const [health, setHealth] = useState('');
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  if (!session.ready) return <Page><Loading /></Page>;
  if (session.manager) return <Redirect href="/(tabs)" />;
  const submit = form.handleSubmit(async values => {
    setError('');
    try { await session.login(values.email, values.password); form.reset(); }
    catch (e) { setError(e instanceof Error ? e.message : 'ورود موفق نبود.'); }
  });
  return <Page><View style={{ paddingTop: 28, gap: 20, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 50, left: -65 }}><LinearGradient colors={theme.dark ? ['#53698B', '#172B48'] : ['#D9EDFD', '#708DAD']} style={{ width: 135, height: 135, borderRadius: 90, boxShadow: '0 15px 35px rgba(27,55,90,.2)' }} /></View>
    <View pointerEvents="none" style={{ position: 'absolute', top: 280, right: -55 }}><LinearGradient colors={['#C1D7EB', '#617F9E']} style={{ width: 85, height: 85, borderRadius: 50 }} /></View>
    <Title title="مدیریت، همراه شما." subtitle="NEXORA BUSINESS · مرکز فرماندهی فروشگاه" />
    <Button secondary onPress={() => theme.setMode(theme.dark ? 'light' : 'dark')}>{theme.dark ? '☀ حالت روشن' : '☾ حالت تیره'}</Button>
    {!!session.notice && <T accessibilityRole="alert" style={styles.muted}>{session.notice}</T>}
    <Card style={{ padding: 28, borderRadius: 32, borderWidth: 1.5 }}><T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 26, textAlign: 'center', marginBottom: 6 }}>ورود مدیران</T>
      <T style={styles.muted}>از حسابی استفاده کنید که در همین بک‌اند مجوز مدیریت دارد.</T>
      <Controller control={form.control} name="email" render={({ field }) => <Field label="ایمیل" autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" value={field.value} onChangeText={field.onChange}
        onBlur={field.onBlur} error={form.formState.errors.email?.message} style={{ textAlign: 'left', writingDirection: 'ltr' }} />} />
      <Controller control={form.control} name="password" render={({ field }) => <View><Field label="رمز عبور" secureTextEntry={!showPassword}
        autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={field.value} onChangeText={field.onChange}
        style={{ paddingLeft: 52 }} error={form.formState.errors.password?.message} onSubmitEditing={() => void submit()} />
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'} onPress={() => setShowPassword(value => !value)}
          style={{ position: 'absolute', left: 8, top: 35, padding: 10 }}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} color={theme.c.muted} size={22} /></Pressable>
      </View>} />
      <ErrorBox error={error} /><Button busy={form.formState.isSubmitting} onPress={submit}>ورود به مرکز مدیریت</Button>
    </Card>
    <Card><T style={styles.label}>اتصال به بک‌اند</T><T selectable style={[styles.muted, { writingDirection: 'ltr' }]}>{session.baseUrl}</T>
      <Button secondary busy={checking} onPress={async () => {
        setChecking(true); setHealth('');
        try { const result = await session.api.request<{ status: string }>('/api/mobile/health'); setHealth(result.status === 'ok' ? 'بک‌اند پاسخ می‌دهد؛ اعتبار حساب جداگانه بررسی می‌شود.' : 'پاسخ سلامت نامعتبر است.'); }
        catch (e) { setHealth(e instanceof Error ? e.message : 'خطای اتصال'); }
        finally { setChecking(false); }
      }}>بررسی اتصال</Button>{!!health && <T accessibilityRole="alert" style={styles.muted}>{health}</T>}
    </Card><T style={[styles.muted, { textAlign: 'center' }]}>نسخهٔ پایهٔ مدیریتی · ۰.۱</T>
  </View></Page>;
}
