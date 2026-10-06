import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowDown, ArrowLeft, ArrowRight, Leaf, Droplets, Flower2, Snowflake, Sun, Plus, Minus, Menu, X, RotateCcw, Sparkles, ShoppingBag } from 'lucide-react';
import TeaScene from './tea-scene.js';
import { flavours } from './flavours.js';
import { chapters, chapterAt } from './story-motion.js';
import './styles.css';
import OrderDrawer from './order-drawer.jsx';
import {readCart,changeQuantity,CART_KEY} from './cart.js';

const chapterIcons=[Sparkles,Flower2,Leaf,Droplets];
const questions=[
  ['What makes Guipin naturally sweet?','Monk fruit gives Guipin its gentle, plant-based sweetness. Light, refreshing tea, without added sugar or artificial sweeteners.'],
  ['What’s the difference between the two flavours?','Jasmine is delicate and floral, with a clean, refreshing finish. Aged citrus has a deeper, mellow citrus character. Both are naturally sweetened with monk fruit.'],
  ['Can I enjoy it hot or cold?','Absolutely. Chill the bottle and pour over ice for a refreshing sip. For a warm moment, pour into a heat-safe cup and gently warm. Do not heat the sealed bottle.'],
  ['Does it fit a low-sugar lifestyle?','Guipin is a zero-sugar, zero-calorie alternative to sugary drinks. If you manage diabetes or follow a specific diet, check the full nutrition label and ingredients against your personal needs.'],
  ['How should I store it?','Store unopened bottles in a cool, dry place away from direct sunlight. Refrigerate after opening, and follow the storage instructions and best-before date on your bottle.'],
];

function App(){
  const [flavour,setFlavour]=useState('jasmine'),[serving,setServing]=useState('cold'),[progress,setProgress]=useState(0),[faq,setFaq]=useState(null),[menu,setMenu]=useState(false),[failed,setFailed]=useState(false);
  const [cart,setCart]=useState(readCart),[cartOpen,setCartOpen]=useState(false);
  const cartCount=Object.values(cart).reduce((sum,n)=>sum+n,0);
  useEffect(()=>{try{localStorage.setItem(CART_KEY,JSON.stringify(cart));}catch{}},[cart]);
  function updateQuantity(id,delta){setCart(current=>changeQuantity(current,id,delta));}
  function removeItem(id){setCart(current=>{const next={...current};delete next[id];return next;});}
  function orderNow(){updateQuantity(flavour,1);setMenu(false);setCartOpen(true);}
  function openCart(){setMenu(false);setCartOpen(true);}
  const stage=useRef(null),host=useRef(null),scene=useRef(null),touch=useRef(null),reduced=useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tea=flavours[flavour],chapter=chapterAt(progress),other=flavour==='jasmine'?'citrus':'jasmine';
  useEffect(()=>{
    try{scene.current=new TeaScene(host.current,reduced.current);}catch(error){console.error('3D scene unavailable',error);setFailed(true);}
    let frame;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const rect=stage.current.getBoundingClientRect();const p=Math.max(0,Math.min(1,-rect.top/Math.max(1,rect.height-window.innerHeight)));setProgress(p);scene.current?.setProgress(p);});};
    window.addEventListener('scroll',measure,{passive:true});window.addEventListener('resize',measure);measure();
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',measure);window.removeEventListener('resize',measure);scene.current?.dispose();};
  },[]);
  useEffect(()=>{scene.current?.setFlavour(flavour);},[flavour]);
  useEffect(()=>{scene.current?.setServing(serving);},[serving]);
  function goTo(index){setMenu(false);window.scrollTo({top:stage.current.offsetTop+(stage.current.offsetHeight-window.innerHeight)*chapters[index].at,behavior:reduced.current?'instant':'smooth'});}
  function switchTea(next){setFlavour(next);}
  function onFlavourKey(e){if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'jasmine':e.key==='End'?'citrus':other;switchTea(next);document.getElementById(`flavour-${next}`)?.focus();}}
  const panelProps=(index)=>({'aria-hidden':chapter!==index,className:`story-panel panel-${index} ${chapter===index?'is-active':''}`,inert:chapter!==index?true:undefined});
  return <div className={`experience ${flavour}`} style={{'--accent':tea.accent,'--glow':tea.glow}}>
    <a className="skip-link" href="#questions">Skip the animation</a>
    <header className="site-header">
      <button className="header-note" onClick={()=>goTo(0)}><span className="status-dot"/> Naturally sweet tea</button>
      <a className="wordmark" href="#flavours" onClick={(e)=>{e.preventDefault();goTo(0);}} aria-label="Guipin home">guipin<span>✳</span><small>贵品</small></a>
      <div className="header-right"><button className="header-order" onClick={orderNow}>Order now</button><button className="cart-trigger" onClick={openCart} aria-label={`Cart (${cartCount} ${cartCount===1?'bottle':'bottles'})`}><ShoppingBag size={18}/><span className="cart-word">Cart</span><span className="cart-count">{cartCount}</span></button><button className="menu-button" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={19}/>:<Menu size={19}/>}</button></div>
      {menu&&<nav className="menu-panel" aria-label="Main navigation">{chapters.map((item,i)=><button key={item.id} onClick={()=>goTo(i)}>{item.label}<ArrowUpRight size={16}/></button>)}<a href="#questions" onClick={()=>setMenu(false)}>Questions, answered<ArrowUpRight size={16}/></a></nav>}
    </header>
    <main>
      <section id="flavours" className="story-track" ref={stage} aria-label="Explore Guipin tea">
        <div className={`story-stage chapter-${chapter}`} data-chapter={chapter} style={{'--pour-copy-opacity':Math.max(0,Math.min(1,(progress-.75)/.05))}}>
          <div className="stage-haze"/><div className="stage-grid"/><div className="stage-vignette"/>
          <div className="giant-flavour" aria-hidden="true">{tea.title}</div>
          <div ref={host} className="scene" role="img" aria-label={`${tea.name}: ${['3D bottle carousel','bottle rotating to reveal the flavour','rotating bottle with zero sugar and zero calorie details','tea pouring over ice'][chapter]}`} onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)switchTea(other);touch.current=null;}}>
            {failed&&<img className="scene-fallback" src={tea.image} alt={`${tea.name} bottle`}/>}
          </div>
          <div {...panelProps(0)}>
            <div className="hero-topline"><span>Rooted in nature. Made for your everyday.</span><span className="hero-chinese">{tea.chinese}</span></div>
            <div className="hero-caption"><span className="eyebrow">A little sip. A lighter you.</span><h1>NATURAL TEA.</h1></div>
            <div className="hero-product"><span className="eyebrow">Your daily feel-good tea</span><h2>{tea.short}<span>+ monk fruit</span></h2><p>{tea.notes}</p><button className="hero-order" onClick={orderNow}>Order now <ShoppingBag size={15}/></button><button className="line-link discover-tea" onClick={()=>goTo(1)}>Discover this tea <ArrowUpRight size={17}/></button></div>
            <button className="carousel-arrow previous" onClick={()=>switchTea(other)} aria-label={`Previous flavour: ${flavours[other].short}`}><ArrowLeft size={22}/></button>
            <button className="carousel-arrow next" onClick={()=>switchTea(other)} aria-label={`Next flavour: ${flavours[other].short}`}><ArrowRight size={22}/></button>
          </div>
          <div {...panelProps(1)}>
            <div className="detail-copy left"><span className="eyebrow"><Flower2 size={16}/> Meet {tea.short.toLowerCase()}</span><h2><span className="flavour-headline">{tea.headline[0].split(' ').map((word,i)=><span key={i}>{word}</span>)}</span>{tea.headline[1]}</h2><p>{tea.description}</p><div className="ingredient-note"><span>{tea.botanical}</span><Plus size={14}/><span>Monk fruit</span></div></div>
            <div className="product-callout"><span className="callout-dot"/><span>{tea.character}<small>{tea.finish}</small></span></div>
          </div>
          <div {...panelProps(2)}>
            <div className="detail-copy right"><span className="eyebrow"><Leaf size={16}/> What’s inside matters</span><h2>Zero sugar.<br/>Full flavour.</h2><p>Plant-based sweetness from monk fruit. Fragrant botanicals. A lighter alternative to your everyday sugary drink.</p><div className="nutrition"><div><strong>0<span>g</span></strong><span>Sugar</span></div><div><strong>0</strong><span>Calories</span></div><div><strong>500<span>ml</span></strong><span>Pure refreshment</span></div></div><div className="detail-footnote"><Leaf size={15}/> Naturally sweet. No artificial additives.</div></div>
          </div>
          <div {...panelProps(3)}>
            <div className="detail-copy left pour-copy"><span className="eyebrow"><Droplets size={16}/> Your daily ritual</span><h2>A little calm.<br/>Poured for you.</h2><p>{serving==='cold'?tea.ritual:'A warm cup. A gentle aroma. Slow down and let a little everyday calm find you.'}</p><div className="serving-toggle" aria-label="Serving temperature"><button aria-pressed={serving==='cold'} onClick={()=>setServing('cold')}><Snowflake size={15}/> Over ice</button><button aria-pressed={serving==='hot'} onClick={()=>setServing('hot')}><Sun size={15}/> Warm & calm</button></div></div>
          </div>
          <nav className="chapter-nav" aria-label="Tea story chapters">{chapters.map((item,i)=>{const Icon=chapterIcons[i];return <button key={item.id} aria-label={item.label} aria-current={chapter===i?'step':undefined} onClick={()=>goTo(i)}><span className="chapter-tooltip">{item.label}</span><Icon size={17}/></button>;})}</nav>
          <div className="stage-bottom">
            <button className="scroll-prompt" onClick={()=>chapter<3?goTo(chapter+1):document.getElementById('questions').scrollIntoView({behavior:reduced.current?'instant':'smooth'})}><span className="scroll-circle"><ArrowDown size={16}/></span><span>{chapter===0?'Scroll. Turn. Discover.':chapter===3?'A little more to know':'Keep the goodness flowing'}</span></button>
            <div className="flavour-dock" role="group" aria-label="Choose tea flavour" onKeyDown={onFlavourKey}><span className="dock-indicator"/>{Object.entries(flavours).map(([id,item])=><button id={`flavour-${id}`} key={id} onClick={()=>switchTea(id)} aria-pressed={flavour===id}><span className={`swatch ${id}`}/>{item.short}</button>)}</div>
            <button className="replay-button" onClick={()=>goTo(0)} aria-label="Take another turn"><RotateCcw size={19} aria-hidden="true"/></button>
          </div>
          <div className="story-progress" style={{transform:`scaleX(${progress})`}}/>
          <p className="sr-only" aria-live="polite">Selected tea: {tea.name}. {tea.notes}</p>
        </div>
      </section>
      <section className="faq-section" id="questions">
        <div className="faq-intro"><span className="eyebrow">Goodness, without the guesswork.</span><h2>A little<br/>tea talk.</h2><p>Two flavours. One lighter ritual.<br/>A few things you might like to know.</p><button className="line-link" onClick={()=>goTo(0)}>Meet your tea <ArrowUpRight size={17}/></button></div>
        <div className="faq-list">{questions.map(([q,a],i)=><article key={q} className="faq-item"><h3><button onClick={()=>setFaq(faq===i?null:i)} aria-expanded={faq===i} aria-controls={`answer-${i}`}>{q}{faq===i?<Minus size={18}/>:<Plus size={18}/>}</button></h3><div id={`answer-${i}`} hidden={faq!==i}><p>{a}</p></div></article>)}</div>
      </section>
    </main>
    <OrderDrawer open={cartOpen} onClose={()=>setCartOpen(false)} cart={cart} onQuantity={updateQuantity} onRemove={removeItem} selected={flavour}/>
    <footer><div className="footer-top"><a className="wordmark" href="#flavours" onClick={e=>{e.preventDefault();goTo(0);}}>guipin<span>✳</span><small>贵品</small></a><p>Goodness, in every little sip.</p><button onClick={()=>goTo(0)}>Back to the beginning <ArrowUpRight size={15}/></button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Guipin</span><span>Jasmine. Aged citrus. Naturally yours.</span><span>贵品 · 自然好滋味</span></div></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
