const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://localhost:5101')+'/');
  const result=await page.evaluate(async()=>{
   const {sanitize,SKIN_TONES}=await import('/js/game-preferences.js');
   const {createCharacter,releaseCharacter}=await import('/js/hajj-character.js');
   const {appearanceAtMission}=await import('/js/character-ritual.js');
   const THREE=await import('three');
   const migrated=sanitize({gender:'woman',outfit:'ihram',headwear:'none',clothingColor:'#ffff00',hairColor:'#ff0000',skinTone:'#00ff00'});
   const legacy=sanitize({name:'Pilihan lama',gender:'woman',outfit:'muslim',beardStyle:'full',skinTone:SKIN_TONES[4],volume:.3});
   const assets=[];
   for(const gender of ['man','woman']){
    const c=await createCharacter({gender});const clips=c.clips.map(x=>x.name);
    const snapshots=[];
    for(const outfit of gender==='man'?['robe','ihram']:['robe','abaya']){
     c.apply({gender,outfit,beardStyle:'full',skinTone:SKIN_TONES[3]});
     const visible=[];c.model.traverse(o=>{if(o.visible&&/^(Robe|Ihram|Tunic|Abaya|Hijab|Khimar|Beard|Skin_IhramBody)/.test(o.name))visible.push(o.name)});
     snapshots.push({outfit,visible,appearance:c.root.userData.appearance});
    }
    const foot=c.model.getObjectByName('Bip01_L_Foot')||c.model.getObjectByName('Bip01 L Foot');
    const motions=[];
    for(const motion of ['idle','walk','run']){
     c.play(motion);const positions=[];
     for(let i=0;i<40;i++){c.update(.04);c.root.updateMatrixWorld(true);const p=foot.getWorldPosition(new THREE.Vector3());positions.push(p.toArray());}
     const ranges=[0,1,2].map(axis=>Math.max(...positions.map(p=>p[axis]))-Math.min(...positions.map(p=>p[axis])));
     motions.push({motion,ranges});
    }
    c.apply({gender,outfit:'ihram'},appearanceAtMission(1));const initial={...c.root.userData.appearance};
    c.apply({gender,outfit:'ihram'},appearanceAtMission(4));const during={...c.root.userData.appearance};
    const coveredRida=c.model.getObjectByName('Ihram_Rida_Covered')?.visible;
    const tawafRida=c.model.getObjectByName('Ihram_Rida_Tawaf')?.visible;
    const coveredSkin={rightArm:c.model.getObjectByName('Skin_IhramBody_RightArmTawaf')?.visible,torso:c.model.getObjectByName('Skin_IhramBody_TorsoCovered')?.visible,referenceTorso:c.model.getObjectByName('Skin_IhramBody_TorsoTawaf')?.visible};
    c.apply({gender,outfit:'ihram'},appearanceAtMission(10));const after={...c.root.userData.appearance};
    assets.push({gender,clips,snapshots,motions,initial,during,after,coveredRida,tawafRida,coveredSkin});releaseCharacter(c);
   }
   const {runMission}=await import('/js/vr/journey-missions.js');
   const events=[];
   for(const mission of [3,7]){
    const engine={characterAppearance:appearanceAtMission(mission),setEnvironment(){},applyCharacterAppearance(s){events.push({mission,...s})}};
    const c={engine,world:{ensure:()=>({refs:{}})},go:async()=>{},say:async()=>{},touch:async()=>{},confirm:async()=>{},travel:async()=>{},sai:async()=>{},stones:async()=>{}};
    await runMission(mission,c);
   }
   const umrahAppearance=[1,2,4,5].map(n=>{const a=appearanceAtMission(n,'umrah');return [n,a.ihram,a.shaved]});
   return {migrated,legacy,assets,events,umrahAppearance};
  });
  assert.equal(result.migrated.outfit,'robe');assert.equal(result.migrated.skinTone,'#b9825b');
  assert.equal(result.legacy.outfit,'robe');assert.equal(result.legacy.beardStyle,undefined);
  assert.equal(result.legacy.name,'Pilihan lama');assert.equal(result.legacy.skinTone,'#70462f');assert.equal(result.legacy.volume,.3);
  for(const key of ['headwear','clothingColor','hairColor','hairStyle','scarfColor'])assert.equal(key in result.migrated,false);
  for(const asset of result.assets){
   for(const name of ['idle','walk','run'])assert.ok(asset.clips.some(x=>x.includes(name)),`${asset.gender}: missing ${name}`);
   for(const {motion,ranges} of asset.motions){assert.ok(ranges.every(Number.isFinite));assert.ok(Math.max(...ranges)<2,`${asset.gender} ${motion} jumps/drifts`);if(motion!=='idle')assert.ok(Math.max(...ranges)>.1,`${motion} is static`)}
   for(const s of asset.snapshots){
    const prefix={robe:'Robe',ihram:'Ihram',abaya:'Abaya'}[s.outfit];assert.ok(s.visible.some(n=>n.startsWith(prefix)));
    assert.ok(!s.visible.some(n=>n.startsWith('Beard')),'Additional beards stay hidden, including legacy preferences');
    for(const other of ['Robe','Ihram','Tunic','Abaya'].filter(x=>x!==prefix))assert.ok(!s.visible.some(n=>n.startsWith(other)),`${s.outfit}: overlaps ${other}`);
    if(asset.gender==='woman'){
     const headwear=s.visible.filter(n=>/^(Hijab|Khimar)/.test(n));
     assert.ok(headwear.length>0,'Female head covering remains visible');
     const expected=s.outfit==='abaya'?/^Khimar/:s.outfit==='robe'?/^Hijab_Gamis/:/^Hijab(?!_Gamis)/;
     assert.ok(headwear.every(n=>expected.test(n)),`${s.outfit}: overlapping or wrong head covering: ${headwear}`);
     assert.ok(!s.visible.some(n=>n.startsWith('Skin_IhramBody')));
    }
   }
   if(asset.gender==='man'){assert.equal(asset.initial.outfit,'robe');assert.equal(asset.during.outfit,'ihram');assert.equal(asset.during.shaved,false);assert.equal(asset.after.outfit,'robe');assert.equal(asset.after.shaved,true)}
   if(asset.gender==='man'){
    const preview=asset.snapshots.find(s=>s.outfit==='ihram');
    assert.ok(preview.visible.includes('Ihram_Rida_Tawaf'));assert.ok(!preview.visible.includes('Ihram_Rida_Covered'));
    assert.equal(asset.coveredRida,true);assert.equal(asset.tawafRida,false);
    assert.ok(preview.visible.includes('Skin_IhramBody_RightArmTawaf'));
    assert.ok(preview.visible.includes('Skin_IhramBody_TorsoTawaf'));
    assert.ok(!preview.visible.includes('Skin_IhramBody_TorsoCovered'));
    assert.deepEqual(asset.coveredSkin,{rightArm:false,torso:true,referenceTorso:false});
    assert.ok(!asset.snapshots.find(s=>s.outfit==='robe').visible.some(n=>n.startsWith('Skin_IhramBody')));
   }
  }
  assert.deepEqual(result.events.map(e=>[e.mission,e.ihram,e.shaved]),[[3,true,false],[7,false,true]]);
  assert.deepEqual(result.umrahAppearance,[[1,false,false],[2,true,false],[4,true,false],[5,false,true]]);
  assert.deepEqual(errors,[]);console.log('PASS: preference migration, all wardrobes, skin swatches, rigged locomotion, ritual transitions and resume appearance');
  console.log(JSON.stringify(result.assets.map(a=>({gender:a.gender,motions:a.motions})),null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
