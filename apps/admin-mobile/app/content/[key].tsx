import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../src/state/session';
import { Gate } from '../../src/ui/Gate';
import { ContentEditor, Json } from '../../src/ui/ContentEditor';
import { Select } from '../../src/ui/Select';
import { confirmAction } from '../../src/ui/confirm';
import { Button, Card, ErrorBox, Loading, Page, T, Title } from '../../src/ui';
type Document = { data: { [key: string]: Json }; version: number };
const titles: Record<string, string> = { home: 'محتوای صفحهٔ اصلی', articles: 'مجله و مقاله‌ها', settings: 'تنظیمات فروشگاه', categories: 'دسته‌بندی‌های فروشگاه' };
function Editor({ document, name }: { document: Document; name: string }) {
  const { api, can } = useSession(); const cache = useQueryClient();
  const [draft, setDraft] = useState(document.data), [version, setVersion] = useState(document.version), [selected, setSelected] = useState('0');
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const change = (data: { [key: string]: Json }) => { setDraft(data); setDirty(true); setSaved(false); };
  const items = Array.isArray(draft.items) ? draft.items : null;
  const index = Number(selected);
  return <Page><Title title={titles[name]} subtitle={dirty ? 'تغییرات ذخیره‌نشده دارید.' : 'تغییرات پس از ذخیره در سایت نمایش داده می‌شوند.'} back={async () => { if (!dirty || await confirmAction('تغییرات ذخیره‌نشده کنار گذاشته شوند؟')) router.back(); }} />
    <ErrorBox error={error} />{saved && <T accessibilityRole="alert">محتوا با موفقیت ذخیره شد.</T>}
    {items && <Card><Select disabled={busy} label="انتخاب محتوا" value={selected} options={items.map((item: any, i) => ({ value: String(i), label: item.title || item.metadata?.title || item.id || String(i + 1) }))} onChange={setSelected} />
      {name === 'articles' && can('content:write') && <Button secondary disabled={busy} onPress={() => {
        const id = `article-${Date.now()}`;
        const article = { published: false, metadata: { id, slug: id, tag: 'راهنما', tagColor: 'bg-blue-600', title: 'مقالهٔ جدید', excerpt: '', readTime: '۴ دقیقه', image: '/assets/products/product-pending.svg', imageAlt: '', date: '', published: new Date().toISOString().slice(0, 10), category: 'more' },
          content: { intro: '', takeaway: '', sections: [{ id: 'section-1', title: 'بخش اول', paragraphs: ['متن'], sources: [] }], checklist: [] } };
        change({ ...draft, items: [...items, article] }); setSelected(String(items.length));
      }}>مقالهٔ جدید</Button>}
    </Card>}
    <Card>{items ? items[index] !== undefined && <ContentEditor value={items[index]} readOnly={busy || !can('content:write')} onChange={next => change({ ...draft, items: items.map((old, i) => i === index ? next : old) })} />
      : <ContentEditor value={draft} readOnly={busy || !can('content:write')} onChange={next => change(next as Document['data'])} />}</Card>
    {can('content:write') && <Button disabled={!dirty} busy={busy} onPress={async () => { setBusy(true); setError('');
      try { const result = await api.request<Document>(`/api/admin/content/${name}`, { method: 'PUT', body: { version, data: draft } });
        setDraft(result.data); setVersion(result.version); setDirty(false); setSaved(true); void cache.invalidateQueries({ queryKey: ['content'] });
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>ذخیرهٔ تغییرات محتوا</Button>}
  </Page>;
}
function ContentPage() {
  const { key } = useLocalSearchParams<{ key: string }>(); const { api } = useSession();
  const query = useQuery({ queryKey: ['content'], refetchOnWindowFocus: false, queryFn: () => api.request<Record<string, Document>>('/api/admin/content') });
  if (!titles[key]) return <Page><ErrorBox error="این بخش محتوا وجود ندارد." /></Page>;
  if (query.data?.[key]) return <Editor key={key} name={key} document={query.data[key]} />;
  return <Page><Title title={titles[key]} back={() => router.back()} /><ErrorBox error={query.error} retry={() => void query.refetch()} />{query.isLoading && <Loading />}</Page>;
}
export default function Content() { return <Gate permission="content:read"><ContentPage /></Gate>; }
