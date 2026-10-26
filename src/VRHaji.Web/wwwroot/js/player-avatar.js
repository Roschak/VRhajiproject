import * as THREE from 'three';
import { createCharacter, releaseCharacter } from './hajj-character.js';
import { suitcase } from './vr/departure-scenes.js';

/** First-person body. XR controllers continue to represent the tracked hands. */
export async function attachPlayerAvatar(engine, preferences, signal) {
    const character=await createCharacter(preferences);
    if(signal.aborted){releaseCharacter(character);return null;}
    const root=character.root;
    engine.scene.add(root);
    const luggage=suitcase();engine.scene.add(luggage);luggage.name='player-carried-suitcase';
    const applyAppearance = appearance => character.apply(preferences, appearance);
    engine.applyCharacterAppearance = applyAppearance;
    applyAppearance(engine.characterAppearance);
    engine.renderer.localClippingEnabled=true;
    const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
    character.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.clippingPlanes=[plane];});
    const previous=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Euler(0,0,0,'YXZ'),quaternion=new THREE.Quaternion();
    let first=true,disposed=false,motion='idle',teleport=engine.teleportSerial||0;
    const updater=engine.onUpdate((dt)=>{
        engine.playerPos(position);
        const speed=first?0:Math.hypot(position.x-previous.x,position.z-previous.z)/Math.max(dt,.001);
        first=false;previous.copy(position);
        const jumped=teleport!==(engine.teleportSerial||0);teleport=engine.teleportSerial||0;
        const runThreshold=((engine.playerSpeed||3.2)+(engine.runSpeed||6.4))/2;
        const next=!jumped&&speed>.12&&speed<12?(speed>runThreshold?'run':'walk'):'idle';
        if(next!==motion){motion=next;character.play(next);}
        engine.camera.getWorldQuaternion(quaternion);rotation.setFromQuaternion(quaternion,'YXZ');
        root.position.set(position.x,Math.max(0,position.y-1.65),position.z);
        root.rotation.y=rotation.y+Math.PI;
        // Clip the neck/head to prevent the camera seeing inside its own face.
        plane.constant=position.y-.18;
        root.visible=!engine._prayerActive;
        luggage.visible=engine.departureState?.inventory?.includes('suitcase')===true&&!engine._prayerActive;
        const yaw=rotation.y;
        luggage.position.set(position.x+Math.cos(yaw)*.52+Math.sin(yaw)*.18,Math.max(0,position.y-1.65),position.z-Math.sin(yaw)*.52+Math.cos(yaw)*.18);
        luggage.rotation.set(next==='idle'?0:.12,yaw,0);
        character.update(dt);
    });
    return {dispose(){if(disposed)return;disposed=true;updater.done=true;if(engine.applyCharacterAppearance===applyAppearance)delete engine.applyCharacterAppearance;engine.scene.remove(root);releaseCharacter(character);luggage.removeFromParent();luggage.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
