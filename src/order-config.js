// Approved shop prices and destinations. Amounts are per 500 ml bottle.
export const orderConfig = {
  currency: 'MUR',
  prices: { jasmine: 100, citrus: 100 },
  whatsapp: '+23058119569',
  email: 'guipinmru@gmail.com',
};

export function formatPrice(value){
  return orderConfig.currency==='MUR'
    ? `Rs ${new Intl.NumberFormat('en-MU',{maximumFractionDigits:2}).format(value)}`
    : new Intl.NumberFormat('en',{style:'currency',currency:orderConfig.currency}).format(value);
}
