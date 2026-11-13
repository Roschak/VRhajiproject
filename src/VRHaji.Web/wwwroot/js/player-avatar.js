import {createActivityRig,activityFor,wantsLuggage} from './avatar-activities.js';
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
    const rig=createActivityRig(character);
    let first=true,disposed=false,motion='idle',teleport=engine.teleportSerial||0;
    let facing=0,lastViewYaw=0,wasFollowing=false;
    const updater=engine.onUpdate((dt)=>{
        engine.playerPos(position);
        const dx=position.x-previous.x,dz=position.z-previous.z;
        const speed=first?0:Math.hypot(dx,dz)/Math.max(dt,.001);
        previous.copy(position);
        const jumped=teleport!==(engine.teleportSerial||0);teleport=engine.teleportSerial||0;
        const runThreshold=((engine.playerSpeed||3.2)+(engine.runSpeed||6.4))/2;
        const pose=activityFor(engine),seated=!!(engine.vehicleSeat||engine.passengerSeat);
        const next=!seated&&!pose&&!jumped&&speed>.12&&speed<12?(speed>runThreshold?'run':'walk'):'idle';
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
        root.visible=engine.droneActive||(!seated&&!pose&&!engine._prayerActive);
        luggage.visible=wantsLuggage(engine);
        rig.restore();character.update(dt);
        root.userData.motion=pose||(seated?'sit':luggage.visible?'carry':motion);
        if(engine.vehicleSeat){
            const seat=engine.vehicleSeat;
            root.position.copy(seat.car.localToWorld(new THREE.Vector3(seat.x,seat.bodyY,seat.z)));
            root.rotation.y=seat.car.rotation.y+Math.PI;
        }else if(engine.passengerSeat){
            const seat=engine.passengerSeat;root.position.set(seat.x,seat.bodyY,seat.z);root.rotation.y=seat.yaw;
        }else if(pose){
            const floor=engine.getGroundHeight(position.x,position.z);
            root.position.y=floor+(['sit-ground','salah-sit','sujud'].includes(pose)?-.5:pose==='haircut'?-.40:0);
        }
        rig.apply({pose,seated:seated||pose==='haircut',car:!!engine.vehicleSeat,carry:luggage.visible,phase:engine.avatarGesture?(performance.now()-engine.avatarGesture.start)/(engine.avatarGesture.until-engine.avatarGesture.start):.5});
        if(luggage.visible){
            luggage.scale.setScalar(.72);luggage.rotation.set(0,root.rotation.y-Math.PI,0);
            const hand=rig.handWorld();
            if(hand){
                const grip=new THREE.Vector3(0,1.08*.72,0).applyEuler(luggage.rotation);
                luggage.position.copy(hand).sub(grip);
            }
        }

    });
    return {dispose(){if(disposed)return;disposed=true;updater.done=true;if(engine.applyCharacterAppearance===applyAppearance)delete engine.applyCharacterAppearance;engine.scene.remove(root);releaseCharacter(character);luggage.removeFromParent();luggage.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
