import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '../src/state/session';
import { Button, Card, colors, ErrorBox, Field, Loading, Page, T, Title, styles } from '../src/ui';

const schema = z.object({ email: z.email('ایمیل معتبر وارد کنید'), password: z.string().min(1, 'رمز را وارد کنید').max(128) });
export default function Login() {
  const session = useSession();
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
  return <Page><View style={{ paddingTop: 35, gap: 24 }}><Title title="مدیریت، همراه شما." subtitle="به مرکز مدیریت نکسورا خوش آمدید." />
    <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}><T style={[styles.eyebrow, { color: '#9AB7F7' }]}>NEXORA BUSINESS INTELLIGENCE</T>
      <T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 23, lineHeight: 38 }}>از یک درخواست، تا یک تصمیم بهتر.</T>
      <T style={{ color: '#C4D3EB', fontSize: 12 }}>درخواست‌های تلگرام، سفارش‌ها و وضعیت فروشگاه در یک اپ.</T></Card>
    {!!session.notice && <T accessibilityRole="alert" style={styles.muted}>{session.notice}</T>}
    <Card><T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 18 }}>ورود مدیران</T>
      <T style={styles.muted}>از حسابی استفاده کنید که در همین بک‌اند مجوز مدیریت دارد.</T>
      <Controller control={form.control} name="email" render={({ field }) => <Field label="ایمیل" autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" value={field.value} onChangeText={field.onChange}
        onBlur={field.onBlur} error={form.formState.errors.email?.message} style={{ textAlign: 'left', writingDirection: 'ltr' }} />} />
      <Controller control={form.control} name="password" render={({ field }) => <Field label="رمز عبور" secureTextEntry={!showPassword}
        autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={field.value} onChangeText={field.onChange}
        error={form.formState.errors.password?.message} onSubmitEditing={() => void submit()} />} />
      <Button secondary onPress={() => setShowPassword(value => !value)}>{showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}</Button>
      <ErrorBox error={error} /><Button busy={form.formState.isSubmitting} onPress={submit}>ورود به مرکز مدیریت</Button>
    </Card>
    <Card><T style={styles.label}>اتصال به بک‌اند</T><T selectable style={[styles.muted, { writingDirection: 'ltr' }]}>{session.baseUrl}</T>
      <Button secondary busy={checking} onPress={async () => {
        setChecking(true); setHealth('');
        try { const result = await session.api.request<{ status: string }>('/health'); setHealth(result.status === 'ok' ? 'بک‌اند پاسخ می‌دهد؛ اعتبار حساب جداگانه بررسی می‌شود.' : 'پاسخ سلامت نامعتبر است.'); }
        catch (e) { setHealth(e instanceof Error ? e.message : 'خطای اتصال'); }
        finally { setChecking(false); }
      }}>بررسی اتصال</Button>{!!health && <T accessibilityRole="alert" style={styles.muted}>{health}</T>}
    </Card><T style={[styles.muted, { textAlign: 'center' }]}>نسخهٔ پایهٔ مدیریتی · ۰.۱</T>
  </View></Page>;
}
