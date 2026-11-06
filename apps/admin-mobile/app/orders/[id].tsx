import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../src/state/session';
import { downloadFile } from '../../src/api/invoice';
import { date, rial, statusLabels } from '../../src/lib/format';
import { Gate } from '../../src/ui/Gate';
import { confirmAction } from '../../src/ui/confirm';
import { Badge, Button, Card, ErrorBox, Field, Loading, Page, styles, T, Title } from '../../src/ui';
type Detail = { id: number; status: string; createdAt: string; paidAt: string | null; paymentReference?: string | null; email: string; shippingAddress: Record<string, string>;
  subtotalRial: number; shippingRial: number; totalRial: number; lines: { productId: string; name: string; quantity: number; unitPriceRial: number; totalRial: number }[] };
const labels: Record<string, string> = { recipient: 'نام گیرنده', phone: 'شماره تماس', province: 'استان', city: 'شهر', postalCode: 'کد پستی', address: 'نشانی کامل', building: 'پلاک / ساختمان', unit: 'واحد', notes: 'توضیحات تحویل' };
function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { api, baseUrl, token, can } = useSession(); const cache = useQueryClient();
  const query = useQuery({ queryKey: ['order', id], queryFn: () => api.request<Detail>(`/api/admin/orders/${id}`) });
  const [reference, setReference] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const act = async (type: 'cancel' | 'confirm-payment') => {
    if (!await confirmAction(type === 'cancel' ? 'سفارش لغو و موجودی رزروشده آزاد شود؟' : 'پرداخت واقعاً دریافت شده و با این شماره مرجع تأیید می‌شود؟')) return;
    setBusy(true); setError('');
    try { await api.request(`/api/admin/orders/${id}/${type}`, { method: 'POST', ...(type === 'confirm-payment' ? { body: { reference } } : {}) });
      void query.refetch(); void cache.invalidateQueries({ queryKey: ['orders'] }); void cache.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const download = async (warranty: boolean) => { if (!token) return; setBusy(true); setError('');
    try { await downloadFile(baseUrl, token, `/api/admin/orders/${id}/${warranty ? 'warranty' : 'invoice.pdf'}`, `Nexora-order-${id}.${warranty ? 'html' : 'pdf'}`, warranty ? 'text/html' : 'application/pdf'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const d = query.data;
  return <Page onRefresh={() => void query.refetch()} refreshing={query.isRefetching}><Title title={`سفارش #${id}`} back={() => router.back()} />
    <ErrorBox error={query.error || error} />{query.isLoading && <Loading />}
    {d && <><Card><Badge green={d.status === 'paid'}>{statusLabels[d.status] || d.status}</Badge><T style={styles.title}>{d.shippingAddress?.recipient || d.email}</T>
      <T>{d.email}</T><T style={styles.muted}>ثبت: {date(d.createdAt)}</T>{d.paidAt && <T>پرداخت: {date(d.paidAt)}</T>}
      {d.paymentReference && <T selectable>مرجع پرداخت: {d.paymentReference}</T>}
      {Object.entries(labels).map(([key, label]) => <T selectable key={key}>{label}: {d.shippingAddress?.[key] || 'ثبت نشده'}</T>)}
    </Card><Card><T style={styles.label}>اقلام ثبت‌شدهٔ سفارش</T>{d.lines.map((line, i) => <Card key={i}><T style={styles.label}>{line.name}</T>
      <T style={styles.muted}>{line.productId} · تعداد: {line.quantity}</T><T>فی: {rial(line.unitPriceRial)}</T><T>جمع قلم: {rial(line.totalRial)}</T></Card>)}
      <T>جمع اقلام: {rial(d.subtotalRial)}</T><T>ارسال: {rial(d.shippingRial)}</T><T style={styles.label}>مبلغ نهایی: {rial(d.totalRial)}</T>
      <Button busy={busy} onPress={() => void download(false)}>دانلود فاکتور PDF</Button><Button secondary disabled={busy} onPress={() => void download(true)}>دانلود کارت گارانتی</Button>
    </Card>{['draft', 'pending', 'pending_payment'].includes(d.status) && <Card>
      {can('orders:confirm_payment') && d.status !== 'draft' && <><Field label="شماره مرجع پرداخت دریافتی" value={reference} autoCapitalize="none" onChangeText={setReference} />
        <Button disabled={!reference.trim()} busy={busy} onPress={() => void act('confirm-payment')}>تأیید دستی پرداخت</Button></>}
      {can('orders:cancel') && <Button danger disabled={busy} onPress={() => void act('cancel')}>لغو سفارش</Button>}
    </Card>}</>}
  </Page>;
}
export default function OrderDetailPage() { return <Gate permission="orders:read"><OrderDetail /></Gate>; }
