const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../public/js/same-study.js');

test('header edits preserve fixed SAME fields, delimiters, and eight-character sender', () => {
  assert.equal(model.header({event:'DMO',area:'026163',duration:'0100'}), 'ZCZC-EAS-DMO-026163+0100-3021800-SIGLAB  -');
  const safe = model.header({event:'<script>',area:'../../',duration:'9999'});
  assert.equal(safe, 'ZCZC-EAS-RWT-006037+0015-3021800-SIGLAB  -');
});

test('ASCII bits use wire order and can reconstruct every offered character', () => {
  assert.deepEqual(model.bits('Z'), [0,1,0,1,1,0,1,0]);
  for (const char of ['Z','C','-','+','0',' ']) {
    const bits = model.bits(char);
    assert.equal(bits.length,8);
    assert.equal(bits.reduce((sum,bit,i)=>sum+(bit<<i),0),char.charCodeAt(0));
    assert.equal(bits[7],0);
  }
  assert.deepEqual(model.bits(''),[]);
  assert.deepEqual(model.bits('中'),[]);
});

test('all 27 burst selections distinguish missing copies, conflicts, and matching alternate headers', () => {
  const choices=['matching','missing','different'];
  for (const a of choices) for (const b of choices) for (const c of choices) {
    const values=[a,b,c],received=values.filter(v=>v!=='missing');
    const result=model.compare(values);
    assert.equal(result.count,received.length);
    assert.equal(result.state,new Set(received).size>1?'conflict':received.length===3?'matched':'incomplete');
  }
});


test('header tokens keep delimiters intact and identify the selected fields', () => {
  for (const event of ['RWT','DMO']) for (const area of ['006037','026163','048453']) for (const duration of ['0015','0030','0100']) {
    const values={event,area,duration}, parts=model.parts(values);
    assert.equal(parts.map(part=>part[1]).join(''),model.header(values));
    for (const key of ['event','area','duration']) assert.equal(parts.find(part=>part[0]===key)[1],values[key]);
  }
});

test('optional reading challenge accepts only all three correct header fields', () => {
  assert.deepEqual(model.checkChallenge({area:'026163',duration:'0030',event:'DMO'}),[true,true,true]);
  assert.deepEqual(model.checkChallenge({}),[false,false,false]);
  assert.deepEqual(model.checkChallenge({area:'006037',duration:'0030',event:'RWT'}),[false,true,false]);
});
