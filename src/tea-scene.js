import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import labelTexture from './product-label.js';
import { refractiveGlass, teaVolume, backdropMaterial } from './optics.js';
import { reshapeTeaVolume } from './liquid-geometry.js';
import { flightTime, pourPoint, flowRadius, POUR_SOURCE } from './pour-physics.js';
import { storyMotion, chapterAt } from './story-motion.js';

const { clamp, lerp } = THREE.MathUtils;
const smooth = (a,b,t) => { const x=clamp((t-a)/(b-a),0,1); return x*x*(3-2*x); };
const randomGenerator = (seed=73) => () => {seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const vec = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

export default class TeaScene {
  constructor(host,reduced) {
    this.host=host;this.reduced=reduced;this.target=0;this.progress=0;this.serving='cold';this.active=true;this.pointer={x:0,y:0};
    this.refractors=[];this.textures=[];this.previousTime=0;this.disposed=false;this.needsRender=true;this.bottleVolumes=[];this.dropletMeshes=[];this.previewBottles=[];this.switchAnimation=null;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.04;
    host.prepend(this.renderer.domElement);
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,40);this.camera.position.set(0,.55,9.4);this.camera.lookAt(0,-.02,0);
    this.resolution=new THREE.Vector2(1,1);
    this.refractionTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
    this.iceTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),backdropMaterial());this.backdrop.frustumCulled=false;this.backdrop.renderOrder=-100;this.scene.add(this.backdrop);
    this.makeStudio();
    this.labels=[labelTexture(false),labelTexture(true)];
    this.makeBottle();this.makeCarousel();this.makeGlass();this.makePour();this.makeGround();
    this.setFlavour('jasmine');
    this.resize=()=>{
      const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1||this.disposed)return;
      this.mobile=window.innerWidth<650;
      this.renderer.setSize(w,h);this.renderer.getDrawingBufferSize(this.resolution);
      this.refractionTarget.setSize(this.resolution.x,this.resolution.y);this.iceTarget.setSize(this.resolution.x,this.resolution.y);
      this.camera.aspect=w/h;this.camera.position.z=this.mobile?9.8:9.4;this.camera.position.x=0;this.camera.lookAt(0,-.02,0);this.camera.updateProjectionMatrix();this.updateBackdropRect();this.needsRender=true;
    };
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.resize();
    this.visibility=new IntersectionObserver(([e])=>{this.active=e.isIntersecting;});this.visibility.observe(host);
    this.onPointer=e=>{const r=host.getBoundingClientRect();this.pointer.x=(e.clientX-r.left)/r.width-.5;this.pointer.y=(e.clientY-r.top)/r.height-.5;};
    this.onLeave=()=>{this.pointer.x=0;this.pointer.y=0;};
    host.addEventListener('pointermove',this.onPointer);host.addEventListener('pointerleave',this.onLeave);
    this.start=performance.now();this.animate=this.animate.bind(this);this.raf=requestAnimationFrame(this.animate);
  }

  mesh(geometry,material,parent=this.scene,position=[0,0,0]) {
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);parent.add(mesh);return mesh;
  }
  optical(geometry,parent,position,thickness=.012,strength=1) {
    const mat=refractiveGlass(this.refractionTarget.texture,this.resolution,thickness,strength);
    const mesh=this.mesh(geometry,mat,parent,position);mesh.renderOrder=10;this.refractors.push(mesh);return mesh;
  }
  lathe(points,segments=128) {return new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),segments);}

  addTeaGlow(volume) {
    // Backlight scattered through the tea keeps its amber colour readable
    // against the dark set, independently of the transmitted background.
    const material=new THREE.ShaderMaterial({
      uniforms:volume.material.uniforms,vertexShader:volume.material.vertexShader,
      fragmentShader:volume.material.fragmentShader.replace('gl_FragColor = vec4(transmission, 1.);','gl_FragColor = vec4(transmission * (.035 + .36 * pow(facing, 2.2)) * (0.65 + 0.35 * smoothstep(-1.7,1.2,vLocal.y)), 1.);'),
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    });
    const glow=this.mesh(volume.geometry,material,volume);glow.name='tea-glow';glow.renderOrder=5.5;
  }

  makeStudio() {
    // Large studio cards create long, clean reflections on the PET and glass.
    const studio=new THREE.Scene();studio.background=new THREE.Color('#44483e');
    const panel=(position,scale,intensity,colour='#ffffff')=>{
      const m=this.mesh(new THREE.PlaneGeometry(...scale),new THREE.MeshBasicMaterial({color:new THREE.Color(colour).multiplyScalar(intensity)}),studio,position);m.lookAt(0,0,0);
    };
    panel([-3,2.2,4],[1.1,7],6);panel([4,1,2],[.7,6],4.5);panel([0,6,-1],[5,3],3.5);panel([0,.5,-5],[3,5],1.4,'#ebf4d6');
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(studio,.025);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.85;
    pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    this.scene.add(new THREE.HemisphereLight(0xf5fff4,0x57734d,.55));
    const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(-3,5,6);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xffe0a3,.65);rim.position.set(3,1,-3);this.scene.add(rim);
  }

  makeBottle() {
    this.bottle=new THREE.Group();this.scene.add(this.bottle);
    const body=[[0,-1.73],[.48,-1.73],[.60,-1.70],[.66,-1.66],[.694,-1.59],[.705,-1.48],[.708,-1.42],[.708,.69]];
    for(let i=1;i<=32;i++){const t=i/32;body.push([lerp(.708,.314,smooth(0,1,t)),lerp(.69,1.52,t)]);}
    body.push([.314,1.84]);
    this.bottleTea=teaVolume([.09,.63,2.8],.7);
    this.bottleLiquid=this.mesh(this.lathe([...body,[0,1.84]]),this.bottleTea,this.bottle);this.bottleLiquid.renderOrder=5;this.bottleLiquid.name='tea-volume';this.bottleVolumes.push(this.bottleLiquid);this.addTeaGlow(this.bottleLiquid);
    const shoulder=body.filter(([,y])=>y>=.69).concat([[.29,1.85],[.28,1.83],[.28,1.51],[.30,1.48]]);
    this.bottleShoulder=this.optical(this.lathe(shoulder),this.bottle,[0,0,0],.007,1);
    this.bottleShoulder.material.uniforms.uCondensation.value=1;
    this.bottleShoulder.material.uniforms.uBottle.value=1;
    this.optical(this.lathe(body.filter(([,y])=>y<=-1.42)),this.bottle,[0,0,0],.013,.8);
    this.labelMaterial=new THREE.MeshPhysicalMaterial({map:this.labels[0],roughness:.46,metalness:0,clearcoat:.24,clearcoatRoughness:.22});
    this.label=this.mesh(new THREE.CylinderGeometry(.719,.719,2.12,160,1,true),this.labelMaterial,this.bottle,[0,-.365,0]);this.label.rotation.y=Math.PI;this.label.name='product-label';
    // A fine clear helical thread, rather than three opaque white hoops.
    const threadPoints=[];
    for(let i=0;i<=180;i++){
      const a=i/180*Math.PI*4.2;
      threadPoints.push(vec(Math.sin(a)*.317,1.565+i/180*.218,Math.cos(a)*.317));
    }
    const thread=this.optical(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(threadPoints),180,.005,7,false),this.bottle,[0,0,0],.0006,.32);
    thread.renderOrder=11;
    const lip=this.optical(new THREE.TorusGeometry(.296,.012,12,96),this.bottle,[0,1.842,0],.001,.65);lip.rotation.x=Math.PI/2;
    this.cap=new THREE.Group();this.cap.position.y=1.915;this.bottle.add(this.cap);
    const capMat=new THREE.MeshPhysicalMaterial({color:0xf4f3e7,roughness:.44,metalness:0});
    this.mesh(this.lathe([[0,-.16],[.335,-.16],[.350,-.145],[.350,.15],[.345,.176],[.320,.185],[0,.185]]),capMat,this.cap);
    const ribs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.004,.004,.267,5),new THREE.MeshStandardMaterial({color:0xdcded5,roughness:.5}),100);
    const temp=new THREE.Object3D();
    for(let i=0;i<100;i++){const a=i*Math.PI*2/100;temp.position.set(Math.sin(a)*.353,0,Math.cos(a)*.353);temp.updateMatrix();ribs.setMatrixAt(i,temp.matrix);}this.cap.add(ribs);
    const tamper=this.mesh(new THREE.CylinderGeometry(.346,.346,.046,96),capMat,this.bottle,[0,1.713,0]);
    const random=randomGenerator(43);
    const dropsMaterial=refractiveGlass(this.refractionTarget.texture,this.resolution,.0035,1.1);
    dropsMaterial.uniforms.uBead.value=1;
    this.condensation=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,10),dropsMaterial,1050);
    this.condensation.renderOrder=14;this.condensation.name='condensation';
    this.dropletMeshes.push(this.condensation);this.refractors.push(this.condensation);
    // Most condensation gathers on the exposed PET. Sparse larger beads merge
    // into short runs, while the label carries much finer droplets.
    for(let i=0;i<1050;i++){
      const onShoulder=i<720;
      const y=onShoulder?.71+random()*.67:-1.59+random()*2.25;
      const a=random()*Math.PI*2;
      let radius=.721,slope=0;
      if(onShoulder||y<-1.43){
        for(let k=1;k<body.length;k++)if(y>=body[k-1][1]&&y<=body[k][1]){
          const [r0,y0]=body[k-1],[r1,y1]=body[k];
          radius=lerp(r0,r1,(y-y0)/(y1-y0))+.002;slope=(r1-r0)/(y1-y0);break;
        }
      }
      const large=random()>.86,size=large?.020+random()*.019:.004+Math.pow(random(),2)*.011;
      const n=vec(Math.sin(a),-slope,Math.cos(a)).normalize();
      temp.position.set(Math.sin(a)*radius,y,Math.cos(a)*radius);
      temp.quaternion.setFromUnitVectors(vec(0,0,1),n);
      temp.scale.set(size,size*(large?1.25+random()*.65:1+random()*.3),size*.62);
      temp.updateMatrix();this.condensation.setMatrixAt(i,temp.matrix);
    }
    this.bottle.add(this.condensation);
    this.mouth=new THREE.Object3D();this.mouth.position.set(POUR_SOURCE.x,POUR_SOURCE.y,POUR_SOURCE.z);this.bottle.add(this.mouth);
    this.mouthWorld=vec();this.rotatedMouth=vec();this.outflowVelocity=vec();
  }

  makeCarousel() {
    for(let i=0;i<2;i++){
      const group=this.bottle.clone(true),record={group};
      group.traverse(object=>{
        if(!object.material)return;
        const original=object.material;
        object.material=original.uniforms?.uScene
          ? refractiveGlass(this.refractionTarget.texture,this.resolution,original.uniforms.uThickness.value,original.uniforms.uStrength.value)
          : original.clone();
        if(original.uniforms?.uScene){
          for(const name of ['uFrost','uBead','uCondensation','uBase','uAmber','uBottle'])object.material.uniforms[name].value=original.uniforms[name].value;
          object.material.uniforms.uTint.value.copy(original.uniforms.uTint.value);
        }
        if(object.name==='product-label')record.label=object.material;
        if(object.name==='tea-volume'){record.volume=object;this.bottleVolumes.push(object);}
        if(object.name==='condensation')this.dropletMeshes.push(object);
        if(object.material.uniforms?.uScene){object.material.uniforms.uScene.value=this.refractionTarget.texture;object.material.uniforms.uResolution.value=this.resolution;this.refractors.push(object);}
      });
      record.volume.children.find(child=>child.name==='tea-glow').material.uniforms=record.volume.material.uniforms;
      this.scene.add(group);this.previewBottles.push(record);
    }
  }

  previewFlavour(record,flavour) {
    const citrus=flavour==='citrus';record.label.map=this.labels[citrus?1:0];record.label.needsUpdate=true;
    record.volume.material.uniforms.uAbsorption.value.set(...(citrus?[.40,1.5,4.8]:[.16,1.05,3.6]));
  }

  makeGlass() {
    this.glass=new THREE.Group();this.glass.position.set(-.4,-1.28,.26);this.scene.add(this.glass);
    // Continuous outer/inner profile: a thin lip and sidewall, a heavier base.
    const profile=[[.552,-.816],[.562,-.76],[.643,.73],[.646,.797],[.640,.810],[.628,.810],[.623,.797],[.621,.73],[.536,-.713],[.529,-.746]];
    this.glassWall=this.optical(this.lathe(profile,160),this.glass,[0,0,0],.006,1);
    // A separate solid foot avoids self-refraction across the lathe's inner
    // floor, which produced the dark half-disc visible at the glass bottom.
    const baseMaterial=new THREE.MeshPhysicalMaterial({color:0xc7d4cc,roughness:.1,metalness:0,transparent:true,opacity:.13,envMapIntensity:.45,depthWrite:false});
    this.glassBase=this.mesh(new THREE.CylinderGeometry(.536,.546,.078,128),baseMaterial,this.glass,[0,-.791,0]);
    this.glassBase.renderOrder=4;
    for(const [radius,y,tube] of [[.635,.811,.004]]){
      const ring=this.optical(new THREE.TorusGeometry(radius,tube,12,128),this.glass,[0,y,0],.005,1.15);
      ring.rotation.x=Math.PI/2;ring.renderOrder=12;
    }
    this.liquidMaterial=teaVolume([.085,.65,2.9],.6);
    this.liquid=this.mesh(new THREE.CylinderGeometry(.609,.528,1.25,96),this.liquidMaterial,this.glass);this.liquid.renderOrder=5;this.addTeaGlow(this.liquid);
    this.liquidRestPositions=this.liquid.geometry.attributes.position.array.slice();
    this.surfaceMaterial=new THREE.MeshPhysicalMaterial({color:0xd6a049,roughness:.065,metalness:0,transparent:true,opacity:.12,clearcoat:1,envMapIntensity:1.1,depthWrite:false});
    this.surface=this.mesh(new THREE.RingGeometry(0,.609,96,12),this.surfaceMaterial,this.glass);this.surface.rotation.x=-Math.PI/2;this.surface.renderOrder=6;
    this.meniscus=this.mesh(new THREE.TorusGeometry(.605,.009,8,96),this.surfaceMaterial,this.glass);this.meniscus.rotation.x=Math.PI/2;this.meniscus.renderOrder=6;
    this.ice=new THREE.Group();this.glass.add(this.ice);this.cubes=[];
    const material=refractiveGlass(this.iceTarget.texture,this.resolution,.045,.94),random=randomGenerator(82);
    material.uniforms.uFrost.value=.88;
    const bubbleMaterial=new THREE.MeshBasicMaterial({color:0xf3fcff,transparent:true,opacity:.13,depthWrite:false});
    for(let i=0;i<6;i++){
      const g=new THREE.Group(),geo=new RoundedBoxGeometry(.46+(i%2)*.035,.44,.47,6,.069),p=geo.attributes.position;
      for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j);const n=Math.sin(x*17+y*11+z*13+i*3)*.018;p.setXYZ(j,x*(1+n)+y*.04,y+n*.35,z*(1-n));}geo.computeVertexNormals();
      const cube=this.mesh(geo,material,g);cube.renderOrder=7;
      const a=i*2.399;g.position.set(Math.cos(a)*.265,-.44+Math.floor(i/3)*.39,Math.sin(a)*.245);g.rotation.set(.15+random()*.45,random()*2,.15+random()*.4);
      g.userData={baseY:g.position.y,rx:g.rotation.x,rz:g.rotation.z,phase:random()*6.28};
      const bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.004,6,4),bubbleMaterial,24),dummy=new THREE.Object3D();bubbles.renderOrder=8;
      for(let j=0;j<24;j++){dummy.position.set((random()-.5)*.30,(random()-.5)*.29,(random()-.5)*.30);dummy.scale.setScalar(.5+random()*1.2);dummy.updateMatrix();bubbles.setMatrixAt(j,dummy.matrix);}g.add(bubbles);
      this.ice.add(g);this.cubes.push(g);
    }
    this.ripples=[];
    for(let i=0;i<4;i++){const material=new THREE.MeshBasicMaterial({color:0xffedbb,transparent:true,opacity:0,depthWrite:false});const ring=this.mesh(new THREE.TorusGeometry(1,.011,5,72),material,this.glass);ring.rotation.x=Math.PI/2;ring.renderOrder=7;this.ripples.push(ring);}
    this.steam=new THREE.Group();this.glass.add(this.steam);
    const steamTexture=this.radialTexture('#ffffff');
    for(let i=0;i<7;i++){const material=new THREE.SpriteMaterial({map:steamTexture,transparent:true,opacity:.04,depthWrite:false});const s=new THREE.Sprite(material);s.scale.set(.35,.52,1);s.userData.phase=i/7;this.steam.add(s);}
  }

  makePour() {
    this.streamSegments=72;this.streamSides=20;
    const count=(this.streamSegments+1)*(this.streamSides+1),position=new Float32Array(count*3),normal=new Float32Array(count*3),indices=[];
    for(let i=0;i<this.streamSegments;i++)for(let j=0;j<this.streamSides;j++){const a=i*(this.streamSides+1)+j,b=a+this.streamSides+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);
    this.stream=this.optical(geometry,this.scene,[0,0,0],.009,.9);this.stream.material.uniforms.uTint.value.set(1,.90,.62);this.stream.material.uniforms.uAmber.value=.8;this.stream.frustumCulled=false;this.stream.renderOrder=15;
    const material=refractiveGlass(this.refractionTarget.texture,this.resolution,.003,.8);
    material.uniforms.uBead.value=1;material.uniforms.uAmber.value=.2;material.uniforms.uTint.value.set(1,.96,.84);
    this.splash=new THREE.Group();this.scene.add(this.splash);
    for(let i=0;i<14;i++){
      const d=this.mesh(new THREE.SphereGeometry(.004+(i%4)*.0015,10,8),material,this.splash);
      d.userData={angle:i*2.399,phase:i/14};d.renderOrder=15;this.refractors.push(d);
    }
    this.impact=vec();this.streamStart=vec();
  }

  radialTexture(colour) {
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,colour);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);const texture=new THREE.CanvasTexture(c);this.textures.push(texture);return texture;
  }
  makeGround() {
    const material=new THREE.MeshBasicMaterial({map:this.radialTexture('rgba(41,62,35,.24)'),transparent:true,depthWrite:false});
    this.shadow=this.mesh(new THREE.PlaneGeometry(3.2,.60),material,this.scene,[.05,-1.93,-.45]);this.shadow.rotation.x=-.14;
    this.podium=new THREE.Group();this.podium.position.y=-2.08;this.scene.add(this.podium);
    this.mesh(new THREE.CylinderGeometry(.95,1.01,.065,96),new THREE.MeshPhysicalMaterial({color:0x344230,roughness:.26,metalness:.6}),this.podium);
    this.podiumGlow=new THREE.MeshBasicMaterial({color:0xd0e89a,transparent:true,opacity:.8});
    for(const radius of [.94,1.04]){const ring=this.mesh(new THREE.TorusGeometry(radius,.007,8,96),this.podiumGlow,this.podium,[0,.04,0]);ring.rotation.x=Math.PI/2;}
  }
  updateBackdropRect() {
    const stage=this.host.parentElement;
    this.backdrop.material.uniforms.uRect.value.set(this.host.offsetLeft/stage.clientWidth,this.host.offsetTop/stage.clientHeight,this.host.clientWidth/stage.clientWidth,this.host.clientHeight/stage.clientHeight);
  }
  updateBackdrop(flavour=this.desiredFlavour) {
    const chapter=chapterAt(this.target),citrus=flavour==='citrus';
    this.backgroundChapter=chapter;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
    gradient.addColorStop(0,citrus?'#19110d':'#08140f');
    gradient.addColorStop(.54,citrus?'#63452b':'#2b5136');
    gradient.addColorStop(1,chapter===1||chapter===2?(citrus?'#19110d':'#08140f'):(citrus?'#b18e73':'#899b73'));
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    const glow=ctx.createRadialGradient(280,340,0,280,340,340);
    glow.addColorStop(0,citrus?'rgba(179,123,70,.5)':'rgba(105,152,83,.5)');glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,512,512);
    const haze=this.host.parentElement.querySelector('.stage-haze');
    haze.style.backgroundImage=`url(${canvas.toDataURL()})`;haze.style.backgroundSize='100% 100%';
    if(this.backgroundTexture){this.backgroundTexture.image=canvas;this.backgroundTexture.needsUpdate=true;}
    else{this.backgroundTexture=new THREE.CanvasTexture(canvas);this.backgroundTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(this.backgroundTexture);this.backdrop.material.uniforms.uTexture.value=this.backgroundTexture;}
    this.updateBackdropRect();
  }
  setProgress(p) {this.target=clamp(p,0,1);if(chapterAt(this.target)!==this.backgroundChapter)this.updateBackdrop();this.needsRender=true;}
  setFlavour(flavour) {
    if(flavour===this.desiredFlavour)return;
    if(this.switchAnimation)this.applyFlavour(this.switchAnimation.to);
    this.desiredFlavour=flavour;this.needsRender=true;
    const citrus=flavour==='citrus';
    this.updateBackdrop(flavour);
    this.podiumGlow.color.set(citrus?'#efb17d':'#d0e89a');
    if(!this.flavour||this.reduced){this.applyFlavour(flavour);return;}
    const direction=citrus?1:-1;
    this.switchAnimation={from:this.flavour,to:flavour,started:performance.now(),hero:this.progress<.16,direction,applied:false};
    if(this.switchAnimation.hero){this.previewFlavour(this.previewBottles[direction>0?0:1],this.flavour);this.previewFlavour(this.previewBottles[direction>0?1:0],flavour);}
  }
  applyFlavour(flavour) {
    this.flavour=flavour;
    const citrus=flavour==='citrus';this.labelMaterial.map=this.labels[citrus?1:0];this.labelMaterial.needsUpdate=true;this.needsRender=true;
    const absorption=citrus?[.40,1.5,4.8]:[.16,1.05,3.6];
    this.bottleTea.uniforms.uAbsorption.value.set(...absorption);this.liquidMaterial.uniforms.uAbsorption.value.set(...absorption);
    this.stream.material.uniforms.uTint.value.set(...(citrus?[.94,.75,.43]:[1,.90,.62]));
    this.previewBottles.forEach(record=>this.previewFlavour(record,citrus?'jasmine':'citrus'));
    this.switchAnimation=null;
  }
  setServing(serving) {this.serving=serving;this.needsRender=true;}

  updateStream(time,strength) {
    const height=Math.max(.05,this.streamStart.y-this.impact.y),positions=this.stream.geometry.attributes.position,normals=this.stream.geometry.attributes.normal;
    for(let i=0;i<=this.streamSegments;i++){
      const f=i/this.streamSegments,point=pourPoint(this.streamStart,this.impact.y,this.horizontalSpeed,f,this.downwardSpeed,this.depthSpeed);
      const t=flightTime(height,this.downwardSpeed)*f,vy=-this.downwardSpeed-8.8*t;
      const xyLength=Math.hypot(this.horizontalSpeed,vy),nx=-vy/xyLength,ny=this.horizontalSpeed/xyLength;
      const speed=Math.hypot(this.horizontalSpeed,vy,this.depthSpeed);
      const bx=-this.depthSpeed*ny/speed,by=this.depthSpeed*nx/speed,bz=xyLength/speed;
      // Keep the concealed inlet steady, then introduce small travelling waves.
      const turbulence=smooth(.04,.20,f);
      const radius=flowRadius(f,height,strength,this.downwardSpeed,this.horizontalSpeed,this.depthSpeed)*(1+(Math.sin(f*42-time*19)*.045+Math.sin(f*77-time*26)*.02)*turbulence);
      const ripple=(Math.sin(f*29-time*11)*.005+Math.sin(f*61-time*19)*.0015)*Math.sin(f*Math.PI)*turbulence;
      for(let j=0;j<=this.streamSides;j++){
        const a=j/this.streamSides*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),k=i*(this.streamSides+1)+j;
        const rx=nx*ca+bx*sa,ry=ny*ca+by*sa,rz=bz*sa;
        positions.setXYZ(k,point.x+rx*radius+ripple,point.y+ry*radius,point.z+rz*radius+ripple*.4);normals.setXYZ(k,rx,ry,rz);
      }
    }positions.needsUpdate=true;normals.needsUpdate=true;
  }

  animate(now) {
    if(this.disposed)return;this.raf=requestAnimationFrame(this.animate);
    const dt=Math.min(.05,(now-(this.previousTime||now))/1000);this.previousTime=now;
    if(!this.active||document.hidden)return;
    if(this.reduced&&!this.needsRender)return;
    const time=this.reduced?0:(now-this.start)/1000;
    this.progress=this.reduced?this.target:lerp(this.progress,this.target,1-Math.exp(-dt*10));
    const story=this.progress,motion=storyMotion(story),p=motion.pour,tilt=smooth(.17,.58,p),reveal=smooth(.12,.33,p),fill=smooth(.49,.92,p),finish=smooth(.93,1,p);
    let switching=this.switchAnimation,switchProgress=switching?clamp((now-switching.started)/760,0,1):0;
    if(switching&&(switchProgress>=1||(switching.hero&&story>=.16))){this.applyFlavour(switching.to);switching=null;switchProgress=0;}
    if(switching&&!switching.hero&&switchProgress>=.5&&!switching.applied){
      const animation=switching;this.applyFlavour(animation.to);animation.applied=true;this.switchAnimation=animation;
    }
    const strength=smooth(.47,.54,p)*(1-smooth(.90,.96,p));
    const idle=this.reduced?0:Math.sin(time*.75)*.018*(1-tilt);
    const angle=lerp(-.12,1.91,tilt)-finish*.33;
    this.bottle.rotation.set(.02+this.pointer.y*.03*(1-tilt),-.06+this.pointer.x*.09*(1-tilt),angle);
    this.bottle.scale.setScalar(lerp(1.12,.78,tilt));
    const bottleY=lerp(.15,1.24,tilt)+idle;
    const height=lerp(.012,1.19,fill),level=-.746+height;
    this.glass.visible=reveal>.001;this.glass.position.y=lerp(-3.7,-1.28,reveal);
    this.impact.set(this.glass.position.x,this.glass.position.y+level,this.glass.position.z+.045);
    this.rotatedMouth.copy(this.mouth.position).multiplyScalar(this.bottle.scale.x).applyEuler(this.bottle.rotation);
    // Position the bottle from the lip and a ballistic trajectory, so every
    // intermediate scroll position naturally lands inside the glass.
    // Leave along the neck axis before gravity bends the stream downward.
    this.outflowVelocity.set(0,.92,0).applyEuler(this.bottle.rotation);
    this.horizontalSpeed=this.outflowVelocity.x;
    this.downwardSpeed=Math.max(.025,-this.outflowVelocity.y);
    this.depthSpeed=this.outflowVelocity.z;
    const mouthY=bottleY+this.rotatedMouth.y;
    const duration=flightTime(mouthY-this.impact.y,this.downwardSpeed);
    const requiredX=this.impact.x-this.horizontalSpeed*duration-this.rotatedMouth.x;
    const requiredZ=this.impact.z-this.depthSpeed*duration-this.rotatedMouth.z;
    const alignment=smooth(.17,.46,p);
    this.bottle.position.set(lerp(this.mobile?0:1.05,requiredX,alignment),bottleY,lerp(0,requiredZ,alignment));
    if(story<.69){
      const turn=switching&&!switching.hero?Math.PI*2*smooth(0,1,switchProgress)*switching.direction:0;
      this.bottle.position.set(this.mobile?motion.x*.07:motion.x,.15+idle,0);
      this.bottle.rotation.set(.02+this.pointer.y*.025,motion.yaw-.06+turn+this.pointer.x*.06,-.12+Math.sin(story*5)*.045);
      this.bottle.scale.setScalar(motion.scale);
    }
    this.bottle.visible=!(switching?.hero);
    this.previewBottles.forEach((record,i)=>{
      const side=i===0?-1:1,g=record.group;
      g.visible=motion.carousel>.001;
      let x=side*(this.mobile?2.2:3.15),z=-1.3,y=-.05,scale=.77*motion.carousel,rz=-side*.16;
      if(switching?.hero){
        const incoming=i===(switching.direction>0?1:0),t=smooth(0,1,switchProgress),distance=this.mobile?2.2:3.15;
        x=incoming?lerp(switching.direction*distance,0,t):lerp(0,-switching.direction*distance,t);
        z=incoming?lerp(-1.3,0,t):lerp(0,-1.3,t);
        y=incoming?lerp(-.05,.15,t):lerp(.15,-.05,t);
        scale=incoming?lerp(.77,.99,t):lerp(.99,.77,t);
        rz=incoming?lerp(-switching.direction*.16,-.12,t):lerp(-.12,switching.direction*.16,t);
      }
      g.position.set(x,y,z);g.scale.setScalar(Math.max(.001,scale));g.rotation.set(.02,-.06,rz);
      record.volume.material.uniforms.uFillHeight.value=y+1.43*scale;
    });
    this.podium.visible=motion.carousel>.001;this.podium.scale.setScalar(Math.max(.001,motion.carousel));
    const open=smooth(.10,.25,p);this.cap.position.y=1.915+open*.52;this.cap.position.x=-smooth(.24,.33,p)*.4;this.cap.rotation.y=open*5.5;this.cap.scale.setScalar(1-smooth(.23,.32,p));
    this.bottleTea.uniforms.uFillHeight.value=story<.69?1.56:lerp(1.56,1.30,tilt)-fill*.20;
    this.bottleTea.uniforms.uTime.value=time;this.bottleTea.uniforms.uSlosh.value=tilt*.012;
    // Keep the base at the full inner radius; only the top widens with height.
    const topRadius=reshapeTeaVolume(this.liquid.geometry,this.liquidRestPositions,height);
    this.liquid.scale.set(1,height/1.25,1);this.liquid.position.y=-.746+height/2;
    this.surface.position.y=level+.003;this.surface.scale.setScalar(topRadius/.609);
    this.meniscus.position.y=level+.004;this.meniscus.scale.setScalar(topRadius/.609);
    const surfacePosition=this.surface.geometry.attributes.position;
    for(let i=0;i<surfacePosition.count;i++){const r=Math.hypot(surfacePosition.getX(i),surfacePosition.getY(i));surfacePosition.setZ(i,(Math.sin(r*32-time*9)*.006*Math.exp(-r*3)-Math.exp(-r*r*130)*.012)*strength);}
    surfacePosition.needsUpdate=true;this.surface.geometry.computeVertexNormals();
    this.ice.visible=this.serving==='cold';
    this.cubes.forEach((cube,i)=>{const d=cube.userData,settle=smooth(.18+i*.016,.31+i*.016,p);cube.position.y=d.baseY+(1-settle)*1.65+Math.max(0,height-.42)*.68+Math.sin(time*1.8+d.phase)*.013*fill;cube.rotation.x=d.rx+(1-settle)*.8+Math.sin(time*1.5+d.phase)*.045*strength;cube.rotation.z=d.rz+Math.sin(time*1.9+d.phase)*.06*strength;});
    this.steam.visible=this.serving==='hot'&&fill>.15;
    this.steam.children.forEach(s=>{const cycle=(time*.13+s.userData.phase)%1;s.position.set(Math.sin(cycle*4+s.userData.phase)*.18,level+.18+cycle*.85,.02);s.material.opacity=Math.sin(cycle*Math.PI)*.07;s.scale.set(.22+cycle*.45,.35+cycle*.6,1);});
    this.dropletMeshes.forEach(mesh=>{mesh.visible=this.serving==='cold';});
    this.refractors.forEach(mesh=>{if(mesh.material.uniforms.uCondensation.value>0)mesh.material.uniforms.uCondensation.value=this.serving==='cold'?1:.001;});
    this.shadow.position.set(lerp(.1,-.4,reveal),lerp(-1.91,-2.14,reveal),-.45);this.shadow.scale.x=lerp(1,.65,reveal);
    this.bottle.updateMatrixWorld();this.mouth.getWorldPosition(this.streamStart);
    // Use the exact ballistic endpoint, including the lip's depth.
    const endpoint=pourPoint(this.streamStart,this.impact.y,this.horizontalSpeed,1,this.downwardSpeed,this.depthSpeed);this.impact.x=endpoint.x;this.impact.z=endpoint.z;
    const pouring=strength>.001;this.stream.visible=pouring;this.splash.visible=pouring;
    if(pouring){
      this.updateStream(time,strength);
      this.splash.children.forEach(d=>{const cycle=(time*1.7+d.userData.phase)%1,r=cycle*.14;d.position.set(this.impact.x+Math.cos(d.userData.angle)*r,this.impact.y+Math.sin(cycle*Math.PI)*.085,this.impact.z+Math.sin(d.userData.angle)*r);d.scale.set(.65*strength,(1.5-cycle)*strength,.65*strength);});
    }
    this.ripples.forEach((ring,i)=>{const cycle=(time*.95+i/4)%1,r=.035+cycle*.37;ring.position.set(this.impact.x-this.glass.position.x,level+.007,this.impact.z-this.glass.position.z);ring.scale.setScalar(r);ring.material.opacity=(1-cycle)*.16*strength;});
    this.render();
    this.needsRender=false;
  }

  render() {
    // Capture the contents over a studio backdrop. Glass samples this colour
    // buffer, so the ice stays visible through the tea and curved glass wall.
    const visibility=this.refractors.map(mesh=>mesh.visible),iceVisible=this.ice.visible,dropsVisible=this.condensation.visible;
    this.refractors.forEach(mesh=>{mesh.visible=false;});
    this.backdrop.visible=true;this.bottleVolumes.forEach(mesh=>{mesh.visible=true;});this.liquid.visible=true;
    this.ice.visible=false;this.dropletMeshes.forEach(mesh=>{mesh.visible=false;});
    if(iceVisible&&this.glass.visible){this.renderer.setRenderTarget(this.iceTarget);this.renderer.render(this.scene,this.camera);}
    this.ice.visible=iceVisible;
    this.renderer.setRenderTarget(this.refractionTarget);this.renderer.render(this.scene,this.camera);
    this.refractors.forEach((mesh,i)=>{mesh.visible=visibility[i];});
    this.backdrop.visible=false;this.bottleVolumes.forEach(mesh=>{mesh.visible=false;});this.liquid.visible=false;this.dropletMeshes.forEach(mesh=>{mesh.visible=dropsVisible;});
    this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }

  dispose() {
    this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.visibility.disconnect();
    this.host.removeEventListener('pointermove',this.onPointer);this.host.removeEventListener('pointerleave',this.onLeave);
    const geometries=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.labels.forEach(t=>t.dispose());this.textures.forEach(t=>t.dispose());this.environment.dispose();this.refractionTarget.dispose();this.iceTarget.dispose();this.renderer.dispose();this.renderer.domElement.remove();
  }
}
