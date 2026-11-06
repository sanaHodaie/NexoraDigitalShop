import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../src/state/session';
import { Filters } from '../src/lib/product';
import { digits, number, rial } from '../src/lib/format';
import { Gate } from '../src/ui/Gate';
import { Select } from '../src/ui/Select';
import { Button, Card, ErrorBox, Field, Page, T, Title } from '../src/ui';
type Preview = { snapshot: string; total: number; changed: number; applied: boolean; items: { id: string; name: string; oldPriceRial: number; newPriceRial: number }[] };
function Pricing() {
  const { api } = useSession(); const cache = useQueryClient();
  const [category, setCategory] = useState('smartphones'), [brand, setBrand] = useState(''), [percent, setPercent] = useState('15');
  const [preview, setPreview] = useState<Preview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const filters = useQuery({ queryKey: ['product-filters'], queryFn: () => api.request<Filters>('/api/admin/products/filters') });
  const brands = useQuery({ queryKey: ['brands', category], queryFn: () => api.request<{ items: string[] }>('/api/admin/products/pricing/brands?category=' + category) });
  const submit = async (apply: boolean) => {
    setBusy(true); setError('');
    try { const normalized = digits(percent).replace('٫', '.').trim();
      if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0 || Number(normalized) > 100) throw new Error('درصد افزایش باید بیشتر از صفر تا ۱۰۰ و حداکثر دو رقم اعشار باشد.');
      const result = await api.request<Preview>('/api/admin/products/pricing', { method: 'POST', body: { category, brand: brand || null, percent: normalized, ...(apply ? { snapshot: preview!.snapshot } : {}) } });
      setPreview(result); setPage(1); if (result.applied) { void cache.invalidateQueries({ queryKey: ['products'] }); void cache.invalidateQueries({ queryKey: ['product'] }); }
    } catch (e) { setError((e as Error).message); setPreview(null); } finally { setBusy(false); }
  };
  return <Page><Title title="تغییر قیمت گروهی" subtitle="افزایش قیمت با پیش‌نمایش و تأیید؛ فاکتورهای قبلی تغییر نمی‌کنند." back={() => router.back()} />
    <Card><Select label="دستهٔ محصولات" disabled={busy} value={category} options={(filters.data?.categories || []).map(c => ({ value: c.id, label: c.title }))}
      onChange={v => { setCategory(v); setBrand(''); setPreview(null); }} />
      <Select label="برند" disabled={busy} value={brand} options={[{ value: '', label: 'همهٔ برندها' }, ...(brands.data?.items || []).map(value => ({ value, label: value }))]} onChange={v => { setBrand(v); setPreview(null); }} />
      <Field label="درصد افزایش" value={percent} editable={!busy} keyboardType="decimal-pad" onChangeText={v => { setPercent(v); setPreview(null); }} />
      <T>محصولات غیرفعال و ناموجودِ همین فیلتر هم در تغییر قیمت شرکت می‌کنند.</T>
      <Button busy={busy} disabled={brands.isError || filters.isError} onPress={() => void submit(false)}>پیش‌نمایش قیمت‌ها</Button>
    </Card><ErrorBox error={error || filters.error || brands.error} />
    {preview && <Card><T>{preview.applied ? 'تغییر قیمت اعمال شد' : 'بازبینی پیش از اعمال'} · {number(preview.changed)} محصول</T>
      {preview.items.slice((page - 1) * 20, page * 20).map(p => <Card key={p.id}><T>{p.name}</T><T>{rial(p.oldPriceRial)} ← {rial(p.newPriceRial)}</T></Card>)}
      {page > 1 && <Button secondary onPress={() => setPage(p => p - 1)}>قبلی</Button>}{page * 20 < preview.total && <Button secondary onPress={() => setPage(p => p + 1)}>بعدی</Button>}
      {!preview.applied && preview.changed > 0 && <Button busy={busy} onPress={() => void submit(true)}>تأیید افزایش برای {number(preview.changed)} محصول</Button>}
    </Card>}
  </Page>;
}
export default function PricingPage() { return <Gate permission="products:write"><Pricing /></Gate>; }
