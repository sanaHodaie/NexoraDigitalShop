import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../../src/state/session';
import { Product } from '../../src/api/types';
import { fileBytes } from '../../src/api/files';
import { ProductImage } from '../../src/ui/ProductImage';
import { Filters, integer, productBody } from '../../src/lib/product';
import { Gate } from '../../src/ui/Gate';
import { Select } from '../../src/ui/Select';
import { Button, Card, ErrorBox, Field, Loading, Page, styles, T, Title } from '../../src/ui';
function Editor({ product, create, filters }: { product: Product; create: boolean; filters?: Filters }) {
  const { api, baseUrl } = useSession(); const cache = useQueryClient();
  const [form, setForm] = useState({ ...productBody(product), priceRial: String(Math.round(product.price * 600000)), stock: String(product.stock), specs: (product.specs || []).join('\n') });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const change = (key: string, value: unknown) => { setForm(old => ({ ...old, [key]: value })); setSaved(false); };
  const save = async () => {
    setBusy(true); setError('');
    try { const body = { ...form, priceRial: integer(form.priceRial, 600000000000), stock: integer(form.stock, 1000000), specs: form.specs.split('\n').map(s => s.trim()).filter(Boolean) };
      const result = await api.request<Product>(create ? '/api/admin/products' : `/api/admin/products/${product.id}`, { method: create ? 'POST' : 'PUT', body });
      cache.setQueryData(['product', result.id], result);
      setForm(old => ({ ...old, expectedStock: result.stock })); setSaved(true);
      void cache.invalidateQueries({ queryKey: ['products'] }); void cache.invalidateQueries({ queryKey: ['product-filters'] });
      if (create) router.replace(`/products/${result.id}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <Card><Field label="شناسهٔ محصول؛ انگلیسی کوچک و خط تیره" value={form.id} editable={create && !busy} autoCapitalize="none" onChangeText={v => change('id', v)} />
    <Field editable={!busy} label="نام فارسی" value={form.name} onChangeText={v => change('name', v)} maxLength={200} />
    <Field editable={!busy} label="نام انگلیسی" value={form.nameEn} onChangeText={v => change('nameEn', v)} maxLength={200} />
    <Select disabled={busy} label="دسته‌بندی" value={form.category} options={(filters?.categories || []).map(c => ({ value: c.id, label: c.title }))}
      onChange={v => { change('category', v); change('categoryFa', filters?.categories.find(c => c.id === v)?.title || ''); }} />
    <Field editable={!busy} label="برند" value={form.brand} onChangeText={v => change('brand', v)} maxLength={100} />
    <Field editable={!busy} label="قیمت (ریال)" value={form.priceRial} onChangeText={v => change('priceRial', v)} keyboardType="number-pad" />
    <Field editable={!busy} label="موجودی" value={form.stock} onChangeText={v => change('stock', v)} keyboardType="number-pad" />
    <Field editable={!busy} label="توضیحات محصول در سایت" value={form.description} onChangeText={v => change('description', v)} multiline maxLength={5000} />
    <Field editable={!busy} label="مشخصات؛ هر مورد در یک خط" value={form.specs} onChangeText={v => change('specs', v)} multiline />
    <Field editable={!busy} label="نشان محصول" value={form.badge} onChangeText={v => change('badge', v)} maxLength={50} />
    <ProductImage path={form.image} baseUrl={baseUrl} label={form.name || 'پیش‌نمایش محصول'} large style={{ width: '100%', height: 180 }} />
    <Button secondary disabled={busy} onPress={async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85 }); if (result.canceled) return;
      const asset = result.assets[0]; setBusy(true); setError('');
      try { const raw = await fileBytes(asset.uri, asset.file); if (raw.byteLength > 2 * 1024 * 1024) throw new Error('حداکثر حجم تصویر ۲ مگابایت است.');
        const uploaded = await api.request<{ url: string }>('/api/admin/media', { method: 'POST', raw, contentType: asset.mimeType || 'image/jpeg' }); change('image', uploaded.url);
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>انتخاب و بارگذاری تصویر</Button>
    <View style={styles.row}><Switch disabled={busy} accessibilityLabel="محصول فعال باشد" value={form.isActive} onValueChange={v => change('isActive', v)} /><T>محصول در فروشگاه فعال باشد</T></View>
    <ErrorBox error={error} /><Button busy={busy} onPress={() => void save()}>ذخیرهٔ محصول</Button>{saved && <T accessibilityRole="alert">محصول با موفقیت ذخیره شد.</T>}
  </Card>;
}
function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { api } = useSession();
  const filters = useQuery({ queryKey: ['product-filters'], queryFn: () => api.request<Filters>('/api/admin/products/filters') });
  const query = useQuery({ queryKey: ['product', id], enabled: id !== 'new', refetchOnWindowFocus: false, queryFn: () => api.request<Product>(`/api/admin/products/${id}`) });
  const blank: Product = { id: '', name: '', nameEn: '', category: filters.data?.categories[0]?.id || 'smartphones', categoryFa: filters.data?.categories[0]?.title || '', price: 0, stock: 0, isActive: false, image: '/assets/products/product-pending.svg', description: '', specs: [] };
  return <Page><Title title={id === 'new' ? 'محصول جدید' : 'ویرایش محصول'} back={() => router.back()} /><ErrorBox error={query.error || filters.error} />
    {(query.isFetching || filters.isLoading) && <Loading />}{id === 'new' && filters.data ? <Editor key="new" product={blank} create filters={filters.data} /> : query.data && !query.isFetching && <Editor key={id} product={query.data} create={false} filters={filters.data} />}
  </Page>;
}
export default function ProductEditor() { return <Gate permission="products:write"><ProductPage /></Gate>; }
