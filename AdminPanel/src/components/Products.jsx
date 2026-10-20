import React, {useEffect,useState} from 'react';
import {motion} from 'motion/react';
import {Plus, Edit2, Archive, Package} from 'lucide-react';
import {write} from '../api';
import NewProductModal from './NewProductModal';
import Select from './Select';
import {CATALOG_CATEGORIES} from '../../../src/data/catalog';
import {Heading,Button,Panel,ErrorBox,Empty,Pager,useResource,LoadState,inputClass,money,number} from './ManagementUI';
export default function Products({can,search=''}) {
 const [query,setQuery]=useState(search),[page,setPage]=useState(1),[editing,setEditing]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [category,setCategory]=useState('');
 useEffect(()=>{setQuery(search);setPage(1);},[search]);
 const resource=useResource(`/admin/products?page=${page}&q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
 const archive=async p=>{if(!confirm(`محصول «${p.name}» از فروشگاه پنهان شود؟ سوابق سفارش حفظ می‌شوند.`))return;setBusy(true);setError('');try{await write(`/admin/products/${p.id}`,'DELETE');resource.reload();}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <div className="space-y-6 pb-12"><Heading title="محصولات و موجودی" subtitle="قیمت‌ها به ریال و مطابق فروشگاه هستند؛ با انتخاب دسته‌بندی، محصولات همان بخش را ببینید.">{can('products:write')&&<Button onClick={()=>setEditing({})}><Plus size={15} className="inline ml-2"/>محصول جدید</Button>}</Heading>
 <Panel className="grid sm:grid-cols-[1fr_260px] gap-3"><input aria-label="جستجوی محصولات" className={inputClass} placeholder="نام فارسی، مدل انگلیسی یا شناسه محصول…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><Select aria-label="فیلتر دسته‌بندی محصولات" className={inputClass} value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="">همهٔ دسته‌بندی‌ها</option>{Object.entries(CATALOG_CATEGORIES).map(([id,c])=><option key={id} value={id}>{c.title}</option>)}</Select></Panel>
 <ErrorBox message={error}/><LoadState {...resource}/>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{resource.data?.items.map(p=><motion.article key={p.id} data-category={p.category} layout whileHover={{y:-5}} className="glass-panel glass-card-hover rounded-3xl overflow-hidden flex flex-col group">
 <div className="relative h-48 w-full bg-white"><img loading="lazy" src={p.image} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"/><span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/80 text-white">{p.categoryFa || p.category}</span><span className={`absolute bottom-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-lg text-white ${p.isActive?'bg-emerald-600/90':'bg-slate-600/90'}`}>{p.isActive ? `موجودی: ${number(p.stock)}`:'بایگانی‌شده'}</span></div>
 <div className="p-5 flex-1 flex flex-col gap-3"><span className="text-[11px] text-slate-400" dir="ltr">{p.id}</span><h2 className="font-bold text-sm leading-relaxed">{p.name}</h2><div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs space-y-2"><strong>{p.brand || p.nameEn}</strong>{(p.specs||[]).slice(0,3).map((s,i)=><p className="text-slate-500 dark:text-slate-400" key={i}>{s}</p>)}</div><div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center"><strong className="text-purple-700 dark:text-pink-400 text-sm">{money(p.price)}</strong>{can('products:write')&&<div className="flex gap-1"><button title="ویرایش محصول" className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600" onClick={()=>setEditing(p)}><Edit2 size={15}/></button><button title="بایگانی محصول" disabled={busy||!p.isActive} className="p-2 rounded-xl text-rose-500 disabled:opacity-40" onClick={()=>archive(p)}><Archive size={15}/></button></div>}</div></div></motion.article>)}</div>
 {resource.data?.items.length===0&&<Empty/>}<Pager data={resource.data} page={page} setPage={setPage}/>
 {editing&&<NewProductModal editingProduct={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();}}/>}</div>;
}
