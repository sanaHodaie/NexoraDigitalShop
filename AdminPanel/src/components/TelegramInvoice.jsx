import React from 'react';
import InvoiceSheet from '../../../src/components/Orders/InvoiceSheet';
import {Modal,LoadState,useResource} from './ManagementUI';

export function TelegramInvoiceContent({item,onRefresh}) {
 const saved=item.invoice;
 if(!saved)return <p className="text-sm text-slate-500">فاکتوری برای این درخواست صادر نشده است.</p>;
 const customer=saved.customer||item.details;
 const invoice={...saved,id:item.id,source:'telegram',status:'approved',trackingCode:item.trackingCode,
  createdAt:saved.approvedAt,email:customer.email||'',company:customer.company||'',
  shippingAddress:{recipient:customer.name,phone:customer.phone,city:customer.city,address:customer.address,postalCode:customer.postalCode,notes:customer.notes},
  lines:saved.lines,paidAt:null};
 return <><InvoiceSheet invoice={invoice} admin path={`/admin/customer-requests/${item.id}`} onRefresh={onRefresh}
   pdfUrl={`/api/admin/customer-requests/${item.id}/invoice`} htmlUrl={`/api/admin/customer-requests/${item.id}/invoice.html`}/>
  <p className="text-xs text-slate-500 mt-4">ارسال تلگرام: {{sent:'ارسال شده',pending:'در صف ارسال',failed:'ناموفق',none:'ثبت نشده'}[item.deliveryStatus]||'در صف ارسال'} · PDF همان فایل ذخیره‌شدهٔ ارسالی به مشتری است.</p></>;
}
export default function TelegramInvoice({id,onClose}) {
 const resource=useResource('/admin/customer-requests/'+id);
 return <Modal title={`فاکتور عمدهٔ تلگرام ${id}`} onClose={onClose}><LoadState {...resource}/>{resource.data&&<TelegramInvoiceContent item={resource.data} onRefresh={resource.reload}/>}</Modal>;
}
