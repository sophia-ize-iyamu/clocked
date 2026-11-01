// Visuals for the interrogation screen: a voice-reactive 3D orb (the interviewer) and a polygraph trace.
// The orb follows the technique ElevenLabs uses in its own UI kit: a Three.js sphere displaced by
// simplex noise, with a fresnel rim, driven by the call's live output volume.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.min.js";

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERTEX = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uHeat;
varying float vDisp; varying vec3 vNormal; varying vec3 vView;
${NOISE}
void main(){
  float n1 = snoise(normal * (1.1 + uHeat * 1.2) + vec3(uTime * 0.3));
  float n2 = snoise(normal * 3.2 - vec3(uTime * 0.6));
  float amp = 0.05 + uLevel * 0.24 + uHeat * 0.09;
  float d = n1 * amp + n2 * amp * 0.25;
  vDisp = d;
  vec4 mv = modelViewMatrix * vec4(position + normal * d, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
uniform float uHeat; uniform float uLevel; uniform float uPass;
varying float vDisp; varying vec3 vNormal; varying vec3 vView;
void main(){
  vec3 calm = vec3(0.37, 0.91, 1.0);
  vec3 sus = vec3(1.0, 0.69, 0.13);
  vec3 hot = vec3(1.0, 0.18, 0.33);
  vec3 pass = vec3(0.22, 1.0, 0.53);
  vec3 base = mix(calm, sus, smoothstep(0.0, 0.5, uHeat));
  base = mix(base, hot, smoothstep(0.5, 0.8, uHeat));
  base = mix(base, pass, uPass);
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.3);
  vec3 col = base * 0.1 + base * fres * (1.3 + uLevel) + vec3(1.0) * pow(fres, 8.0) * 0.3;
  col += base * max(vDisp, 0.0) * 1.8;
  gl_FragColor = vec4(col, 0.95);
}`;

const HEX = { calm: "#5ee7ff", sus: "#ffb020", hot: "#ff2d55", pass: "#39ff88" };
export const heatColor = (heat) => (heat >= 0.6 ? HEX.hot : heat >= 0.3 ? HEX.sus : HEX.calm);

export function createOrb(canvas, getLevel) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.classList.add("noWebgl");
    return { setHeat() {}, setPass() {}, pulse() {}, pause() {}, resume() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.z = 3.6;

  const uniforms = {
    uTime: { value: 0 }, uLevel: { value: 0 }, uHeat: { value: 0 }, uPass: { value: 0 },
  };
  const geometry = new THREE.IcosahedronGeometry(1, 64);
  const orb = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true }),
  );
  scene.add(orb);

  // A loose shell of points around the orb: the "aura".
  const auraMaterial = new THREE.PointsMaterial({
    size: 0.014, color: HEX.calm, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const aura = new THREE.Points(new THREE.IcosahedronGeometry(1.32, 12), auraMaterial);
  scene.add(aura);

  const size = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(canvas);
  size();

  let heat = 0;
  let level = 0;
  let pulseUntil = 0;
  let raf = 0;
  let running = true;
  const clock = new THREE.Clock();
  const tick = () => {
    if (!running) return;
    const t = clock.getElapsedTime();
    const target = Math.min(1, getLevel() * 1.6);
    level += (target - level) * 0.18;
    const pulse = t < pulseUntil ? (pulseUntil - t) * 1.5 : 0;
    uniforms.uTime.value = t;
    uniforms.uLevel.value = level + pulse;
    uniforms.uHeat.value += (heat - uniforms.uHeat.value) * 0.1;
    orb.rotation.y = t * 0.12;
    aura.rotation.y = -t * 0.08;
    aura.rotation.x = t * 0.05;
    aura.scale.setScalar(1 + level * 0.18 + Math.sin(t * 1.4) * 0.015);
    auraMaterial.color.set(uniforms.uPass.value > 0.5 ? HEX.pass : heatColor(uniforms.uHeat.value));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  return {
    setHeat(v) { heat = Math.max(0, Math.min(1, v)); },
    setPass(on) { uniforms.uPass.value = on ? 1 : 0; },
    pulse() { pulseUntil = clock.getElapsedTime() + 0.5; },
    // Rendering stops whenever the orb is off screen, so it costs no GPU time between rounds.
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; tick(); } },
  };
}

// Polygraph: a pen trace of your voice that scrolls left, with red marks where the panel logged a bluff.
export function createPolygraph(canvas, getLevel, getHeat) {
  const ctx = canvas.getContext("2d");
  const samples = [];
  let phase = 0;
  let raf = 0;
  let running = false;
  let marks = 0;
  const STEP = 2;

  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let y = h / 4; y < h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const level = Math.min(1, getLevel() * 2.2);
    phase += 0.32 + level * 0.9;
    const amp = 2 + level * h * 0.42 + Math.random() * 1.5;
    samples.push({ y: Math.sin(phase) * amp + Math.sin(phase * 0.37) * amp * 0.3, mark: null });
    const max = Math.ceil(w / STEP) + 2;
    while (samples.length > max) samples.shift();

    const mid = h / 2;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = w - (samples.length - 1 - i) * STEP;
      if (i === 0) ctx.moveTo(x, mid + s.y);
      else ctx.lineTo(x, mid + s.y);
    });
    ctx.strokeStyle = heatColor(getHeat());
    ctx.lineWidth = 1.6;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    samples.forEach((s, i) => {
      if (!s.mark) return;
      const x = w - (samples.length - 1 - i) * STEP;
      ctx.strokeStyle = s.mark.color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, h - 4); ctx.stroke();
      ctx.setLineDash([]);
      // Labels sit left of the mark: new marks start at the right edge and scroll left.
      ctx.fillStyle = s.mark.color;
      ctx.textAlign = "right";
      ctx.fillText(s.mark.text, x - 6, 14 + s.mark.row * 14);
      ctx.textAlign = "left";
    });

    if (running) raf = requestAnimationFrame(draw);
  };

  return {
    start() { if (!running) { running = true; samples.length = 0; draw(); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    mark(text, delta) {
      const last = samples[samples.length - 1];
      if (last) last.mark = { row: marks++ % 3, text: `${delta > 0 ? "+" : ""}${delta} ${text}`.slice(0, 42), color: delta > 0 ? HEX.hot : HEX.pass };
    },
  };
}
