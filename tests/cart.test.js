import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCart,changeQuantity,cartTotal} from '../src/cart.js';

test('stored carts reject unknown products and invalid quantities',()=>{
  assert.deepEqual(cleanCart({jasmine:-1,citrus:2,unknown:3}),{citrus:2});
  assert.deepEqual(cleanCart({jasmine:2.5,citrus:'3'}),{});
  assert.deepEqual(cleanCart(null),{});
  assert.deepEqual(cleanCart({jasmine:1000}),{jasmine:99});
});
test('adding and removing flavours preserves other quantities and the prior cart',()=>{
  const original={jasmine:2,citrus:1};
  assert.deepEqual(changeQuantity(original,'jasmine',1),{jasmine:3,citrus:1});
  assert.deepEqual(changeQuantity(original,'citrus',-1),{jasmine:2});
  assert.deepEqual(changeQuantity({jasmine:99},'jasmine',1),{jasmine:99});
  assert.deepEqual(original,{jasmine:2,citrus:1});
});
test('approved Rs 100 pricing totals every bottle and never treats missing prices as free',()=>{
  assert.equal(cartTotal({jasmine:2,citrus:3},{jasmine:100,citrus:100}),500);
  assert.equal(cartTotal({citrus:2},{jasmine:100,citrus:null}),null);
  assert.equal(cartTotal({},{jasmine:null,citrus:null}),0);
});
