import React, { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Order, Page as ApiPage } from '../src/api/types';
import { useSession } from '../src/state/session';
import { catalogueRial, date, number, statusLabels } from '../src/lib/format';
import { Gate } from '../src/ui/Gate';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Page, Pagination, styles, T, Title, Updated } from '../src/ui';

function Orders() {
  const { api } = useSession();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['orders', search, page], queryFn: ({ signal }) => api.request<ApiPage<Order>>(
    '/api/admin/orders?' + new URLSearchParams({ page: String(page), size: '20', q: search }), { signal }) });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="سفارش‌های سایت" subtitle="فروشگاه آنلاین؛ مستقل از درخواست‌های عمدهٔ تلگرام." back={() => router.back()} />
    <Field label="جست‌وجوی ایمیل یا شماره سفارش" value={text} onChangeText={setText} />
    <Button secondary onPress={() => { setSearch(text.trim()); setPage(1); }}>جست‌وجو</Button>
    <ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {query.data && !query.error && <><T style={styles.muted}>{number(query.data.total)} سفارش</T>
      {!query.data.items.length && <Empty>سفارشی پیدا نشد.</Empty>}
      {query.data.items.map(item => <Card key={item.id}><Badge green={item.status === 'paid'}>{statusLabels[item.status] || item.status}</Badge>
        <T style={styles.label}>{item.name || item.email}</T>
        <T style={styles.muted}>سفارش #{number(item.id)} · {item.email}</T>
        <T style={styles.muted}>{date(item.createdAt)}</T>
        <T style={styles.label}>{catalogueRial(item.total)}</T>
        <Button onPress={() => router.push(`/orders/${item.id}`)}>جزئیات سفارش و فاکتور</Button>
      </Card>)}
      <Pagination page={page} total={query.data.total} size={20} busy={query.isFetching} onPage={setPage} />
    </>}<Updated at={query.dataUpdatedAt} />
  </Page>;
}
export default function OrdersPage() { return <Gate permission="orders:read"><Orders /></Gate>; }
