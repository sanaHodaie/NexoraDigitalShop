import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvalData,totalRial} from '../AdminPanel/src/approval.js';
const form=(quantity='۱۰',unitPriceRial='۲۵۰۰۰۰۰۰',shippingRial='۰')=>({lines:[{name:'گوشی',quantity,unitPriceRial}],shippingRial,terms:''});
test('Persian and Arabic invoice numbers normalize to exact bounded integers',()=>{
 const data=approvalData(form('١٠'));assert.equal(data.lines[0].quantity,10);assert.equal(totalRial(data),250000000n);
});
test('large wholesale totals remain exact above JavaScript safe integer totals',()=>{
 assert.equal(totalRial(approvalData(form('1000000','999999999999','1'))),999999999999000001n);
});
test('invalid or out-of-range invoice amounts cannot reach approval',()=>{
 for(const value of ['-1','1.5','1e4','Infinity','1000000000001',''])assert.throws(()=>approvalData(form('1',value)));
 assert.throws(()=>approvalData(form('0')));assert.throws(()=>approvalData(form('1000001')));
});
