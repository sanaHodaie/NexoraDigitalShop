import React, { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../src/state/session';
import type { Page as ApiPage } from '../src/api/types';
import { date, number } from '../src/lib/format';
import { Gate } from '../src/ui/Gate';
import { Button, Card, Empty, ErrorBox, Field, Loading, Page, Pagination, styles, T, Title, Updated } from '../src/ui';

type Customer = { id: number; email: string; fullName: string; orders: number; registeredAt: string | null; lastLoginAt: string | null };
function Customers() {
  const { api } = useSession();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['customers', page, search], queryFn: ({ signal }) => api.request<ApiPage<Customer>>(
    '/api/admin/users?' + new URLSearchParams({ page: String(page), size: '20', q: search }), { signal }) });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="مشتریان فروشگاه" subtitle="حساب‌های ثبت‌شدهٔ سایت؛ مشتریان بات در صندوق درخواست‌ها قرار دارند." back={() => router.back()} />
    <Field label="جست‌وجوی نام یا ایمیل" value={text} onChangeText={setText} />
    <Button secondary onPress={() => { setSearch(text.trim()); setPage(1); }}>جست‌وجو</Button>
    <ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {query.data && !query.error && <><T style={styles.muted}>{number(query.data.total)} حساب</T>
      {!query.data.items.length && <Empty>حسابی پیدا نشد.</Empty>}
      {query.data.items.map(customer => <Card key={customer.id}><T style={styles.label}>{customer.fullName || 'بدون نام'}</T>
        <T>{customer.email}</T><T style={styles.muted}>تعداد سفارش: {number(customer.orders)}</T>
        <T style={styles.muted}>آخرین ورود: {customer.lastLoginAt ? date(customer.lastLoginAt) : 'ثبت نشده'}</T>
      </Card>)}
      <Pagination page={page} total={query.data.total} size={20} busy={query.isFetching} onPage={setPage} />
    </>}<Updated at={query.dataUpdatedAt} />
  </Page>;
}
export default function CustomersPage() { return <Gate permission="users:read"><Customers /></Gate>; }
