import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../src/state/session';
import { date, number } from '../src/lib/format';
import { Gate } from '../src/ui/Gate';
import { Badge, Button, Card, Empty, ErrorBox, Field, Page, Pagination, styles, T, Title } from '../src/ui';
type Subscriber = { id: number; email: string; fullName: string; name?: string; accountEmail?: string; createdAt: string | null; unread?: boolean };
type Notifications = { unread: number; latestId: number; items: Subscriber[] };
function Newsletter() {
  const { api } = useSession(); const cache = useQueryClient(); const marked = useRef(false);
  const [page, setPage] = useState(1), [text, setText] = useState(''), [search, setSearch] = useState(''), [error, setError] = useState('');
  const news = useQuery({ queryKey: ['newsletter-notifications'], queryFn: () => api.request<Notifications>('/api/admin/newsletter-notifications') });
  const subscribers = useQuery({ queryKey: ['subscribers', page, search], queryFn: () => api.request<{ total: number; items: Subscriber[] }>(
    '/api/admin/subscribers?' + new URLSearchParams({ page: String(page), size: '20', q: search })) });
  const markAll = async () => { if (!news.data) return; setError('');
    try { await api.request('/api/admin/newsletter-notifications/read', { method: 'POST', body: { throughId: news.data.latestId } });
      await cache.invalidateQueries({ queryKey: ['newsletter-notifications'] });
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { if (marked.current || !news.data) return; marked.current = true;
    api.request('/api/admin/newsletter-notifications/read', { method: 'POST', body: { throughId: news.data.latestId } })
      .then(() => cache.invalidateQueries({ queryKey: ['newsletter-notifications'] })).catch(e => setError(e.message));
  }, [news.data, api, cache]);
  return <Page onRefresh={() => { void news.refetch(); void subscribers.refetch(); }} refreshing={subscribers.isRefetching}>
    <Title title="خبرنامه و اعلان‌ها" subtitle="اعضای جدید؛ اعلان‌ها هر ۳۰ ثانیه در اپ باز بررسی می‌شوند." back={() => router.back()} />
    <Button secondary onPress={() => { void news.refetch(); void subscribers.refetch(); }}>تازه‌سازی خبرنامه</Button>
    {!!news.data?.unread && <Button secondary onPress={() => void markAll()}>همهٔ اعلان‌ها خوانده شدند</Button>}
    <ErrorBox error={error || news.error || subscribers.error} />
    <Card><T style={styles.label}>آخرین عضویت‌ها</T>{news.data?.items.map(item => <Card key={item.id}>
      {item.unread && <Badge>جدید</Badge>}<T>{item.name || 'کاربر فروشگاه'}</T><T>{item.email}</T><T style={styles.muted}>{item.createdAt ? date(item.createdAt) : 'تاریخ ثبت نشده'}</T>
    </Card>)}{news.data?.items.length === 0 && <Empty>عضوی ثبت نشده است.</Empty>}</Card>
    <Card><Field label="جست‌وجوی عضو خبرنامه" value={text} onChangeText={setText} /><Button secondary onPress={() => { setSearch(text.trim()); setPage(1); }}>جست‌وجو</Button></Card>
    {subscribers.data && <><T>{number(subscribers.data.total)} عضویت</T>{subscribers.data.items.map(item => <Card key={item.id}>
      <T style={styles.label}>{item.fullName || 'نام ثبت نشده'}</T><T>ایمیل خبرنامه: {item.email}</T><T style={styles.muted}>حساب: {item.accountEmail || 'بدون اتصال به حساب'}</T>
      <T style={styles.muted}>{item.createdAt ? date(item.createdAt) : 'تاریخ ثبت نشده'}</T>
    </Card>)}<Pagination page={page} total={subscribers.data.total} size={20} busy={subscribers.isFetching} onPage={setPage} /></>}
  </Page>;
}
export default function NewsletterPage() { return <Gate permission="subscribers:read"><Newsletter /></Gate>; }
