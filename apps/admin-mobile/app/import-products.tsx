import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useSession } from '../src/state/session';
import { downloadFile } from '../src/api/invoice';
import { XLSX, fileBytes } from '../src/api/files';
import { Gate } from '../src/ui/Gate';
import { Button, Card, ErrorBox, Page, T, Title } from '../src/ui';
type Preview = { items: { id: string; name: string; row: number }[]; errors: { row: number; message: string; field: string }[]; canImport: boolean; created: number };
function Importer() {
  const { api, baseUrl, token } = useSession(); const cache = useQueryClient();
  const [raw, setRaw] = useState<ArrayBuffer | null>(null), [name, setName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const send = async (commit: boolean, bytes = raw) => { if (!bytes) return; setBusy(true); setError('');
    try { const result = await api.request<Preview>('/api/admin/products/import?commit=' + commit, { method: 'POST', raw: bytes, contentType: XLSX });
      setPreview(result); if (commit) { setRaw(null); void cache.invalidateQueries({ queryKey: ['products'] }); void cache.invalidateQueries({ queryKey: ['product-filters'] }); }
    } catch (e) { setError((e as Error).message); setPreview(null); } finally { setBusy(false); }
  };
  return <Page><Title title="ورود محصولات از اکسل" subtitle="فایل XLSX تا ۲ مگابایت؛ ابتدا بررسی و سپس تأیید ثبت." back={() => router.back()} />
    <Card><Button secondary disabled={busy} onPress={async () => { if (!token) return; try { await downloadFile(baseUrl, token, '/api/admin/products/import/template', 'Nexora-products.xlsx', XLSX); } catch (e) { setError((e as Error).message); } }}>دانلود قالب اکسل</Button>
      <Button busy={busy} onPress={async () => { const result = await DocumentPicker.getDocumentAsync({ type: XLSX, copyToCacheDirectory: true }); if (result.canceled) return;
        setError(''); setPreview(null); setRaw(null);
        try { const file = result.assets[0]; if ((file.size || 0) > 2 * 1024 * 1024) throw new Error('حداکثر حجم فایل ۲ مگابایت است.');
          const bytes = await fileBytes(file.uri, file.file); if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('حداکثر حجم فایل ۲ مگابایت است.');
          setRaw(bytes); setName(file.name); await send(false, bytes);
        } catch (e) { setError((e as Error).message); }
      }}>انتخاب فایل و پیش‌نمایش</Button><T>{name}</T></Card><ErrorBox error={error} />
    {preview && <Card><T>پیش‌نمایش: {preview.items.length} ردیف · خطا: {preview.errors.length}</T>
      {preview.errors.map((e, i) => <T key={i}>ردیف {e.row} · {e.field}: {e.message}</T>)}
      {preview.items.slice(0, 30).map((p, i) => <T key={i}>{p.row} · {p.name} · {p.id}</T>)}
      {preview.items.length > 30 && <T>۳۰ ردیف اول نمایش داده شده؛ تأیید برای همهٔ ردیف‌های معتبر فایل است.</T>}
      {!!preview.created && <T accessibilityRole="alert">{preview.created} محصول ثبت شد.</T>}
      {preview.canImport && raw && !preview.created && <Button busy={busy} onPress={() => void send(true)}>تأیید نهایی و ثبت محصولات</Button>}
    </Card>}
  </Page>;
}
export default function ImportProducts() { return <Gate permission="products:write"><Importer /></Gate>; }
