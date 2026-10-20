import React, {useEffect, useState} from 'react';
import Layout from './components/Layout';
import LoginModal from './components/LoginModal';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Orders from './components/Orders';
import Customers from './components/Customers';
import AuditLog from './components/AuditLog';
import ContentManager from './components/ContentManager';
import Subscribers from './components/Subscribers';
import AssistantSettings from './components/AssistantSettings';
import {ErrorBox, Button} from './components/ManagementUI';
import {api, write, resetCsrf} from './api';

export default function App() {
  const [activePage,setActivePage] = useState(location.hash.slice(1) || 'dashboard');
  const [user,setUser] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [search,setSearch] = useState('');
  const [themeMode,setThemeMode] = useState<'light'|'dark'|'auto'>(()=>{
    const saved=localStorage.getItem('nexora_admin_theme');return ['light','dark','auto'].includes(saved || "") ? saved as any : 'auto';
  });
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>{document.documentElement.classList.toggle('dark',themeMode==='dark'||(themeMode==='auto'&&media.matches));document.body.classList.toggle('dark',document.documentElement.classList.contains('dark'));};
    apply();localStorage.setItem('nexora_admin_theme',themeMode);media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
  },[themeMode]);
  useEffect(()=>{
    const controller=new AbortController();
    api('/admin/me',{signal:controller.signal}).then(setUser).catch(e=>{if(e.name!=='AbortError'&&e.status!==401)setError(e.message);}).finally(()=>setLoading(false));
    const expired=()=>{setUser(null);resetCsrf();};
    const hash=()=>setActivePage(location.hash.slice(1)||'dashboard');
    window.addEventListener('nexora:admin-expired',expired);window.addEventListener('hashchange',hash);
    return()=>{controller.abort();window.removeEventListener('nexora:admin-expired',expired);window.removeEventListener('hashchange',hash);};
  },[]);
  const navigate=(page:string)=>{setActivePage(page);location.hash=page;};
  const can=(permission:string)=>Boolean(user?.permissions.includes(permission));
  const pagePermission = ({assistant:'assistant:read',dashboard:'dashboard:read',products:'products:read',orders:'orders:read',customers:'users:read',logs:'audit:read',messages:'subscribers:read',analytics:'dashboard:read',gold_rates:'content:read',content:'content:read',articles:'content:read',settings:'content:read'})[activePage];
  const logout=async()=>{try{await write('/auth/logout','POST');resetCsrf();setUser(null);setError('');}catch(e){setError(e instanceof Error ? e.message : "خطای ارتباط با سرور");}};
  const toggle=()=>setThemeMode(m=>m==='light'?'dark':m==='dark'?'auto':'light');
  if(loading)return <main className="min-h-screen grid place-items-center" role="status">در حال بررسی دسترسی مدیریت…</main>;
  if(!user)return <LoginModal isOpen initialError={error} onLoginSuccess={u=>{setUser(u);setError('');}} themeMode={themeMode} onToggleTheme={toggle}/>;
  return <Layout activePage={activePage} onNavigate={navigate} themeMode={themeMode} onToggleTheme={toggle}
    currentUser={{...user,username:user.email}} onLogout={logout} onOpenLogin={logout} can={can}
    onSearch={(value:string)=>{setSearch(value);navigate('products');}}>
    <ErrorBox message={error}/>
    {pagePermission && !can(pagePermission) && <ErrorBox message="دسترسی به این بخش برای حساب شما فعال نیست؛ از منو بخش مجاز را انتخاب کنید."/>}
    {activePage==='dashboard' && can('dashboard:read') && <Dashboard onNavigate={navigate}/>}
    {activePage==='products' && can('products:read') && <Products can={can} search={search}/>}
    {activePage==='orders' && can('orders:read') && <Orders can={can}/>}
    {activePage==='customers' && can('users:read') && <Customers can={can}/>}
    {activePage==='logs' && can('audit:read') && <AuditLog/>}
    {activePage==='messages' && can('subscribers:read') && <Subscribers/>}
    {activePage==='assistant' && can('assistant:read') && <AssistantSettings can={can}/>}
    {['content','articles','settings'].includes(activePage) && can('content:read') && <ContentManager key={activePage} documentKey={({gold_rates:'categories',content:'home',articles:'articles',settings:'settings'})[activePage]} canEdit={can('content:write')} themeMode={themeMode} onSetThemeMode={setThemeMode}/>}
    {!['assistant','dashboard','products','orders','customers','logs','messages','content','articles','settings'].includes(activePage) && <Button onClick={()=>navigate('dashboard')}>بازگشت به داشبورد</Button>}
  </Layout>;
}
