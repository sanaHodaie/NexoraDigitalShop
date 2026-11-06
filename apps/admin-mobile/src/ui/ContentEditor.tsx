import { Switch, View } from 'react-native';
import { Button, Card, Field, T, styles } from './index';
type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
const labels: Record<string, string> = { title: 'عنوان', description: 'توضیحات', image: 'مسیر تصویر', imageAlt: 'توضیح تصویر', id: 'شناسه', slug: 'آدرس مقاله',
  name: 'نام', accent: 'بخش برجستهٔ عنوان', hero: 'بنر اصلی', collections: 'مجموعه‌ها', subtitle: 'زیرعنوان', link: 'پیوند',
  trendingIds: 'شناسه‌های ترند', recommendedIds: 'پیشنهادی‌ها', dealIds: 'پیشنهاد ویژه', metadata: 'اطلاعات مقاله', content: 'متن مقاله',
  published: 'انتشار', intro: 'مقدمه', takeaway: 'نکتهٔ کلیدی', sections: 'بخش‌ها', paragraphs: 'پاراگراف‌ها', sources: 'منابع',
  label: 'عنوان منبع', url: 'آدرس منبع', checklist: 'چک‌لیست', category: 'شناسهٔ دسته', tag: 'برچسب', tagColor: 'رنگ برچسب',
  readTime: 'زمان مطالعه', date: 'تاریخ نمایشی', storeName: 'نام فروشگاه', supportEmail: 'ایمیل پشتیبانی', supportPhone: 'تلفن پشتیبانی', caption: 'زیرنویس', contain: 'نمایش کامل تصویر' };
function blank(key: string, previous?: Json): Json {
  if (previous !== undefined) {
    const copy = JSON.parse(JSON.stringify(previous));
    if (copy && typeof copy === 'object' && !Array.isArray(copy) && typeof copy.id === 'string') copy.id = `item-${Date.now()}`;
    return copy;
  }
  if (key === 'sections') return { id: `section-${Date.now()}`, title: 'بخش جدید', paragraphs: ['متن'], sources: [], image: null, imageAlt: '', contain: false, caption: '' };
  if (key === 'sources') return { label: 'منبع', url: 'https://example.com' };
  if (key === 'collections') return { id: `collection-${Date.now()}`, title: 'مجموعه', subtitle: '', image: '/assets/products/product-pending.svg', link: '#smartphones' };
  return '';
}
export function ContentEditor({ value, onChange, readOnly, name = '' }: { value: Json; onChange: (value: Json) => void; readOnly: boolean; name?: string }) {
  const label = labels[name] || name;
  if (typeof value === 'boolean') return <View style={styles.row}><Switch accessibilityLabel={label} disabled={readOnly} value={value} onValueChange={onChange} /><T>{label}</T></View>;
  if (value === null || typeof value === 'string' || typeof value === 'number') return <Field label={label} editable={!readOnly}
    value={String(value ?? '')} multiline={typeof value !== 'number'} onChangeText={v => onChange(typeof value === 'number' ? Number(v) : value === null && !v ? null : v)} />;
  if (Array.isArray(value)) return <View style={{ gap: 12 }}><T style={styles.label}>{label}</T>{value.map((item, i) => <Card key={i}>
    <ContentEditor value={item} name={`${name} ${i + 1}`} readOnly={readOnly} onChange={next => onChange(value.map((old, n) => n === i ? next : old))} />
    {!readOnly && <Button secondary onPress={() => onChange(value.filter((_, n) => n !== i))}>حذف مورد {i + 1}</Button>}
  </Card>)}{!readOnly && <Button secondary onPress={() => onChange([...value, blank(name, value[0])])}>افزودن به {label}</Button>}</View>;
  return <View style={{ gap: 15 }}>{!!label && <T style={styles.label}>{label}</T>}{Object.entries(value).map(([key, item]) =>
    <ContentEditor key={key} name={key} value={item} readOnly={readOnly} onChange={next => onChange({ ...value, [key]: next })} />)}</View>;
}
export type { Json };
