import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Page as ApiPage, Product } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { catalogueRial, number } from '../../src/lib/format';
import { Gate } from '../../src/ui/Gate';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Page, Pagination, styles, T, Title, Updated } from '../../src/ui';

function Inventory() {
  const { api } = useSession();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['products', search, page], queryFn: ({ signal }) => api.request<ApiPage<Product>>(
    '/api/admin/products?' + new URLSearchParams({ page: String(page), size: '20', q: search }), { signal }) });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title="محصولات و موجودی" subtitle="فهرست زندهٔ کاتالوگ؛ محصولات از API دریافت می‌شوند." />
    <Field label="جست‌وجوی نام، برند یا شناسه" value={text} onChangeText={setText} returnKeyType="search"
      onSubmitEditing={() => { setSearch(text.trim()); setPage(1); }} />
    <Button secondary onPress={() => { setSearch(text.trim()); setPage(1); }}>جست‌وجو</Button>
    <ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {query.data && !query.error && <><T style={styles.muted}>{number(query.data.total)} محصول · مشاهدهٔ اطلاعات؛ ویرایش کاتالوگ در پنل وب موجود است.</T>
      {!query.data.items.length && <Empty>محصولی پیدا نشد.</Empty>}
      {query.data.items.map(item => <Card key={item.id}><View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Badge green={item.isActive && item.stock >= 5}>{!item.isActive ? 'بایگانی' : item.stock < 5 ? 'کم‌موجودی' : 'فعال'}</Badge>
        <T style={styles.muted}>{item.id}</T></View>
        <T style={styles.label}>{item.name}</T><T style={styles.muted}>{item.category} · موجودی: {number(item.stock)}</T>
        <T>{catalogueRial(item.price)}</T>
      </Card>)}
      <Pagination page={page} total={query.data.total} size={20} busy={query.isFetching} onPage={setPage} />
    </>}<Updated at={query.dataUpdatedAt} />
  </Page>;
}
export default function InventoryPage() { return <Gate permission="products:read"><Inventory /></Gate>; }
