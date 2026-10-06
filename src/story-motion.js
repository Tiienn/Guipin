const clamp=(x)=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

export const chapters=[
  {id:'flavours',label:'Choose your tea',at:0},
  {id:'botanicals',label:'The flavour',at:.30},
  {id:'goodness',label:'Inside the bottle',at:.53},
  {id:'pour',label:'Your daily ritual',at:.90},
];
export function chapterAt(progress){return progress<.19?0:progress<.43?1:progress<.69?2:3;}
export function storyMotion(progress){
  const p=clamp(progress);
  const first=ease(.10,.26,p),second=ease(.40,.50,p),returning=ease(.59,.69,p);
  const x=mix(mix(mix(0,1.30,first),-1.20,second),1.05,returning);
  const yaw=Math.PI*ease(.15,.34,p)+Math.PI*ease(.49,.66,p);
  return {x,yaw,scale:mix(.99,1.12,first),pour:clamp((p-.69)/.31),carousel:1-ease(.08,.18,p)};
}
