import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Audit } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { date } from '../../src/lib/format';
import { Gate } from '../../src/ui/Gate';
import { Badge, Button, Card, Empty, ErrorBox, Loading, Page, styles, T, Title, Updated } from '../../src/ui';

const events: Record<string, string> = {
  LOGIN_SUCCESS: 'ورود موفق', LOGIN_FAILED: 'تلاش ورود ناموفق', LOGOUT: 'خروج از حساب',
  REGISTER_SUCCESS: 'ثبت حساب', PASSWORD_RESET: 'بازیابی رمز', SESSION_REVOKED: 'لغو نشست',
  customer_request_created: 'ثبت درخواست تلگرام', customer_request_updated: 'رسیدگی به درخواست',
  wholesale_approved: 'تأیید عمده و صدور فاکتور', wholesale_delivery_retry: 'تلاش مجدد ارسال فاکتور',
  PRODUCT_CREATED: 'ایجاد محصول', PRODUCT_UPDATED: 'ویرایش محصول', PRODUCT_ARCHIVED: 'بایگانی محصول',
};
function Activity() {
  const { api } = useSession();
  const [cursors, setCursors] = useState<number[]>([0]);
  const before = cursors[cursors.length - 1];
  const query = useQuery({ queryKey: ['audit', before], queryFn: ({ signal }) => api.request<{ items: Audit[]; hasMore: boolean }>(
    `/api/admin/audit?size=25&before=${before}`, { signal }) });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="رویدادهای مدیریت" subtitle="تاریخچهٔ واقعی عملیات ثبت‌شده؛ قابل پیگیری برای تیم مدیریت." />
    <ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {query.data && !query.error && <>
      {!query.data.items.length && <Empty>رویدادی برای نمایش وجود ندارد.</Empty>}
      {query.data.items.map(item => <Card key={item.id}><Badge>{events[item.event] || item.event}</Badge>
        <T style={styles.muted}>{date(item.createdAt)}</T>
        {!!item.email && <T>{item.email}</T>}{!!item.subjectId && <T style={styles.muted}>شناسهٔ مرتبط: {item.subjectId}</T>}
      </Card>)}
      <Button secondary disabled={query.isFetching || cursors.length <= 1} onPress={() => setCursors(v => v.slice(0, -1))}>جدیدتر</Button>
      <Button secondary disabled={query.isFetching || !query.data.hasMore} onPress={() => {
        const last = query.data.items.at(-1); if (last) setCursors(v => [...v, last.id]);
      }}>قدیمی‌تر</Button>
    </>}<Updated at={query.dataUpdatedAt} />
  </Page>;
}
export default function ActivityPage() { return <Gate permission="audit:read"><Activity /></Gate>; }
