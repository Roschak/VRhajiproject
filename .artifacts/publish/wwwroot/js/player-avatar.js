import * as THREE from 'three';
import { createCharacter, releaseCharacter } from './hajj-character.js';
import { suitcase } from './vr/departure-scenes.js';

/** Player body follows movement in desktop views; XR hands remain controller-driven. */
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
    let facing=0,lastViewYaw=0,wasFollowing=false;
    const updater=engine.onUpdate((dt)=>{
        engine.playerPos(position);
        const dx=position.x-previous.x,dz=position.z-previous.z;
        const speed=first?0:Math.hypot(dx,dz)/Math.max(dt,.001);
        previous.copy(position);
        const jumped=teleport!==(engine.teleportSerial||0);teleport=engine.teleportSerial||0;
        const runThreshold=((engine.playerSpeed||3.2)+(engine.runSpeed||6.4))/2;
        const next=!jumped&&speed>.12&&speed<12?(speed>runThreshold?'run':'walk'):'idle';
        if(next!==motion){motion=next;character.play(next);}
        engine.camera.getWorldQuaternion(quaternion);rotation.setFromQuaternion(quaternion,'YXZ');
        root.position.set(position.x,Math.max(0,position.y-1.65),position.z);
        const followMovement=!engine.renderer.xr?.isPresenting;
        const viewTurn=THREE.MathUtils.euclideanModulo(rotation.y-lastViewYaw+Math.PI,2*Math.PI)-Math.PI;
        if(first||jumped||followMovement!==wasFollowing||!followMovement){
            facing=rotation.y+Math.PI;root.rotation.y=facing;
        }
        if(followMovement){
            if(next!=='idle')facing=Math.atan2(dx,dz);
            else if(Math.abs(viewTurn)>.0001)facing=rotation.y+Math.PI;
            const turn=THREE.MathUtils.euclideanModulo(facing-root.rotation.y+Math.PI,2*Math.PI)-Math.PI;
            root.rotation.y+=turn*(1-Math.exp(-14*Math.min(dt,.1)));
        }
        first=false;lastViewYaw=rotation.y;wasFollowing=followMovement;
        // Clip the neck/head to prevent the camera seeing inside its own face.
        plane.constant=engine.droneActive?100000:position.y-.18;
        root.visible=!engine._prayerActive;
        luggage.visible=engine.departureState?.inventory?.includes('suitcase')===true&&!engine._prayerActive;
        const yaw=root.rotation.y-Math.PI;
        luggage.position.set(position.x+Math.cos(yaw)*.52+Math.sin(yaw)*.18,Math.max(0,position.y-1.65),position.z-Math.sin(yaw)*.52+Math.cos(yaw)*.18);
        luggage.rotation.set(next==='idle'?0:.12,yaw,0);
        character.update(dt);
    });
    return {dispose(){if(disposed)return;disposed=true;updater.done=true;if(engine.applyCharacterAppearance===applyAppearance)delete engine.applyCharacterAppearance;engine.scene.remove(root);releaseCharacter(character);luggage.removeFromParent();luggage.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
