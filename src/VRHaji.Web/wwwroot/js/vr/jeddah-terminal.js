import * as THREE from 'three';

// Reference-inspired terminal shell; repeated roof members share one draw call.
export function decorateJeddah(engine,root,{box,sign,material}) {
    const white=material(0xe0e7ee),steel=material(0x9caebf,{metalness:.5}),blue=material(0x2632b9,{emissive:0x3022ff,emissiveIntensity:1.2});
    const members=[];
    const beam=(a,b,r=.055)=>members.push({a:new THREE.Vector3(...a),b:new THREE.Vector3(...b),r});
    const height=x=>14+3*Math.cos(x/45*Math.PI/2);
    for(let x=-44;x<44;x+=4){
        const y=height(x);
        box(root,[3.9,.12,60],[x,y,0],Math.abs(x)<15?blue:white);
        box(root,[.12,.12,60],[x,y-.25,0],material(0xffebc3,{emissive:0xffd792,emissiveIntensity:.8}));
        for(let z=-30;z<30;z+=4){
            beam([x,y-.3,z],[x+4,height(x+4)-.3,z+4]);
            beam([x+4,height(x+4)-.3,z],[x,y-.3,z+4]);
            beam([x,y-.3,z],[x+4,height(x+4)-.3,z]);
        }
    }
    for(const x of [-40,18])for(const z of [-27,3,27]){
        beam([x,0,z],[x,10,z],.22);
        for(const dx of [-4,4])beam([x,9,z],[x+dx,height(x+dx)-.4,z],.15);
        engine.addBlocker(x-.3,z-.3,x+.3,z+.3);
    }
    const truss=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6),steel,members.length);
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
    members.forEach(({a,b,r},i)=>{const d=b.clone().sub(a);q.setFromUnitVectors(up,d.clone().normalize());matrix.compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(r,d.length(),r));truss.setMatrixAt(i,matrix);});root.add(truss);
    // Grey triangular marble inlays, matching the supplied concourse photographs.
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,2,0,0,2,0,2],3));geo.computeVertexNormals();
    const inlays=new THREE.InstancedMesh(geo,material(0x71808e,{side:THREE.DoubleSide}),240);let index=0;
    for(let x=-40;x<40;x+=4)for(let z=-22;z<26;z+=4){matrix.makeTranslation(x,.008,z);inlays.setMatrixAt(index++,matrix);}root.add(inlays);
    sign(root,'JEDDAH / KING ABDULAZIZ INTERNATIONAL',[27,1.2,.12],[0,11,-29.5],'#132e59','#ffffff');
    sign(root,'A / CHECK-IN',[5,1.5,.1],[-24,7,-8],'#183981','#ffffff');
    sign(root,'ARRIVALS / BAGGAGE / EXIT',[16,.8,.1],[3,4,5],'#173a59','#ffffff');
    const baggage=box(root,[7,.65,3],[8,.4,-2],material(0x35424c),'jeddah-baggage-claim');
    box(root,[5,.1,1.4],[8,.78,-2],steel);
    engine.addBlocker(4.5,-3.5,11.5,-.5);
    const meeting=box(root,[1,2.4,.15],[0,1.2,28],blue,'jeddah-group-meeting');
    sign(root,'CUSTOMS / EXIT / MAKKAH COACH',[19,.7,.1],[0,4,28],'#175f49','#ffffff');
    for(let x=-38;x<40;x+=12){
        box(root,[4,.3,4],[x,0,40],material(0xd7c8a6));
        box(root,[.35,5,.35],[x,2.5,40],material(0x947652));
        const crown=new THREE.Mesh(new THREE.ConeGeometry(2.5,1.4,8),material(0x507152));crown.position.set(x,5,40);root.add(crown);
    }
    box(root,[100,.1,9],[0,-.08,49],material(0x505963));
    return {baggage,meeting};
}
