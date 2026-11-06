import React, { useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Page as ApiPage, Product } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { catalogueRial, number } from '../../src/lib/format';
import { Filters, productBody } from '../../src/lib/product';
import { ProductImage } from '../../src/ui/ProductImage';
import { Gate } from '../../src/ui/Gate';
import { Select } from '../../src/ui/Select';
import { confirmAction } from '../../src/ui/confirm';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Page, Pagination, styles, T, Title, Updated } from '../../src/ui';
function Inventory() {
  const { api, can, baseUrl } = useSession(); const cache = useQueryClient();
  const [text, setText] = useState(''), [search, setSearch] = useState('');
  const [page, setPage] = useState(1), [category, setCategory] = useState(''), [kind, setKind] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const filters = useQuery({ queryKey: ['product-filters'], queryFn: ({ signal }) => api.request<Filters>('/api/admin/products/filters', { signal }) });
  const query = useQuery({ queryKey: ['products', search, page, category, kind], queryFn: ({ signal }) => api.request<ApiPage<Product>>(
    '/api/admin/products?' + new URLSearchParams({ page: String(page), size: '20', q: search, category, ...(kind ? { kind } : {}) }), { signal }) });
  const toggle = async (item: Product) => {
    if (!await confirmAction(`${item.name} ${item.isActive ? 'غیرفعال' : 'فعال'} شود؟ سوابق سفارش حفظ می‌شود.`)) return;
    setBusy(true); setError('');
    try { await api.request(`/api/admin/products/${item.id}`, { method: 'PUT', body: { ...productBody(item), isActive: !item.isActive } });
      await cache.invalidateQueries({ queryKey: ['products'] });
      void cache.invalidateQueries({ queryKey: ['product', item.id] });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <Page scroll={false}><FlatList<Product> style={{ flex: 1 }} contentContainerStyle={styles.page}
    keyboardShouldPersistTaps="handled" initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3}
    removeClippedSubviews={Platform.OS === 'android'} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
    data={query.data && !query.error ? query.data.items : []} keyExtractor={item => item.id}
    ListHeaderComponent={<View style={{ gap: 16 }}>
    <Title title="ویترین محصولات" subtitle="محصول، قیمت، توضیحات و موجودی؛ همه در یک نگاه." />
    {can('products:write') && <Card><View style={[styles.row, { flexWrap: 'wrap' }]}>
      <Button onPress={() => router.push('/products/new')}>＋ محصول جدید</Button>
      <Button secondary onPress={() => router.push('/pricing')}>تغییر قیمت گروهی</Button>
      <Button secondary onPress={() => router.push('/import-products')}>ورود از اکسل</Button></View></Card>}
    <Card><Field label="جست‌وجوی نام، برند یا شناسه" value={text} onChangeText={setText} returnKeyType="search" onSubmitEditing={() => { setSearch(text.trim()); setPage(1); }} />
      <Button secondary onPress={() => { setSearch(text.trim()); setPage(1); }}>جست‌وجو</Button>
      <Select label="فیلتر دسته‌بندی محصولات" value={category} options={[{ value: '', label: 'همهٔ دسته‌بندی‌ها' }, ...(filters.data?.categories || []).map(c => ({ value: c.id, label: c.title }))]}
        onChange={v => { setCategory(v); setKind(''); setPage(1); }} />
      {!!category && !!filters.data?.kinds[category]?.length && <Select label="نوع محصول؛ مثلاً هندزفری" value={kind}
        options={[{ value: '', label: 'همهٔ انواع این دسته' }, ...filters.data.kinds[category].map(value => ({ value, label: value }))]} onChange={v => { setKind(v); setPage(1); }} />}
    </Card><ErrorBox error={error || filters.error || query.error} retry={() => { void filters.refetch(); void query.refetch(); }} />{query.isLoading && <Loading />}
    {query.data && !query.error && <><T style={styles.muted}>{number(query.data.total)} محصول</T>
      {!query.data.items.length && <Empty>محصولی پیدا نشد.</Empty>}
    </>}</View>}
    renderItem={({ item }) => <Card><View style={[styles.row, { alignItems: 'flex-start' }]}>
          <ProductImage path={item.image} baseUrl={baseUrl} label={item.name} style={{ width: 94, height: 110 }} />
          <View style={{ flex: 1, gap: 7 }}><Badge green={item.isActive && item.stock >= 5}>{!item.isActive ? 'غیرفعال' : item.stock < 5 ? 'کم‌موجودی' : 'فعال'}</Badge>
            <T style={styles.label}>{item.name}</T><T style={styles.muted}>{item.brand} · {item.id}</T><T>{catalogueRial(item.price)}</T></View>
        </View><T numberOfLines={4}>{item.description || 'توضیحی ثبت نشده است.'}</T><T style={styles.muted}>{item.categoryFa || item.category} · موجودی: {number(item.stock)}</T>
        {can('products:write') && <View style={[styles.row, { flexWrap: 'wrap' }]}><Button onPress={() => router.push(`/products/${item.id}`)}>ویرایش محصول</Button>
          <Button secondary disabled={busy} onPress={() => void toggle(item)}>{item.isActive ? 'غیرفعال کردن' : 'فعال کردن'}</Button></View>}
      </Card>}
    ListFooterComponent={<View style={{ gap: 16 }}>{query.data && <Pagination page={page} total={query.data.total} size={20} busy={query.isFetching} onPage={setPage} />}
      <Updated at={query.dataUpdatedAt} /></View>}
  /></Page>;
}
export default function InventoryPage() { return <Gate permission="products:read"><Inventory /></Gate>; }
