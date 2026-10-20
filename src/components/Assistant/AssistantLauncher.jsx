import React, { lazy, Suspense, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const AssistantDialog = lazy(() => import('./AssistantDialog'));

export default function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="باز کردن راهنمای خرید" aria-haspopup="dialog"
      className="fixed bottom-5 left-4 z-40 flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-3 shadow-lg shadow-blue-950/20 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-300">
      <MessageCircle size={22}/><span className="text-xs font-bold hidden sm:inline">راهنمای خرید</span>
    </button>
    {open && <Suspense fallback={<div role="status" className="fixed bottom-20 left-4 z-50 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl">در حال باز کردن راهنما…</div>}>
      <AssistantDialog onClose={() => setOpen(false)}/>
    </Suspense>}
  </>;
}
