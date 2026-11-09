import React from 'react';
import Select from './Select';
import {Heading,Panel,Button,inputClass} from './ManagementUI';
export default function Account({user,themeMode,onSetThemeMode,onLogout}) {
 return <div className="space-y-6"><Heading title="حساب مدیریت" subtitle="حساب فعلی و تنظیمات نمایش پنل"/><Panel className="space-y-5"><p className="font-bold">{user.name||user.email}</p><p dir="ltr" className="break-all text-right">{user.email}</p><label className="block space-y-2"><span className="text-xs">حالت نمایش</span><Select aria-label="حالت نمایش حساب" className={`${inputClass} max-w-sm`} value={themeMode} onChange={e=>onSetThemeMode(e.target.value)}><option value="light">روشن</option><option value="dark">تیره</option><option value="auto">هماهنگ با دستگاه</option></Select></label><Button onClick={onLogout}>خروج از حساب</Button></Panel></div>;
}
