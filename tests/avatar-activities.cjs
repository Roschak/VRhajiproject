const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/');
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{createCharacter,releaseCharacter}=await import('/js/hajj-character.js');
  const {createActivityRig,beginActivity,enterSeat,leaveSeat}=await import('/js/avatar-activities.js');
  const {attachPlayerAvatar}=await import('/js/player-avatar.js');const {JourneyUI}=await import('/js/vr/journey-ui.js');const {MissionContext}=await import('/js/vr/journey-missions.js');
  const check=(x,message)=>{if(!x)throw Error(message);};const rigs=[];
  for(const gender of ['man','woman']){
   const c=await createCharacter({gender,outfit:gender==='man'?'robe':'abaya'});c.update(1);const rig=createActivityRig(c);c.root.updateMatrixWorld(true);
   const bone=name=>c.model.getObjectByName(name),position=name=>bone(name).getWorldPosition(new T.Vector3());
   const foot=position('Bip01_L_Foot'),head=position('Bip01_Head');rig.apply({pose:'ruku'});
   check(position('Bip01_Head').y<head.y-.15,gender+' ruku must lower head');check(position('Bip01_L_Foot').distanceTo(foot)<.001,gender+' ruku moved feet');
   rig.restore();c.root.updateMatrixWorld(true);check(position('Bip01_Head').distanceTo(head)<.001,gender+' pose restore');
   rig.apply({pose:'dua'});check(rig.handWorld().y>1.2,gender+' dua hands not raised');rig.restore();
   rig.apply({pose:'sit',seated:true});check(position('Bip01_L_Calf').z>position('Bip01_L_Thigh').z+.15,gender+' seated knees not forward');rig.restore();
   rigs.push(gender);releaseCharacter(c);
  }
  const updates=[],e={scene:new T.Scene(),camera:new T.PerspectiveCamera(),renderer:{xr:{isPresenting:false}},onUpdate:fn=>{const u={fn};updates.push(u);return u;},playerPos(out=new T.Vector3()){return out.copy(this.camera.position);},playerYaw:()=>0,getGroundHeight:()=>0,spawn(x,z,yaw=0,y=1.7){this.teleportSerial=(this.teleportSerial||0)+1;this.camera.position.set(x,y,z);},narrator:{say:async()=>{},stop(){}},setUiOpen(){},setObjective(){},subtitle(){},addInteractable(){},removeInteractable(){},departureState:{inventory:['suitcase']},prayerContext:'home',droneActive:true};
  e.spawn(0,0);const life=new AbortController(),avatar=await attachPlayerAvatar(e,{gender:'man',outfit:'robe'},life.signal);updates.forEach(u=>u.fn(1));
  const root=e.scene.getObjectByName('JemaahAvatar'),bag=e.scene.getObjectByName('player-carried-suitcase');root.updateMatrixWorld(true);bag.updateMatrixWorld(true);
  const hand=root.getObjectByName('Bip01_R_Hand').getWorldPosition(new T.Vector3());check(bag.visible&&bag.localToWorld(new T.Vector3(0,1.08,0)).distanceTo(hand)<.001,'Suitcase grip must touch hand');
  enterSeat(e,{x:0,y:1.25,z:0,yaw:-90,kind:'plane'});updates.forEach(u=>u.fn(.1));check(root.userData.motion==='sit'&&!bag.visible,'Plane seated pose/luggage');
  const host=document.createElement('div');host.id='vr-root';document.body.append(host);const ui=new JourneyUI(e);
  const promise=ui.choose('Test','Test',undefined,{pose:'dua'});updates.filter(u=>!u.done).forEach(u=>u.fn(.1));check(e.avatarActivity.pose==='dua'&&root.userData.motion==='dua'&&e.passengerSeat,'Seated dua composition');ui.close();await promise;check(e.locomotionLocked&&!e.avatarActivity,'Dialog must retain seat lock and clear gesture');leaveSeat(e);e.spawn(0,0);updates.filter(u=>!u.done).forEach(u=>u.fn(.1));check(!e.passengerSeat&&bag.visible,'Exit restores luggage');
  const end=beginActivity(e,'sujud');check(e.camera.position.y<.4,'Pose eye height');end();check(e.camera.position.y===1.7&&!e.avatarActivity,'Pose cleanup restores camera');
  const a=beginActivity(e,'dua'),b=beginActivity(e,'qiyam');a();b();check(!e.avatarActivity,'Closed nested activity must not be resurrected');
  const poses=[],context=new MissionContext(e,{}, {choose:async(a,b,c,o)=>{poses.push(o.pose);}},new AbortController().signal);await context.salah();check(poses.filter(p=>p==='sujud').length===4&&poses.filter(p=>p==='ruku').length===2&&poses.at(-1)==='salah-sit','Two-rakah sequence');
  const aborted=new AbortController();aborted.abort(new DOMException('Closed','AbortError'));const canceled=new MissionContext(e,{},ui,aborted.signal);let rejected=false;try{await canceled.haircut(new T.Group(),'Test','Test');}catch(error){rejected=error.name==='AbortError';}check(rejected&&!e.passengerSeat,'Canceled chair action releases seat');
  avatar.dispose();host.remove();return {rigs,luggage:'hand attached',seat:'plane + dua + exit',salahSteps:poses.length};
 });console.log(result);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
