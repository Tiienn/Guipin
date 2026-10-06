import * as THREE from 'three';

// Front artwork follows the supplied bottle: gold fan mark, stacked Chinese
// name, vertical nutrition column, cream field and the large 清 / 润 motif.
export default function labelTexture(citrus) {
  const c=document.createElement('canvas');c.width=2048;c.height=1280;
  const x=c.getContext('2d'),center=1024,cream='#fff1d5',gold='#b48c29',ink='#201d16';
  const accent=citrus?'#d74a22':'#c0ce08';
  x.fillStyle=cream;x.fillRect(0,0,c.width,c.height);
  x.fillStyle=citrus?'#d64c22':'#e4dc08';x.fillRect(0,753,2048,527);
  x.beginPath();x.ellipse(center,750,460,64,0,0,Math.PI*2);x.fillStyle=cream;x.fill();
  x.fillStyle=gold;x.fillRect(0,0,2048,22);x.fillRect(0,1258,2048,22);
  x.textAlign='center';
  x.save();x.translate(center,0);x.scale(.88,1);x.translate(-center,0);
  // Fan-shaped manufacturer mark, matching the photographed front panel.
  x.save();x.translate(790,114);x.strokeStyle=gold;x.lineWidth=3;
  for(const inset of [0,10]){x.beginPath();x.moveTo(-103+inset,-20);x.quadraticCurveTo(0,-104+inset,103-inset,-20);x.lineTo(38,51-inset);x.quadraticCurveTo(0,23,-38,51-inset);x.closePath();x.stroke();}
  x.fillStyle=gold;x.font='700 58px "Songti SC", "STSong", serif';x.fillText('臻飲',0,2);
  x.font='15px Georgia';x.fillText('Z H E N Y I N',0,-63);x.restore();
  x.fillStyle='#d3ac26';x.font='800 83px "PingFang SC", sans-serif';x.fillText('易臻选',1165,136);
  x.font='22px serif';x.fillText('®',1318,77);
  if(!citrus){
    // Small ivory jasmine blossom printed beside the product name.
    x.save();x.translate(1450,222);x.rotate(-.25);
    for(let i=0;i<7;i++){x.save();x.rotate(i*Math.PI*2/7);const g=x.createRadialGradient(0,-19,2,0,-38,54);g.addColorStop(0,'#fffdf2');g.addColorStop(1,'#cfc7b7');x.fillStyle=g;x.beginPath();x.ellipse(0,-36,22,48,0,0,Math.PI*2);x.fill();x.restore();}
    x.fillStyle='#d6b45c';x.beginPath();x.arc(0,0,10,0,Math.PI*2);x.fill();x.restore();
  }
  x.strokeStyle=ink;x.lineWidth=3;x.strokeRect(610,207,840,397);
  x.beginPath();x.moveTo(715,207);x.lineTo(715,604);x.stroke();
  for(let i=0;i<3;i++){
    if(i){x.beginPath();x.moveTo(610,207+i*132);x.lineTo(715,207+i*132);x.stroke();}
    x.fillStyle=citrus?'#925326':'#968a24';x.font='82px "Songti SC",serif';x.fillText('0',648,303+i*132);
    x.font='27px "Songti SC",serif';x.fillText(['糖','脂','卡'][i],691,294+i*132);
  }
  x.fillStyle=ink;x.font='900 205px "Songti SC", "STSong", serif';x.fillText('罗汉果',1080,381);
  x.font=`900 ${citrus?210:173}px "Songti SC", "STSong", serif`;x.fillText(citrus?'陈皮茶':'茉莉花茶',1080,565);
  x.strokeRect(610,622,215,61);x.strokeRect(1110,622,340,61);
  x.font='38px "Songti SC",serif';x.fillText('草本饮料',718,667);x.font='37px "Songti SC",serif';x.fillText('净含量:500mL',1280,667);
  x.fillStyle=cream;x.beginPath();x.ellipse(1050,957,254,294,.1,0,Math.PI*2);x.fill();
  x.fillStyle=accent;x.font='900 485px "Songti SC", "STSong", serif';x.fillText(citrus?'润':'清',1024,1112);
  if(!citrus){
    for(const [px,py,a] of [[780,790,-.6],[777,914,-1.0]]){x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.moveTo(0,-55);x.bezierCurveTo(64,-22,60,42,0,60);x.bezierCurveTo(-16,15,-15,-28,0,-55);x.fill();x.restore();}
  }
  x.strokeStyle=citrus?'#823c20':'#827925';x.lineWidth=3;
  for(const [from,to] of [[590,954],[1094,1470]])for(let row=0;row<4;row++){
    x.beginPath();for(let i=from;i<=to;i+=4){const y=1179+row*11+Math.sin((i-from)*.027)*7;i===from?x.moveTo(i,y):x.lineTo(i,y);}x.stroke();
  }
  x.beginPath();x.arc(center,1196,52,0,Math.PI*2);x.stroke();x.font='73px "Songti SC",serif';x.fillStyle=x.strokeStyle;x.fillText('茶',center,1223);
  x.restore();
  // The supplied reference only shows the front. Keep the useful rotating
  // back-panel details separate from that photographed artwork.
  for(const back of [0,2048]){
    x.fillStyle=ink;x.font='600 44px sans-serif';x.fillText('GUIPIN',back,133);
    x.font='700 61px sans-serif';x.fillText('ZERO SUGAR',back,274);x.fillText('ZERO CALORIES',back,352);
    x.font='33px sans-serif';x.fillText(citrus?'AGED CITRUS PEEL':'JASMINE BLOSSOM',back,461);x.fillText('+ MONK FRUIT',back,519);
    x.font='29px sans-serif';x.fillText('Plant-based sweetness',back,608);x.fillText('Enjoy hot or cold',back,664);x.fillText('500 ml',back,720);
    x.strokeStyle=gold;x.lineWidth=2;x.beginPath();x.moveTo(back-272,188);x.lineTo(back+272,188);x.moveTo(back-272,397);x.lineTo(back+272,397);x.stroke();
    x.fillStyle=cream;x.font='600 78px Georgia';x.fillText('Naturally',back,974);x.fillText('yours.',back,1071);
  }
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
