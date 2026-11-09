export function digits(value) {return String(value).replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c>='۰'&&c<='۹'?1776:1632)));}
function integer(value,min,max) {
 const text=digits(String(value).trim());if(!/^\d+$/.test(text))throw new Error('فقط عدد صحیح وارد کنید.');
 const number=Number(text);if(!Number.isSafeInteger(number)||number<min||number>max)throw new Error('عدد خارج از محدودهٔ مجاز است.');return number;
}
export function approvalData(input) {
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>50)throw new Error('بین ۱ تا ۵۰ قلم وارد کنید.');
 const lines=input.lines.map(line=>{const name=String(line.name).trim();if(!name||name.length>300)throw new Error('شرح قلم معتبر وارد کنید.');return {name,quantity:integer(line.quantity,1,1000000),unitPriceRial:integer(line.unitPriceRial,1,1000000000000)};});
 const terms=String(input.terms||'');if(terms.length>1000)throw new Error('توضیحات حداکثر ۱۰۰۰ کاراکتر است.');
 return {lines,shippingRial:integer(input.shippingRial,0,1000000000000),terms};
}
export const totalRial=data=>data.lines.reduce((sum,line)=>sum+BigInt(line.quantity)*BigInt(line.unitPriceRial),BigInt(data.shippingRial));
