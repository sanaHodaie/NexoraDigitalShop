import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../src/state/session';
import { integer } from '../src/lib/product';
import { Gate } from '../src/ui/Gate';
import { Button, Card, ErrorBox, Field, Loading, Page, styles, T, Title } from '../src/ui';
type Config = { data: { enabled: boolean; useModel: boolean; greeting: string; maxRecommendations: number; dailyLimit: number }; version: number; configured: boolean; provider: string; model: string };
function Editor({ config }: { config: Config }) {
  const { api, can } = useSession();
  const [form, setForm] = useState(config.data), [version, setVersion] = useState(config.version);
  const [limit, setLimit] = useState(String(form.dailyLimit)), [count, setCount] = useState(String(form.maxRecommendations));
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [question, setQuestion] = useState('گوشی مناسب عکاسی'), [answer, setAnswer] = useState<{ text: string; mode: string; products: { id: string; name: string; priceRial: number; specs: string[] }[] } | null>(null), [saved, setSaved] = useState(false);
  return <><Card><T>{config.provider} · {config.model || 'مدل پیش‌فرض'} · {config.configured ? 'اتصال تنظیم شده' : 'بدون اتصال مدل'}</T>
    <View style={styles.row}><Switch disabled={!can('assistant:write')} accessibilityLabel="راهنمای خرید فعال باشد" value={form.enabled} onValueChange={enabled => setForm(v => ({ ...v, enabled }))} /><T>راهنمای خرید فعال باشد</T></View>
    <View style={styles.row}><Switch disabled={!can('assistant:write')} accessibilityLabel="استفاده از مدل" value={form.useModel} onValueChange={useModel => setForm(v => ({ ...v, useModel }))} /><T>استفاده از مدل برای درک پرسش</T></View>
    <Field label="پیام خوش‌آمد راهنما" editable={can('assistant:write')} value={form.greeting} maxLength={300} multiline onChangeText={greeting => setForm(v => ({ ...v, greeting }))} />
    <Field label="تعداد پیشنهادها؛ ۱ تا ۴" editable={can('assistant:write')} value={count} onChangeText={setCount} keyboardType="number-pad" />
    <Field label="سقف درخواست روزانه؛ ۱ تا ۱۰۰۰۰" editable={can('assistant:write')} value={limit} onChangeText={setLimit} keyboardType="number-pad" />
    {can('assistant:write') && <Button busy={busy} onPress={async () => { setBusy(true); setError(''); setSaved(false);
      try { const data = { ...form, dailyLimit: integer(limit, 10000), maxRecommendations: integer(count, 4) };
        const result = await api.request<Config>('/api/admin/assistant', { method: 'PUT', body: { data, version } }); setVersion(result.version); setSaved(true);
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>ذخیرهٔ تنظیمات راهنما</Button>}{saved && <T>تنظیمات ذخیره شد.</T>}
  </Card><Card><Field label="پرسش آزمایشی" value={question} onChangeText={setQuestion} maxLength={1000} multiline />
    <Button secondary busy={busy} onPress={async () => { setBusy(true); setError('');
      try { const result = await api.request<NonNullable<typeof answer>>('/api/admin/assistant/test', { method: 'POST', body: { messages: [{ role: 'user', content: question }] } }); setAnswer(result); }
      catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>آزمایش با محصولات واقعی</Button>{answer && <><T>{answer.text}</T><T>روش پاسخ: {answer.mode}</T>{answer.products.map(p => <Card key={p.id}><T>{p.name}</T><T>{p.priceRial.toLocaleString('fa-IR')} ریال</T><T>{p.specs.join(' · ')}</T></Card>)}</>}</Card><ErrorBox error={error} /></>;
}
function Assistant() {
  const { api } = useSession(); const query = useQuery({ queryKey: ['assistant-config'], queryFn: () => api.request<Config>('/api/admin/assistant') });
  return <Page><Title title="راهنمای هوشمند خرید" subtitle="کلید مدل فقط در تنظیمات امن سرور است و در اپ نمایش داده نمی‌شود." back={() => router.back()} />
    <ErrorBox error={query.error} />{query.isLoading && <Loading />}{query.data && <Editor config={query.data} />}</Page>;
}
export default function AssistantPage() { return <Gate permission="assistant:read"><Assistant /></Gate>; }
