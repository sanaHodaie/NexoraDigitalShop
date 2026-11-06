import React, { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { CustomerRequest } from '../api/types';
import { useSession } from '../state/session';
import { approvalSchema, totalRial, type ApprovalData, type ApprovalForm } from '../lib/approval';
import { rial } from '../lib/format';
import { Button, Card, ErrorBox, Field, styles, T } from './index';

export function Approval({ item, onSaved }: { item: CustomerRequest; onSaved: () => void }) {
  const { api } = useSession();
  const [review, setReview] = useState<ApprovalData | null>(null);
  const form = useForm<ApprovalForm, unknown, ApprovalData>({ resolver: zodResolver(approvalSchema), defaultValues: {
    lines: [{ name: item.details.items.slice(0, 300), quantity: String(item.details.quantity), unitPriceRial: '' }],
    shippingRial: '0', terms: '',
  } });
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const mutation = useMutation({ mutationFn: (data: ApprovalData) => api.request(`/api/admin/customer-requests/${item.id}/approve`, {
    method: 'POST', body: { version: item.version, ...data },
  }), onSuccess: onSaved });
  return <Card><T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 18 }}>صدور فاکتور توافقی</T>
    <T style={styles.muted}>اطلاعات مشتری خودکار درج می‌شود. شرح و تعداد هر قلم را بررسی کنید و قیمت واحد را به ریال وارد کنید. تأیید این فاکتور به معنی پرداخت نیست.</T>
    {review ? <><T style={styles.label}>بازبینی نهایی</T>
      {review.lines.map((line, index) => <T key={index}>{line.name} · {line.quantity} عدد · واحد {rial(line.unitPriceRial)}</T>)}
      <T>ارسال: {rial(review.shippingRial)}</T><T style={styles.label}>جمع کل: {rial(totalRial(review))}</T>
      {!!review.terms && <T>{review.terms}</T>}
      <T style={styles.muted}>با تأیید، کد رهگیری و فاکتور ثابت می‌شوند و ارسال به تلگرام در صف قرار می‌گیرد.</T>
      <ErrorBox error={mutation.error} />
      <Button busy={mutation.isPending} onPress={() => mutation.mutate(review)}>تأیید نهایی و ارسال به تلگرام</Button>
      <Button secondary disabled={mutation.isPending} onPress={() => { mutation.reset(); setReview(null); }}>بازگشت و ویرایش</Button>
    </> : <>
      {lines.fields.map((line, index) => <Card key={line.id} style={{ padding: 12 }}><T style={styles.label}>قلم {index + 1}</T>
        <Controller control={form.control} name={`lines.${index}.name`} render={({ field }) => <Field label="شرح قلم" value={field.value}
          maxLength={300} onChangeText={field.onChange} error={form.formState.errors.lines?.[index]?.name?.message} />} />
        <Controller control={form.control} name={`lines.${index}.quantity`} render={({ field }) => <Field label="تعداد" value={field.value}
          keyboardType="number-pad" onChangeText={field.onChange} error={form.formState.errors.lines?.[index]?.quantity?.message} />} />
        <Controller control={form.control} name={`lines.${index}.unitPriceRial`} render={({ field }) => <Field label="قیمت واحد (ریال)" value={field.value}
          keyboardType="number-pad" onChangeText={field.onChange} error={form.formState.errors.lines?.[index]?.unitPriceRial?.message} />} />
        {lines.fields.length > 1 && <Button secondary onPress={() => lines.remove(index)}>حذف قلم</Button>}
      </Card>)}
      <Button secondary disabled={lines.fields.length >= 50} onPress={() => lines.append({ name: '', quantity: '1', unitPriceRial: '' })}>افزودن قلم</Button>
      <Controller control={form.control} name="shippingRial" render={({ field }) => <Field label="هزینه ارسال (ریال)" keyboardType="number-pad"
        value={field.value} onChangeText={field.onChange} error={form.formState.errors.shippingRial?.message} />} />
      <Controller control={form.control} name="terms" render={({ field }) => <Field label="توضیحات فاکتور برای مشتری" multiline maxLength={1000}
        value={field.value} onChangeText={field.onChange} error={form.formState.errors.terms?.message} />} />
      <Button onPress={form.handleSubmit(data => setReview(data))}>بازبینی فاکتور پیش از تأیید</Button>
    </>}
  </Card>;
}
