const {chromium}=require('playwright-core');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/');
  const result=await page.evaluate(async()=>{
   const THREE=await import('three');
   const {realisticTravellers}=await import('/js/vr/realistic-travellers.js');
   const scene=new THREE.Scene();scene.background=new THREE.Color(0xe2dfd3);
   const camera=new THREE.PerspectiveCamera(35,1.25,.1,100);camera.position.set(0,1.35,5.7);camera.lookAt(0,.95,0);
   scene.add(new THREE.HemisphereLight(0xffffff,0x8b8471,2.3));
   const light=new THREE.DirectionalLight(0xfff5df,2);light.position.set(-3,5,4);scene.add(light);
   const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,800);renderer.outputColorSpace=THREE.SRGBColorSpace;
   const updates=[],local={scene,camera,onUpdate:fn=>updates.push(fn),_walkableStatic:()=>true};
   const people=realisticTravellers(local,[{x:.65,z:0},{x:-.65,z:0}],{luggage:false});
   await local.travellerTemplates;await new Promise(r=>setTimeout(r,0));
   for(let i=0;i<30;i++)updates.forEach(fn=>fn(1/60,i/60));
   renderer.render(scene,camera);
   const characters=people.agents.map(a=>{const visible=[];a.model.traverseVisible(o=>{if(o.isMesh)visible.push(o.name);});return {gender:a.root.userData.gender,appearance:a.root.userData.appearance,visible};});
   const png=renderer.domElement.toDataURL();
   local.disposeCallbacks.forEach(fn=>fn());renderer.dispose();
   return {characters,png};
  });
  const man=result.characters.find(c=>c.gender==='man'),woman=result.characters.find(c=>c.gender==='woman');
  assert.ok(man.visible.includes('BeardFull')&&!man.visible.includes('BeardShort'));
  assert.ok(man.visible.some(n=>n.startsWith('Ihram_Rida_Tawaf'))&&!man.visible.some(n=>n.startsWith('Ihram_Rida_Covered')));
  assert.ok(woman.visible.some(n=>n.startsWith('Robe_Dress'))&&woman.visible.includes('Hijab_Gamis_Drape'));
  assert.ok(!woman.visible.some(n=>/^(Abaya|Khimar|Tunic)/.test(n)));
  fs.mkdirSync('artifacts/npc-reference',{recursive:true});
  fs.writeFileSync('artifacts/npc-reference/pair.png',Buffer.from(result.png.split(',')[1],'base64'));
  console.log('PASS: shared NPC reference outfits, beard, head covering and skin tones.',result.characters.map(c=>c.appearance));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
