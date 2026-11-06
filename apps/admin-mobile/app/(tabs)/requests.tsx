import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CustomerRequest, Page as ApiPage, RequestStatus } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { date, number, statusLabels } from '../../src/lib/format';
import { Gate } from '../../src/ui/Gate';
import { Badge, Button, Card, Chips, Empty, ErrorBox, Loading, Page, Pagination, styles, T, Title, Updated } from '../../src/ui';

function Inbox() {
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const query = useQuery({ queryKey: ['requests', kind, status, page],
    queryFn: ({ signal }) => api.request<ApiPage<CustomerRequest>>('/api/admin/customer-requests?' + new URLSearchParams({
      page: String(page), ...(kind ? { kind } : {}), ...(status ? { status } : {}),
    }), { signal }) });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="صندوق درخواست‌ها" subtitle="درخواست‌های عمده و پشتیبانی بات تلگرام؛ جدا از سفارش‌های پرداخت‌شدهٔ سایت." />
    <Chips value={kind} onChange={v => { setKind(v); setPage(1); }} options={[
      { value: '', label: 'همهٔ درخواست‌ها' }, { value: 'wholesale', label: 'خرید عمده' }, { value: 'support', label: 'پشتیبانی' },
    ]} />
    <Chips value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
      { value: '', label: 'همهٔ وضعیت‌ها' }, ...Object.keys(statusLabels).filter(s => ['new', 'reviewing', 'contacted', 'quoted', 'closed', 'cancelled', 'approved'].includes(s))
        .map(value => ({ value, label: statusLabels[value as RequestStatus] })),
    ]} />
    <ErrorBox error={query.error} retry={() => void query.refetch()} />
    {query.isLoading && <Loading />}
    {!query.error && query.data && <><T style={styles.muted}>{number(query.data.total)} درخواست</T>
      {!query.data.items.length && <Empty>درخواستی با این فیلتر وجود ندارد.</Empty>}
      {query.data.items.map(item => <Pressable key={item.id} accessibilityRole="button"
        accessibilityLabel={`مشاهدهٔ درخواست ${item.id}، ${item.details.name}`} onPress={() => router.push(`/requests/${item.id}`)}>
        <Card><View style={[styles.row, { justifyContent: 'space-between' }]}><Badge green={item.status === 'approved'}>{statusLabels[item.status]}</Badge>
          <T style={styles.muted}>#{number(item.id)} · {item.kind === 'wholesale' ? 'عمده' : 'پشتیبانی'}</T></View>
          <T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 17 }}>{item.details.name}</T>
          <T numberOfLines={2}>{item.details.items}</T>
          <T style={styles.muted}>{item.details.city} · {number(item.details.quantity)} عدد · {date(item.createdAt)}</T>
        </Card>
      </Pressable>)}
      <Pagination page={page} total={query.data.total} size={20} busy={query.isFetching} onPage={setPage} />
    </>}
    <Updated at={query.dataUpdatedAt} /><Button secondary onPress={() => void query.refetch()}>تازه‌سازی درخواست‌ها</Button>
  </Page>;
}
export default function Requests() { return <Gate permission="orders:read"><Inbox /></Gate>; }
