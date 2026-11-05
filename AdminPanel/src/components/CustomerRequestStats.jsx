import React from 'react';
import {AnimatedAreaChart} from './AnimatedChart';
import {Panel,Button,ErrorBox,useResource,number} from './ManagementUI';
export default function CustomerRequestStats({onNavigate}) {
 const resource=useResource('/admin/customer-request-stats'),data=resource.data;
 return <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">درخواست‌های واقعی تلگرام و عمده</h2><p className="text-xs text-slate-500 mt-2">روند تعداد درخواست‌های ثبت‌شده در ۳۰ روز اخیر</p></div><Button secondary disabled={resource.loading} onClick={resource.reload}>تازه‌سازی آمار تلگرام</Button><Button secondary onClick={()=>onNavigate('customer-requests')}>رسیدگی به درخواست‌ها</Button></div><ErrorBox message={resource.error}/>{resource.loading?<p role="status">در حال دریافت آمار…</p>:data&&<><div className="flex flex-wrap gap-5 my-5 text-sm"><span>کل: <b>{number(data.total)}</b></span><span>جدید: <b>{number(data.statuses.new||0)}</b></span><span>تأییدشده: <b>{number(data.statuses.approved||0)}</b></span></div><AnimatedAreaChart data={data.daily} dataKey="requests" xKey="day" unit="درخواست" title="درخواست‌های ثبت‌شدهٔ تلگرام"/><details className="text-xs mt-3"><summary>مشاهدهٔ داده‌های نمودار</summary>{data.daily.map(row=><p key={row.day}>{row.day}: {number(row.requests)}</p>)}</details></>}</Panel>;
}
