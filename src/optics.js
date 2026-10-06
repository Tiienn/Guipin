import * as THREE from 'three';

const vertex = /* glsl */`
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vLocal;
  varying vec3 vSurfaceNormal;
  void main() {
    vLocal = position;
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vSurfaceNormal=normalize(mat3(modelMatrix)*normal);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      mat3 im = mat3(instanceMatrix);
      n /= vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));
      n = im * n;
      vSurfaceNormal=normalize(mat3(modelMatrix)*im[2]);
    #endif
    vWorldPosition = (modelMatrix * p).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * n);
    vViewNormal = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;

const studio = /* glsl */`
  vec3 studioReflection(vec3 ray) {
    vec3 c = mix(vec3(.012, .018, .016), vec3(.20, .23, .22), smoothstep(-.7, 1., ray.y));
    float vertical = smoothstep(-.88,-.62,ray.y)*(1.-smoothstep(.72,.94,ray.y));
    float front = smoothstep(.08,.5,ray.z);
    float left = exp(-pow((ray.x+.53)*14.,4.))*vertical*front;
    float right = exp(-pow((ray.x-.72)*26.,4.))*vertical*front;
    float broad = exp(-pow((ray.x+.38)*4.5,4.))*vertical*front;
    float top = smoothstep(.84,.97,ray.y)*.8;
    return c + vec3(7.0,7.2,7.2)*left + vec3(5.1,4.9,4.5)*right + vec3(.45)*broad + vec3(top);
  }
`;

export function refractiveGlass(texture, resolution, thickness = .018, strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uScene: {value:texture}, uResolution:{value:resolution}, uThickness:{value:thickness}, uStrength:{value:strength}, uTint:{value:new THREE.Vector3(1,1,1)}, uFrost:{value:0}, uBead:{value:0}, uCondensation:{value:0}, uBase:{value:0}, uAmber:{value:0}, uBottle:{value:0} },
    vertexShader:vertex,
    fragmentShader:/* glsl */`
      uniform sampler2D uScene;
      uniform vec2 uResolution;
      uniform float uThickness;
      uniform float uStrength;
      uniform vec3 uTint;
      uniform float uFrost;
      uniform float uBead;
      uniform float uCondensation;
      uniform float uBase;
      uniform float uAmber;
      uniform float uBottle;
      varying vec3 vSurfaceNormal;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewNormal;
      varying vec3 vLocal;
      ${studio}
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(cameraPosition - vWorldPosition);
        if(uBead>.5 && dot(vSurfaceNormal,v)<.03) discard;
        float dew = noise(vLocal*135.);
        n = normalize(n + vec3(dew-.5,noise(vLocal.zxy*135.)-.5,noise(vLocal.yzx*135.)-.5)*uCondensation*.025);
        float facing = abs(dot(n, v));
        float f0 = mix(.035,.020,uBead);
        float fresnel = f0 + (1.-f0) * pow(1. - facing, 5.);
        vec2 uv = gl_FragCoord.xy / uResolution;
        float base = uBase*(1.-smoothstep(-.76,-.67,vLocal.y));
        vec2 offset = normalize(vViewNormal).xy * uThickness * (.35 + .65 * (1. - facing))*(1.+base*.65);
        vec3 transmitted;
        // A small dispersion offset gives the bevels a natural optical edge.
        transmitted.r = texture2D(uScene, clamp(uv - offset * 1.016, .001, .999)).r;
        transmitted.g = texture2D(uScene, clamp(uv - offset, .001, .999)).g;
        transmitted.b = texture2D(uScene, clamp(uv - offset * .984, .001, .999)).b;
        vec3 ray=reflect(-v,n);
        vec3 reflected = studioReflection(ray);
        float softbox=pow(max(0.,dot(ray,normalize(vec3(-.7,.8,1.3)))),30.);
        reflected+=vec3(17.,15.,12.)*softbox*uBottle;
        float reflectionWeight=min(.94,fresnel*uStrength);
        vec3 specular=reflected*reflectionWeight;
        vec3 colour = transmitted*uTint*(1.-reflectionWeight)+specular/(1.+specular);
        // Dense air trapped in the centre, surrounded by a clear, melted edge.
        float cloud = exp(-dot(vLocal*5.2,vLocal*5.2))*(.35+.65*noise(vLocal*27.));
        float fracture = pow(1.-abs(sin(vLocal.x*24.+vLocal.y*13.+noise(vLocal*14.)*2.)),65.);
        colour = mix(colour, vec3(.70,.78,.79), uFrost*(cloud*.82+fracture*.10));
        colour *= 1.-base*.09*(1.-facing);
        colour += vec3(.29,.14,.025)*uAmber*(.4+.6*facing);
        vec3 beadHalf=normalize(v+normalize(vec3(-.7,1.,1.4)));
        float beadLight=pow(max(0.,dot(n,beadHalf)),95.);
        colour+=vec3(.85)*beadLight*uBead;
        // Clear beads refract the print beneath them; only their edges catch light.
        float alpha=mix(1.,.80+fresnel*.18,uBead);
        gl_FragColor = vec4(colour, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent:true, depthWrite:false, side:THREE.FrontSide,
  });
}

export function teaVolume(absorption, radius) {
  return new THREE.ShaderMaterial({
    uniforms: { uAbsorption:{value:new THREE.Vector3(...absorption)}, uRadius:{value:radius}, uFillHeight:{value:100}, uTime:{value:0}, uSlosh:{value:0} },
    vertexShader:vertex,
    fragmentShader:/* glsl */`
      uniform vec3 uAbsorption;
      uniform float uRadius;
      uniform float uFillHeight;
      uniform float uTime;
      uniform float uSlosh;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewNormal;
      varying vec3 vLocal;
      void main() {
        float wave = sin(vWorldPosition.x * 8. + uTime * 3.) * uSlosh;
        if(vWorldPosition.y > uFillHeight + wave) discard;
        float facing = abs(dot(normalize(vWorldNormal), normalize(cameraPosition-vWorldPosition)));
        float section=min(uRadius,length(vLocal.xz));
        float depth=clamp((uFillHeight-vWorldPosition.y)*.17,0.,.4);
        float path = .08 + 2. * section * pow(facing, .8) + depth;
        float caustic=1.+.018*sin(vWorldPosition.x*17.+uTime*.8)*sin(vWorldPosition.y*13.-uTime*.6);
        vec3 transmission = exp(-uAbsorption * path)*caustic;
        gl_FragColor = vec4(transmission, 1.);
      }
    `,
    transparent:true, depthWrite:false, blending:THREE.MultiplyBlending, premultipliedAlpha:true, toneMapped:false,
  });
}

export function iceMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader:vertex,
    fragmentShader:/* glsl */`
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewNormal;
      varying vec3 vLocal;
      ${studio}
      float hash(vec3 p) {return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      void main() {
        vec3 n=normalize(vWorldNormal), v=normalize(cameraPosition-vWorldPosition);
        float fresnel=.026+.974*pow(1.-abs(dot(n,v)),4.);
        float vein=pow(1.-abs(sin(dot(vLocal,vec3(32.,14.,22.))+sin(vLocal.y*41.)*.6)),36.);
        float cloud=exp(-dot(vLocal*5.,vLocal*5.))* .20;
        float grain=hash(floor(vLocal*180.))*.025;
        vec3 reflection=studioReflection(reflect(-v,n));
        float alpha=clamp(.075+fresnel*.75+vein*.12+cloud+grain,0.,.8);
        vec3 colour=mix(vec3(.78,.91,.92),reflection,clamp(fresnel+.17,0.,1.));
        gl_FragColor=vec4(colour+vein*.10,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
  });
}

export function backdropMaterial() {
  return new THREE.ShaderMaterial({
    uniforms:{uTexture:{value:null},uRect:{value:new THREE.Vector4(0,0,1,1)}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy, .99999, 1.);}`,
    fragmentShader:`uniform sampler2D uTexture;uniform vec4 uRect;varying vec2 vUv;void main(){vec2 uv=vec2(uRect.x+vUv.x*uRect.z,1.-uRect.y-uRect.w+vUv.y*uRect.w);gl_FragColor=texture2D(uTexture,clamp(uv,0.,1.));}`,
    depthWrite:false,depthTest:false,toneMapped:false,
  });
}
