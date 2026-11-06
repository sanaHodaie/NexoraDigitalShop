import React, { useState } from 'react';
import { router } from 'expo-router';
import { useSession } from '../../src/state/session';
import { Badge, Button, Card, colors, ErrorBox, Page, styles, T, Title } from '../../src/ui';

export default function Account() {
  const { manager, baseUrl, logout, can } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Page><Title title="حساب مدیریت" subtitle="دسترسی‌ها از سرور دریافت و در هر عملیات کنترل می‌شوند." />
    <Card><Badge green>مدیر نکسورا</Badge><T style={styles.title}>{manager?.name || 'حساب مدیریت'}</T>
      <T selectable>{manager?.email}</T><T style={styles.muted}>سرور متصل</T><T selectable style={{ writingDirection: 'ltr' }}>{baseUrl}</T>
      <T style={styles.muted}>نسخهٔ اپ: ۰.۱ · اطلاعات این اپ از همان بک‌اند فروشگاه دریافت می‌شود.</T>
    </Card>
    {can('orders:read') && <Button secondary onPress={() => router.push('/orders')}>سفارش‌های سایت</Button>}
    {can('users:read') && <Button secondary onPress={() => router.push('/customers')}>مشتریان فروشگاه</Button>}
    <Card><T style={styles.label}>مجوزهای این حساب</T><T style={[styles.muted, { writingDirection: 'ltr' }]}>{manager?.permissions.join(' · ')}</T></Card>
    <Card style={{ borderColor: '#CFDAF2', backgroundColor: colors.pale }}><T style={styles.label}>مسیر توسعه بر اساس سند Nexora BI</T>
      <T>آماده: درخواست‌ها، فاکتور عمده، آمار واقعی، مشاهدهٔ محصولات و سفارش‌ها، تاریخچهٔ فعالیت.</T>
      <T style={styles.muted}>مرحلهٔ بعد: ویرایش کاتالوگ در اپ، مدیریت نقش‌ها و اعلان موبایل.</T>
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
