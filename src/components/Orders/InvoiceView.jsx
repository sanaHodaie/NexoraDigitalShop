import React, { useCallback, useEffect, useState } from 'react';
import InvoiceSheet from './InvoiceSheet';
import { api } from '../../api/client';
import './invoice.css';

export {invoiceStatuses} from './InvoiceSheet';

export default function InvoiceView({ id, admin = false, onUpdate, version = 0 }) {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `${admin ? '/admin' : '/account'}/orders/${id}`;
  const load = useCallback(async signal => {
    setBusy(true);
    try {
      let data = await api(path, { signal, cache:'no-store' });
      if (!admin && data.status === 'draft') data = await api(`${path}/refresh-draft`, {method:'POST', signal});
      if (!signal?.aborted) { setInvoice(data); setError(''); onUpdate?.(data); }
    } catch (e) { if (!signal?.aborted) {setInvoice(null);setError(e.message);onUpdate?.(null);} }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [path, onUpdate, admin]);
  useEffect(() => {
    const controller = new AbortController();
    setInvoice(null);
    load(controller.signal);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(controller.signal); }, 30000);
    const refresh = () => {if(!document.hidden)load(controller.signal);};
    window.addEventListener('focus',refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus',refresh); };
  }, [load, version]);
  if (!invoice) return <section className="invoice-sheet invoice-loading" role="status">{error || 'در حال دریافت فاکتور…'}{error && <button onClick={() => load()}>تلاش مجدد</button>}</section>;
  return <InvoiceSheet invoice={invoice} path={path} admin={admin} busy={busy} error={error} onRefresh={()=>load()}/>;
}
