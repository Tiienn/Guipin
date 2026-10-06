import React,{useEffect,useRef,useState} from 'react';
import {ShoppingBag,Plus,Minus,X,ArrowRight,ArrowLeft,Check,Trash2,Copy,Send,Leaf} from 'lucide-react';
import {flavours} from './flavours.js';
import {orderConfig,formatPrice} from './order-config.js';
import {cartTotal,MAX_QUANTITY} from './cart.js';
import './order.css';

export default function OrderDrawer({open,onClose,cart,onQuantity,onRemove,selected}){
  const dialog=useRef(null),heading=useRef(null);
  const [step,setStep]=useState('cart'),[customer,setCustomer]=useState({name:'',contact:'',note:''}),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
  const count=Object.values(cart).reduce((sum,n)=>sum+n,0),total=cartTotal(cart,orderConfig.prices);
  const money=formatPrice;
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement,overflow=document.body.style.overflow;
    setStep('cart');setCopied(false);setCopyError(false);dialog.current.showModal();document.body.style.overflow='hidden';
    return()=>{dialog.current?.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true});};
  },[open]);
  useEffect(()=>{if(open)heading.current?.focus({preventScroll:true});},[step,open]);
  const title={cart:count?'Your little pick-me-up.':'Your next good sip.',details:'A few details.',review:'One last look.',ready:'Your order is ready.'}[step];
  const orderText=()=>[
    'GUIPIN — Order request',
    ...Object.entries(cart).map(([id,n])=>`${n} × ${flavours[id].short} · 500 ml`),
    total===null?'Price and availability to be confirmed.':`Product subtotal: ${money(total)}`,
    'Delivery and availability to be confirmed.',
    `Name: ${customer.name.trim()}`,`Contact: ${customer.contact.trim()}`,
    customer.note.trim()?`Note: ${customer.note.trim()}`:'',
  ].filter(Boolean).join('\n');
  const sendUrl=orderConfig.whatsapp?`https://wa.me/${orderConfig.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(orderText())}`:orderConfig.email?`mailto:${orderConfig.email}?subject=${encodeURIComponent('Guipin order request')}&body=${encodeURIComponent(orderText())}`:null;
  const emailUrl=`mailto:${orderConfig.email}?subject=${encodeURIComponent('Guipin order request')}&body=${encodeURIComponent(orderText())}`;
  async function copyOrder(){try{await navigator.clipboard.writeText(orderText());setCopied(true);setCopyError(false);}catch{setCopyError(true);}}
  function nextDetails(e){e.preventDefault();if(!customer.name.trim()||!customer.contact.trim())return;setStep('review');}
  const summary=()=> <div className="order-summary">{Object.entries(cart).map(([id,n])=><div key={id}><span>{n} × {flavours[id].short}<small>500 ml bottle</small></span><strong>{orderConfig.prices[id]===null?'Price to confirm':money(orderConfig.prices[id]*n)}</strong></div>)}<div className="summary-total"><span>{count} {count===1?'bottle':'bottles'}</span><strong>{total===null?'Price to be confirmed':money(total)}</strong></div></div>;
  return <dialog ref={dialog} className="order-drawer" aria-labelledby="order-heading" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
    <div className="order-shell">
      <header className="order-header"><span className="order-brand">guipin<span>✳</span></span><button className="order-close" onClick={onClose} aria-label="Close cart"><X size={21}/></button></header>
      <div className="order-body">
        <div className="order-kicker"><Leaf size={14}/> A little sip. A lighter you.</div>
        {step!=='cart'&&step!=='ready'&&<div className="checkout-steps" aria-label="Order progress"><span>1 · Cart</span><span className={step==='details'?'current':''}>2 · Details</span><span className={step==='review'?'current':''}>3 · Confirm</span></div>}
        {step==='ready'&&<div className="order-check"><Check size={30}/></div>}
        <h2 id="order-heading" ref={heading} tabIndex={-1}>{title}</h2>
        {step==='cart'&&<>
          <p className="order-intro">{count?'Your favourite flavours, ready for your everyday.':'Start with your favourite flavour. Or make room for both.'}</p>
          {count>0?<div className="cart-items">{Object.entries(cart).map(([id,n])=><article className="cart-item" key={id}>
            <img src={flavours[id].image} alt={`${flavours[id].short} tea bottle`} width="88" height="105"/>
            <div className="cart-item-info"><h3>{flavours[id].short}</h3><p>Monk fruit tea · 500 ml</p><span className="cart-item-price">{orderConfig.prices[id]===null?'Price to be confirmed':`${money(orderConfig.prices[id])} / bottle`}</span>
              <div className="cart-item-actions"><div className="cart-quantity"><button disabled={n===1} onClick={()=>onQuantity(id,-1)} aria-label={`Decrease ${flavours[id].short} quantity`}><Minus size={14}/></button><output aria-label={`${flavours[id].short} quantity`}>{n}</output><button disabled={n===MAX_QUANTITY} onClick={()=>onQuantity(id,1)} aria-label={`Increase ${flavours[id].short} quantity`}><Plus size={14}/></button></div><button className="cart-remove" onClick={()=>onRemove(id)} aria-label={`Remove ${flavours[id].short}`}><Trash2 size={16}/></button></div>
            </div>
          </article>)}</div>:<div className="empty-cart"><ShoppingBag size={39}/><span>A little goodness goes a long way.</span></div>}
          <div className="cart-add"><p>{count?'A bottle of something else?':'Choose your first bottle'}</p>{Object.entries(flavours).map(([id,tea])=><button key={id} disabled={cart[id]===MAX_QUANTITY} onClick={()=>onQuantity(id,1)}><span className={`swatch ${id}`}/>{tea.short}<Plus size={15}/></button>)}</div>
          {count>0&&<><div className="cart-subtotal"><span>{count} {count===1?'bottle':'bottles'}</span><strong>{total===null?'Price to be confirmed':money(total)}</strong></div><p className="order-note">{total===null?'Final pricing and availability will need confirmation from Guipin.':'Product subtotal. Delivery and availability will need confirmation from Guipin.'}</p></>}
        </>}
        {step==='details'&&<form id="order-details" onSubmit={nextDetails}>
          <p className="order-intro">Add your details to the order request.</p>
          <label className="order-field">Your name<input name="name" autoComplete="name" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} required maxLength={100} pattern=".*\S.*" placeholder="Full name"/></label>
          <label className="order-field">Phone or email<input name="contact" autoComplete="email" value={customer.contact} onChange={e=>setCustomer({...customer,contact:e.target.value})} required maxLength={160} pattern=".*\S.*" placeholder="How can Guipin reach you?"/></label>
          <label className="order-field">Order note <span>(optional)</span><textarea name="note" value={customer.note} onChange={e=>setCustomer({...customer,note:e.target.value})} maxLength={600} rows={3} placeholder="Your area, delivery preference, or anything else…"/></label>
          <p className="order-note">Your details stay in this page until you choose to share your order.</p>
        </form>}
        {step==='review'&&<><p className="order-intro">Check your flavours, quantities, and contact details.</p>{summary()}<div className="customer-summary"><span>Prepared for</span><strong>{customer.name}</strong><p>{customer.contact}</p>{customer.note&&<p className="customer-note">{customer.note}</p>}<button onClick={()=>setStep('details')}>Edit details</button></div><p className="order-note">Confirming prepares your order request. No payment is taken and nothing is sent automatically.</p></>}
        {step==='ready'&&<><p className="order-intro">{sendUrl?'Your selection is confirmed. Send your request to Guipin to arrange availability and payment.':'Your selection is confirmed on this device. It has not been sent to Guipin.'}</p>{summary()}<div className="ready-note">{sendUrl?'Guipin will need to confirm your request before it becomes an accepted order.':'Online ordering is not connected yet. You can copy your request to share with Guipin.'}</div>{copyError&&<label className="order-field">Copy your order below<textarea readOnly value={orderText()} rows={7} onFocus={e=>e.target.select()}/></label>}<div className="order-share-options">{orderConfig.email&&<a href={emailUrl}>Send by email</a>}<button onClick={copyOrder}><Copy size={13}/> Copy request</button></div><p className="copy-status" aria-live="polite">{copied?'Order request copied.':copyError?'Automatic copying is unavailable. Select and copy the text above.':''}</p></>}
      </div>
      <footer className="order-actions">
        {step==='cart'&&(count?<button className="order-primary" onClick={()=>setStep('details')}>Continue to details <ArrowRight size={18}/></button>:<button className="order-primary" onClick={()=>onQuantity(selected,1)}>Add {flavours[selected].short} <Plus size={18}/></button>)}
        {step==='details'&&<><button className="order-primary" type="submit" form="order-details">Review order <ArrowRight size={18}/></button><button className="order-back" onClick={()=>setStep('cart')}><ArrowLeft size={15}/> Back to cart</button></>}
        {step==='review'&&<><button className="order-primary" onClick={()=>{setCopied(false);setStep('ready');}}>Confirm order <Check size={18}/></button><button className="order-back" onClick={()=>setStep('cart')}><ArrowLeft size={15}/> Edit cart</button></>}
        {step==='ready'&&<>{sendUrl?<a className="order-primary" href={sendUrl} target="_blank" rel="noopener noreferrer">{orderConfig.whatsapp?'Send via WhatsApp':'Send via email'} <Send size={18}/></a>:<button className="order-primary" onClick={copyOrder}>{copied?'Copied':'Copy order request'}{copied?<Check size={18}/>:<Copy size={18}/>}</button>}<button className="order-back" onClick={onClose}>Continue exploring <ArrowRight size={15}/></button></>}
      </footer>
    </div>
  </dialog>;
}
