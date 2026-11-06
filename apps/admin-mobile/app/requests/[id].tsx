import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerRequest, RequestStatus } from '../../src/api/types';
import { useSession } from '../../src/state/session';
import { date, deliveryLabels, rial, statusLabels } from '../../src/lib/format';
import { shareInvoice } from '../../src/api/invoice';
import { Gate } from '../../src/ui/Gate';
import { Approval } from '../../src/ui/Approval';
import { Badge, Button, Card, Chips, ErrorBox, Field, Loading, Page, styles, T, Title, Updated } from '../../src/ui';

function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = /^\d+$/.test(id || '');
  const { api, can, token, baseUrl } = useSession();
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['request', id], enabled: valid, refetchOnWindowFocus: false,
    queryFn: ({ signal }) => api.request<CustomerRequest>(`/api/admin/customer-requests/${id}`, { signal }) });
  const [status, setStatus] = useState<RequestStatus>('new');
  const [note, setNote] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [sharing, setSharing] = useState(false);
  const item = query.data;
  useEffect(() => { if (item) { setStatus(item.status); setNote(item.staffNote); } }, [item]);
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['request', id] });
    void cache.invalidateQueries({ queryKey: ['requests'] });
    void cache.invalidateQueries({ queryKey: ['request-stats'] });
  };
  const save = useMutation({ mutationFn: () => api.request(`/api/admin/customer-requests/${id}`, {
    method: 'PATCH', body: { status, staffNote: note, version: item!.version },
  }), onSuccess: refresh });
  const retry = useMutation({ mutationFn: () => api.request(`/api/admin/customer-requests/${id}/retry-delivery`, { method: 'POST' }), onSuccess: refresh });
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <Title title={`درخواست #${id}`} subtitle="جزئیات مشتری و روند رسیدگی" back={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/requests')} />
    {!valid && <ErrorBox error="شناسهٔ درخواست معتبر نیست." />}
    <ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}
    {item && !query.error && <><Card><Badge green={item.status === 'approved'}>{statusLabels[item.status]}</Badge>
      <T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 21 }}>{item.details.name}</T>
      <T>{item.kind === 'wholesale' ? 'خرید عمده' : 'پشتیبانی'} · {date(item.createdAt)}</T>
      {Object.entries({ phone: 'شماره تماس', company: 'شرکت', items: 'اقلام / موضوع', quantity: 'تعداد کل', city: 'شهر', address: 'نشانی', notes: 'توضیحات مشتری' }).map(([key, label]) =>
        <React.Fragment key={key}><T style={styles.muted}>{label}</T><T selectable>{String(item.details[key as keyof typeof item.details] || 'ثبت نشده')}</T></React.Fragment>)}
      <T style={styles.muted}>شناسهٔ تلگرام: {item.telegramUserId}{item.telegramUsername ? ` · @${item.telegramUsername}` : ''}</T>
    </Card>
    {item.hasInvoice ? <Card><T style={styles.label}>فاکتور تأییدشده</T><T selectable>کد رهگیری: {item.trackingCode}</T>
      <T>ارسال تلگرام: {deliveryLabels[item.deliveryStatus || 'pending']}</T>
      {item.invoice && <T>مبلغ توافقی: {rial(item.invoice.totalRial)}</T>}
      <T style={styles.muted}>این همان فایل ذخیره‌شده‌ای است که برای مشتری ارسال می‌شود.</T>
      <ErrorBox error={pdfError || retry.error} />
      <Button busy={sharing} onPress={async () => { if (!token) return; setSharing(true); setPdfError('');
        try { await shareInvoice(baseUrl, token, item.id); }
        catch (e) { setPdfError(e instanceof Error ? e.message : 'دریافت فایل موفق نبود.'); }
        finally { setSharing(false); }
      }}>دریافت / اشتراک‌گذاری فاکتور PDF</Button>
      {can('orders:confirm_payment') && item.deliveryStatus === 'failed' && <Button secondary busy={retry.isPending} onPress={() => retry.mutate()}>تلاش مجدد ارسال تلگرام</Button>}
    </Card> : <>
      {can('orders:cancel') && <Card><T style={styles.label}>رسیدگی تیم</T>
        <Chips value={status} disabled={save.isPending} options={(['new', 'reviewing', 'contacted', 'quoted', 'closed', 'cancelled'] as RequestStatus[]).map(value => ({ value, label: statusLabels[value] }))} onChange={setStatus} />
        <Field label="یادداشت داخلی؛ برای مشتری نمایش داده نمی‌شود" multiline maxLength={2000} value={note} onChangeText={setNote} />
        <ErrorBox error={save.error} retry={() => void query.refetch()} /><Button busy={save.isPending} onPress={() => save.mutate()}>ذخیرهٔ رسیدگی</Button>
        {save.isSuccess && <T accessibilityRole="alert">تغییرات ذخیره شد.</T>}
      </Card>}
      {can('orders:confirm_payment') && item.kind === 'wholesale' && !['closed', 'cancelled'].includes(item.status)
        && <Approval key={`${item.id}:${item.version}`} item={item} onSaved={refresh} />}
    </>}
    <Updated at={query.dataUpdatedAt} /><Button secondary onPress={() => void query.refetch()}>تازه‌سازی جزئیات</Button></>}
  </Page>;
}
export default function RequestDetail() { return <Gate permission="orders:read"><Detail /></Gate>; }
