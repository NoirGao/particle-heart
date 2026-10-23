import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 31;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x030008);
document.body.prepend(renderer.domElement);

// Soft circular glow texture for each particle, created locally (no extra downloads).
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = spriteCanvas.height = 64;
const spriteCtx = spriteCanvas.getContext('2d');
const gradient = spriteCtx.createRadialGradient(32, 32, 1, 32, 32, 32);
gradient.addColorStop(0, 'rgba(255,255,255,1)');
gradient.addColorStop(.17, 'rgba(255,255,255,.95)');
gradient.addColorStop(.45, 'rgba(255,255,255,.28)');
gradient.addColorStop(1, 'rgba(255,255,255,0)');
spriteCtx.fillStyle = gradient;
spriteCtx.fillRect(0, 0, 64, 64);
const sprite = new THREE.CanvasTexture(spriteCanvas);

const count = 11500;
const positions = new Float32Array(count * 3);
const targets = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const velocities = new Float32Array(count * 3);
const phases = new Float32Array(count);
const flow = new Float32Array(count);
let i = 0;
// Preserve the original volumetric implicit heart shape.
while (i < count) {
  const x = (Math.random() - .5) * 3;
  const y = (Math.random() - .5) * 3;
  const z = (Math.random() - .5) * 3;
  const a = x*x + 2.25*y*y + z*z - 1;
  if (a*a*a - x*x*z*z*z - .1125*y*y*z*z*z > 0) continue;
  const k = i*3;
  targets[k] = x*7; targets[k+1] = z*7; targets[k+2] = y*7;
  // Intro: particles fly in from an enormous nebula rather than scaling a finished heart.
  const radius = 24 + Math.random()*28;
  const az = Math.random()*Math.PI*2;
  const el = (Math.random()-.5)*Math.PI;
  positions[k] = Math.cos(az)*Math.cos(el)*radius;
  positions[k+1] = Math.sin(el)*radius;
  positions[k+2] = Math.sin(az)*Math.cos(el)*radius;
  const bright = .6 + Math.random()*.4;
  const hue = Math.random();
  colors[k] = bright;
  colors[k+1] = bright * (hue < .10 ? .75 : hue < .48 ? .12 : .35);
  colors[k+2] = bright * (hue < .10 ? 1 : hue < .48 ? .58 : 1);
  phases[i] = Math.random()*Math.PI*2;
  flow[i] = .035 + Math.random()*.09;
  i++;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
const heart = new THREE.Points(geo, new THREE.PointsMaterial({
  size: .27, map: sprite, vertexColors: true, transparent: true, opacity: .92,
  depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
}));
scene.add(heart);
// A subtle larger, transparent aura duplicates the heart without duplicating the data.
const aura = new THREE.Points(geo, new THREE.PointsMaterial({
  size: .65, map: sprite, vertexColors: true, transparent: true, opacity: .12,
  depthWrite: false, blending: THREE.AdditiveBlending
}));
scene.add(aura);

// Distant twinkling stars.
const starCount = 1600;
const starPos = new Float32Array(starCount*3);
for (let n=0;n<starCount;n++) {
  starPos[n*3] = (Math.random()-.5)*115;
  starPos[n*3+1] = (Math.random()-.5)*75;
  starPos[n*3+2] = -25-Math.random()*50;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
const stars = new THREE.Points(starGeo,new THREE.PointsMaterial({
  color: 0x9c7bc7, size: .34, map: sprite, transparent: true, opacity: .55,
  depthWrite:false, blending: THREE.AdditiveBlending
}));
scene.add(stars);

// Orbiting nebula dust (independent of the heart's rotation).
const dustCount=1800;
const dustPos=new Float32Array(dustCount*3);
const dustGeo=new THREE.BufferGeometry();
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({
  color:0xb45bff,size:.22,map:sprite,transparent:true,opacity:.53,
  depthWrite:false,blending:THREE.AdditiveBlending
}));
scene.add(dust);
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);
const ringMaterials=[];
for (let n=0;n<3;n++) {
  const rg=new THREE.BufferGeometry();
  const points=[];
  for(let j=0;j<=240;j++) {
    const a=j/240*Math.PI*2;
    points.push(new THREE.Vector3(Math.cos(a)*(12+n*1.4),Math.sin(a)*(7.6+n*.6),0));
  }
  rg.setFromPoints(points);
  const mat=new THREE.LineBasicMaterial({color:[0xff4da6,0x9c56ff,0x54baff][n],transparent:true,opacity:.17});
  const ring=new THREE.LineLoop(rg,mat);
  ring.rotation.x=.32+n*.31;
  ring.rotation.y=.55+n*.65;
  orbitGroup.add(ring);
  ringMaterials.push(mat);
}

// Radiating heartbeat shockwaves.
const pulseGroup=new THREE.Group();
scene.add(pulseGroup);
const pulses=[];
for(let n=0;n<4;n++) {
  const g=new THREE.RingGeometry(1,1.035,128);
  const m=new THREE.MeshBasicMaterial({color:n%2?0x9b65ff:0xff6ac5,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(g,m);
  pulseGroup.add(mesh);
  pulses.push({mesh,start:-100});
}
let pulseIndex=0;
function pulse(t) {const p=pulses[pulseIndex++%pulses.length];p.start=t;}

// Small falling sparks, retaining the original falling-particle idea.
const sparkCount=1400;
const sparkPos=new Float32Array(sparkCount*3);
const sparkVel=new Float32Array(sparkCount*3);
for(let n=0;n<sparkCount;n++) sparkPos[n*3+1]=-100;
const sparkGeo=new THREE.BufferGeometry();
sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));
const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({color:0xe4a0ff,size:.2,map:sprite,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));
scene.add(sparks);
let sparkCursor=0;
function emitSpark() {
  const k=(sparkCursor++%sparkCount)*3;
  sparkPos[k]=(Math.random()-.5)*9;
  sparkPos[k+1]=-3+Math.random()*3;
  sparkPos[k+2]=(Math.random()-.5)*7;
  sparkVel[k]=(Math.random()-.5)*.045;
  sparkVel[k+1]=-.015-Math.random()*.045;
  sparkVel[k+2]=(Math.random()-.5)*.04;
}

let spinning=true;
let exploded=false;
let explodeAt=-100;
let mouseX=999,mouseY=999;
const mouseWorld=new THREE.Vector3();
const raycaster=new THREE.Raycaster();
const mouseNdc=new THREE.Vector2();
const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
const clock=new THREE.Clock();
const music=document.getElementById('bgMusic');
music.volume=.55;
const musicButton=document.getElementById('musicToggle');
function updateMusicLabel(){musicButton.textContent=music.paused?'♫ PLAY MUSIC':'♫ MUSIC ON';}
function playMusic(){music.play().then(updateMusicLabel).catch(updateMusicLabel);}
playMusic();
musicButton.addEventListener('click',e=>{e.stopPropagation();if(music.paused)playMusic();else {music.pause();updateMusicLabel();}});
music.addEventListener('play',updateMusicLabel);
music.addEventListener('pause',updateMusicLabel);
window.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  if(music.paused)playMusic();
  if(clock.getElapsedTime()>2.3) explode();
});
window.addEventListener('pointermove',e=>{
  mouseX=e.clientX/innerWidth*2-1;
  mouseY=-(e.clientY/innerHeight*2-1);
});
window.addEventListener('pointerleave',()=>{mouseX=mouseY=999;});
function explode(){
  const t=clock.getElapsedTime();
  if(t-explodeAt<1.4)return;
  exploded=true;explodeAt=t;
  pulse(t);
  for(let n=0;n<count;n++) {
    const k=n*3;
    const x=positions[k],y=positions[k+1],z=positions[k+2];
    const d=Math.hypot(x,y,z)||1;
    const speed=5+Math.random()*8;
    velocities[k]+=x/d*speed;
    velocities[k+1]+=y/d*speed;
    velocities[k+2]+=z/d*speed;
  }
}
window.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();explode();}
  if(e.key.toLowerCase()==='r')spinning=!spinning;
  if(e.key.toLowerCase()==='h')pulse(clock.getElapsedTime());
  if(e.key.toLowerCase()==='m'){if(music.paused)playMusic();else music.pause();}
});

const status=document.getElementById('status');
let lastBeat=-1;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.045);
  const t=clock.elapsedTime;
  const intro=Math.min(1,Math.max(0,(t-.3)/4));
  const eased=intro*intro*(3-2*intro);
  // A paired, non-sinusoidal heartbeat (lub-dub).
  const beatPhase=t%1.65;
  const bump=(center,width)=>Math.exp(-Math.pow((beatPhase-center)/width,2));
  const beat=1+.092*bump(.16,.085)+.055*bump(.39,.095);
  const beatKey=Math.floor(t/1.65);
  if(beatKey!==lastBeat&&t>4.3){lastBeat=beatKey;pulse(t);}
  if(t<4.3)status.textContent='STARDUST // ASSEMBLING';
  else if(t-explodeAt<2.5)status.textContent='SUPERNOVA // RECONSTRUCTING';
  else status.textContent='HEARTBEAT // ACTIVE';

  if(spinning)heart.rotation.y+=dt*.22;
  heart.rotation.z=Math.sin(t*.3)*.045;
  heart.scale.setScalar(beat);
  aura.rotation.copy(heart.rotation);
  aura.scale.copy(heart.scale);
  heart.updateMatrixWorld();
  const hasMouse=Math.abs(mouseX)<1.1&&Math.abs(mouseY)<1.1;
  if(hasMouse){
    mouseNdc.set(mouseX,mouseY);
    raycaster.setFromCamera(mouseNdc,camera);
    raycaster.ray.intersectPlane(plane,mouseWorld);
  }
  const cos=Math.cos(heart.rotation.y),sin=Math.sin(heart.rotation.y);
  // Spring dynamics: flying intro, mouse interaction, explosions, automatic recovery.
  for(let n=0;n<count;n++){
    const k=n*3;
    const wave=flow[n]*Math.sin(t*(.8+n%7*.09)+phases[n]);
    const tx=targets[k]+wave;
    const ty=targets[k+1]+flow[n]*Math.cos(t*.9+phases[n]);
    const tz=targets[k+2]+wave*.5;
    const stiffness=exploded?.85:2.7;
    velocities[k]+=(tx-positions[k])*stiffness*dt;
    velocities[k+1]+=(ty-positions[k+1])*stiffness*dt;
    velocities[k+2]+=(tz-positions[k+2])*stiffness*dt;
    if(hasMouse&&intro>.7){
      const wx=positions[k]*cos+positions[k+2]*sin;
      const wy=positions[k+1];
      const dx=wx-mouseWorld.x,dy=wy-mouseWorld.y;
      const dist2=dx*dx+dy*dy;
      if(dist2<14&&dist2>.0001){
        const f=(1-dist2/14)*15*dt/Math.sqrt(dist2);
        velocities[k]+=(dx*cos)*f;
        velocities[k+1]+=dy*f;
        velocities[k+2]+=(dx*sin)*f;
      }
    }
    const damping=Math.exp(-3.2*dt);
    velocities[k]*=damping;velocities[k+1]*=damping;velocities[k+2]*=damping;
    positions[k]+=velocities[k]*dt;
    positions[k+1]+=velocities[k+1]*dt;
    positions[k+2]+=velocities[k+2]*dt;
  }
  if(exploded&&t-explodeAt>3.2)exploded=false;
  geo.attributes.position.needsUpdate=true;
  heart.material.opacity=.72+.2*Math.sin(t*2)**2;
  aura.material.opacity=.09+.055*(beat-1)/.09;
  stars.rotation.z=t*.0015;
  stars.material.opacity=.45+.12*Math.sin(t*.8);
  orbitGroup.rotation.z=t*.045;
  orbitGroup.rotation.y=t*.08;
  ringMaterials.forEach((m,n)=>m.opacity=(.09+.08*Math.sin(t*.7+n)**2)*eased);
  for(let n=0;n<dustCount;n++){
    const k=n*3;
    const angle=n*2.39996+t*(.08+(n%9)*.009);
    const radius=12+(n%73)/73*10;
    dustPos[k]=Math.cos(angle)*radius;
    dustPos[k+1]=Math.sin(angle)*radius*.57;
    dustPos[k+2]=Math.sin(angle*1.8+n)*4;
  }
  dustGeo.attributes.position.needsUpdate=true;
  dust.rotation.y=t*.07;
  for(const p of pulses){
    const age=t-p.start;
    if(age<0||age>1.35){p.mesh.material.opacity=0;continue;}
    const size=3+age*14;
    p.mesh.scale.set(size,size,1);
    p.mesh.material.opacity=(1-age/1.35)*.43;
    p.mesh.rotation.z=t*.25;
  }
  if(t>3.5)for(let n=0;n<Math.min(8,Math.round(dt*240));n++)emitSpark();
  for(let n=0;n<sparkCount;n++){
    const k=n*3;
    if(sparkPos[k+1]<-22)continue;
    sparkVel[k+1]-=dt*.9;
    sparkPos[k]+=sparkVel[k]*dt*40;
    sparkPos[k+1]+=sparkVel[k+1]*dt*40;
    sparkPos[k+2]+=sparkVel[k+2]*dt*40;
  }
  sparkGeo.attributes.position.needsUpdate=true;
  renderer.render(scene,camera);
}
animate();
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
