export const CART_KEY='guipin.cart.v1';
export const MAX_QUANTITY=99;
export function cleanCart(value){
  const cart={};
  for(const id of ['jasmine','citrus']){
    const count=value?.[id];
    if(Number.isInteger(count)&&count>0)cart[id]=Math.min(MAX_QUANTITY,count);
  }
  return cart;
}
export function readCart(){try{return cleanCart(JSON.parse(localStorage.getItem(CART_KEY)||'{}'));}catch{return {};}}
export function changeQuantity(cart,id,delta){
  if(!['jasmine','citrus'].includes(id)||!Number.isInteger(delta))return cart;
  const next={...cart},quantity=Math.max(0,Math.min(MAX_QUANTITY,(next[id]||0)+delta));
  if(quantity)next[id]=quantity;else delete next[id];
  return next;
}
export function cartTotal(cart,prices){
  const entries=Object.entries(cleanCart(cart));
  if(!entries.length)return 0;
  if(entries.some(([id])=>typeof prices[id]!=='number'||!Number.isFinite(prices[id])||prices[id]<0))return null;
  return Math.round(entries.reduce((total,[id,count])=>total+prices[id]*count,0)*100)/100;
}
