import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {responsiveImage,optimizedImage} from '../src/data/imageAssets.js';
import {responsiveImages} from '../src/data/responsive-images.js';

test('all bundled responsive sources resolve to real, bounded content-addressed files',async()=>{
 for(const [source,variants] of Object.entries(responsiveImages)){
  const original=await stat(new URL('../public'+source,import.meta.url));
  assert.ok(variants.length>=1&&variants.length<=3);
  assert.ok(variants.every(([w])=>w>0&&w<=960));
  assert.ok(variants.every(([w],i)=>i===0||w>variants[i-1][0]));
  for(const [,path] of variants){
   assert.match(path,/^\/assets\/store-images\/[a-f0-9]{24}\.webp$/);
   assert.ok((await stat(new URL('../public'+path,import.meta.url))).size>0);
  }
  const small=await stat(new URL('../public'+variants[0][1],import.meta.url));
  assert.ok(small.size<=original.size*1.1,'Small image should not significantly exceed original: '+source);
 }
});

test('card variants preserve full detail sources and never rewrite unknown merchant URLs',()=>{
 const source='/assets/products/audio-01.webp',props=responsiveImage(source,'180px');
 assert.equal(props.sizes,'180px');assert.ok(props.srcSet.includes('320w'));
 assert.deepEqual(responsiveImage(source,'550px',true),{src:source});
 for(const custom of ['https://shop.example/item.webp','/uploads/mine.png','/assets/products/audio-01.webp?v=custom','constructor','__proto__']){
  assert.deepEqual(responsiveImage(custom),{src:custom});
 }
 assert.equal(optimizedImage('/assets/collection_audio_headphones_1790528002919.jpg'),'/assets/collection_audio_headphones_1790528002919.webp');
});

test('only the validated uploaded-media path receives backend thumbnail parameters',()=>{
 const path='/api/media/'+'a'.repeat(64)+'.webp';
 assert.equal(responsiveImage(path,'96px').src,path+'?width=640');
 assert.ok(responsiveImage(path).srcSet.includes('?width=320 320w'));
 assert.deepEqual(responsiveImage(path,'550px',true),{src:path});
 assert.deepEqual(responsiveImage(path+'?download=1'),{src:path+'?download=1'});
});

test('storefront fonts are local WOFF2, preloaded and no longer require a remote stylesheet',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
 assert.match(html,/rel="preload"[^>]+Vazirmatn-Regular\.woff2/);
 for(const weight of ['Regular','Bold']){
  const data=await readFile(new URL(`../public/assets/fonts/Vazirmatn-${weight}.woff2`,import.meta.url));
  assert.equal(data.subarray(0,4).toString(),'wOF2');
  const original=await stat(new URL(`../public/assets/admin/Vazirmatn-${weight}.ttf`,import.meta.url));
  assert.ok(data.length<original.size*.6);
 }
});
