import React, { useState } from 'react';
import { router } from 'expo-router';
import { useSession } from '../../src/state/session';
import { Badge, Button, Card, colors, ErrorBox, Page, styles, T, Title } from '../../src/ui';
import { Chips } from '../../src/ui';
import { ThemeMode, useTheme } from '../../src/state/theme';

export default function Account() {
  const { manager, baseUrl, logout, can } = useSession();
  const theme = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Page><Title title="حساب مدیریت" subtitle="دسترسی‌ها از سرور دریافت و در هر عملیات کنترل می‌شوند." />
    <Card><Badge green>مدیر نکسورا</Badge><T style={styles.title}>{manager?.name || 'حساب مدیریت'}</T>
      <T selectable>{manager?.email}</T><T style={styles.muted}>سرور متصل</T><T selectable style={{ writingDirection: 'ltr' }}>{baseUrl}</T>
      <T style={styles.muted}>نسخهٔ اپ: ۰.۲ · مرکز مدیریت نکسورا</T>
    </Card>
    <Card><T style={styles.label}>ظاهر برنامه</T><Chips<ThemeMode> value={theme.mode} options={[
      { value: 'light', label: 'روشن' }, { value: 'dark', label: 'تیره' }, { value: 'auto', label: 'هماهنگ با دستگاه' },
    ]} onChange={theme.setMode} /></Card>
    {can('orders:read') && <Button secondary onPress={() => router.push('/orders')}>سفارش‌های سایت</Button>}
    {can('users:read') && <Button secondary onPress={() => router.push('/customers')}>مشتریان فروشگاه</Button>}
    {can('subscribers:read') && <Button secondary onPress={() => router.push('/newsletter')}>خبرنامه و اعلان‌ها</Button>}
    {can('products:write') && <><Button secondary onPress={() => router.push('/pricing')}>تغییر قیمت گروهی</Button><Button secondary onPress={() => router.push('/import-products')}>ورود محصولات از اکسل</Button></>}
    {can('content:read') && <><Button secondary onPress={() => router.push('/content/home')}>مدیریت صفحهٔ اصلی</Button><Button secondary onPress={() => router.push('/content/articles')}>مجله و مقاله‌ها</Button>
      <Button secondary onPress={() => router.push('/content/settings')}>تنظیمات فروشگاه</Button></>}
    {can('assistant:read') && <Button secondary onPress={() => router.push('/assistant')}>تنظیم و آزمایش راهنمای خرید</Button>}
    <Card><T style={styles.label}>مجوزهای این حساب</T><T style={[styles.muted, { writingDirection: 'ltr' }]}>{manager?.permissions.join(' · ')}</T></Card>
    <Card style={{ borderColor: '#CFDAF2', backgroundColor: colors.pale }}><T style={styles.label}>مسیر توسعه بر اساس سند Nexora BI</T>
      <T>امکانات عملیاتی پنل وب در این اپ در دسترس‌اند؛ مدیریت نقش‌ها همچنان از ابزار اپراتور انجام می‌شود.</T>
      <T style={styles.muted}>اعلان خبرنامه داخل اپ فعال است؛ Push در زمان بسته‌بودن اپ هنوز اضافه نشده است.</T>
      <T style={styles.muted}>پس از تکمیل داده‌ها: تحلیل کمپین، گزارش هوشمند، Business Brain و Future Mirror.</T>
      <T style={styles.muted}>نسخهٔ فعلی پیش‌بینی فروش یا تصمیم‌گیری خودکار ندارد.</T>
    </Card>
    <ErrorBox error={error} />
    {confirm ? <Card><T>از حساب این دستگاه خارج می‌شوید؟</T>
      <Button danger busy={busy} onPress={async () => { setBusy(true); setError('');
        try { await logout(); } catch { setError('پاک‌کردن نشست دستگاه موفق نبود؛ دوباره تلاش کنید.'); }
        finally { setBusy(false); }
      }}>تأیید خروج</Button><Button secondary disabled={busy} onPress={() => setConfirm(false)}>انصراف</Button></Card>
      : <Button secondary onPress={() => setConfirm(true)}>خروج از حساب</Button>}
  </Page>;
}
