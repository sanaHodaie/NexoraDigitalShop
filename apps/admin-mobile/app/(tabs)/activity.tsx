import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { downloadFile } from '../../src/api/invoice';
import { Select } from '../../src/ui/Select';
import { useTheme } from '../../src/state/theme';
import type { Audit } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { date } from '../../src/lib/format';
import { Gate } from '../../src/ui/Gate';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Page, styles, T, Title, Updated } from '../../src/ui';

const events: Record<string, string> = {
  LOGIN_SUCCESS: 'ورود موفق', LOGIN_FAILED: 'تلاش ورود ناموفق', LOGOUT: 'خروج از حساب',
  REGISTER_SUCCESS: 'ثبت حساب', PASSWORD_RESET: 'بازیابی رمز', SESSION_REVOKED: 'لغو نشست',
  customer_request_created: 'ثبت درخواست تلگرام', customer_request_updated: 'رسیدگی به درخواست',
  wholesale_approved: 'تأیید عمده و صدور فاکتور', wholesale_delivery_retry: 'تلاش مجدد ارسال فاکتور',
  PRODUCT_CREATED: 'ایجاد محصول', PRODUCT_UPDATED: 'ویرایش محصول', PRODUCT_ARCHIVED: 'بایگانی محصول',
  PRODUCT_PRICE_CHANGED: 'تغییر گروهی قیمت', CONTENT_UPDATED: 'ویرایش محتوا', PAYMENT_CONFIRMED: 'تأیید پرداخت',
  ADMIN_ORDER_CANCELLED: 'لغو سفارش توسط مدیر', ADMIN_SESSIONS_REVOKED: 'لغو نشست‌های کاربر', EMAIL_VERIFIED: 'تأیید ایمیل',
};
function Activity() {
  const { api, token, baseUrl } = useSession(); const { c } = useTheme();
  const [event, setEvent] = useState(''), [since, setSince] = useState(''), [until, setUntil] = useState('');
  const [range, setRange] = useState({ since: '', until: '' }), [exportError, setExportError] = useState(''), [exporting, setExporting] = useState(false);
  const [cursors, setCursors] = useState<number[]>([0]);
  const before = cursors[cursors.length - 1];
  const params = new URLSearchParams({ event, ...(range.since ? { since: range.since } : {}), ...(range.until ? { until: range.until } : {}) });
  const query = useQuery({ queryKey: ['audit', before, event, range], refetchInterval: 15_000, queryFn: ({ signal }) => api.request<{ items: Audit[]; hasMore: boolean }>(
    `/api/admin/audit?size=25&before=${before}&${params}`, { signal }) });
  const active = useQuery({ queryKey: ['active-users'], refetchInterval: 15_000, queryFn: () => api.request<{ items: { id: number; fullName: string; email: string; sessions: number }[] }>('/api/admin/activity') });
  const download = async (format: 'xlsx' | 'docx') => { if (!token) return; setExporting(true); setExportError('');
    try { await downloadFile(baseUrl, token, '/api/admin/audit/export?' + params + '&format=' + format, 'Nexora-audit.' + format,
      format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (e) { setExportError((e as Error).message); } finally { setExporting(false); }
  };
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="رویدادهای مدیریت" subtitle="تاریخچهٔ واقعی عملیات ثبت‌شده؛ قابل پیگیری برای تیم مدیریت." />
    <Card><T style={styles.label}>فعالیت اخیر حساب‌ها</T><T style={styles.muted}>درخواست معتبر در پنج دقیقهٔ اخیر؛ تعداد قطعی افراد آنلاین نیست.</T>
      {active.data?.items.map(person => <T key={person.id}>● {person.fullName || person.email} · {person.sessions} نشست</T>)}
      {active.data?.items.length === 0 && <T style={styles.muted}>فعالیت اخیری ثبت نشده است.</T>}
    </Card>
    <Card><Select label="نوع رویداد" value={event} options={[{ value: '', label: 'همهٔ رویدادها' }, ...Object.entries(events).map(([value, label]) => ({ value, label }))]} onChange={v => { setEvent(v); setCursors([0]); }} />
      <Field label="از تاریخ میلادی؛ YYYY-MM-DD" value={since} onChangeText={setSince} /><Field label="تا تاریخ میلادی؛ YYYY-MM-DD" value={until} onChangeText={setUntil} />
      <Button secondary onPress={() => { if ([since, until].some(v => v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))))) { setExportError('تاریخ معتبر میلادی وارد کنید.'); return; }
        setExportError(''); setRange({ since: since ? since + 'T00:00:00Z' : '', until: until ? until + 'T23:59:59Z' : '' }); setCursors([0]); }}>اعمال بازهٔ تاریخ UTC</Button>
      <View style={[styles.row, { flexWrap: 'wrap' }]}><Button secondary busy={exporting} onPress={() => void download('xlsx')}>دانلود اکسل گزارش‌ها</Button>
        <Button secondary disabled={exporting} onPress={() => void download('docx')}>دانلود ورد گزارش‌ها</Button></View>
      <T style={styles.muted}>خروجی شامل همهٔ رویدادهای فیلترشده تا سقف ۱۰۰۰۰ مورد است، نه فقط این صفحه.</T>
    </Card><ErrorBox error={query.error || active.error || exportError} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {query.data && !query.error && <>
      {!query.data.items.length && <Empty>رویدادی برای نمایش وجود ندارد.</Empty>}
      {query.data.items.map(item => <Card key={item.id}><View style={styles.row}><View style={{ backgroundColor: c.pale, borderRadius: 18, padding: 12 }}>
        <Ionicons name={item.event.includes('FAILED') ? 'shield-outline' : item.event.includes('PRODUCT') ? 'cube-outline' : 'pulse-outline'} color={item.event.includes('FAILED') ? c.danger : c.blue} size={24} /></View>
        <View style={{ flex: 1 }}><Badge>{events[item.event] || item.event}</Badge><T style={styles.muted}>رویداد #{item.id}</T></View></View>
        <T style={styles.muted}>{date(item.createdAt)}</T>
        {!!item.fullName && <T style={styles.label}>{item.fullName}</T>}{!!item.email && <T>{item.email}</T>}{!!item.subjectId && <T style={styles.muted}>شناسهٔ مرتبط: {item.subjectId}</T>}
      </Card>)}
      <Button secondary disabled={query.isFetching || cursors.length <= 1} onPress={() => setCursors(v => v.slice(0, -1))}>جدیدتر</Button>
      <Button secondary disabled={query.isFetching || !query.data.hasMore} onPress={() => {
        const last = query.data.items.at(-1); if (last) setCursors(v => [...v, last.id]);
      }}>قدیمی‌تر</Button>
    </>}<Updated at={query.dataUpdatedAt} />
  </Page>;
}
export default function ActivityPage() { return <Gate permission="audit:read"><Activity /></Gate>; }
