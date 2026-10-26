import * as THREE from 'three';

const ivory = () => new THREE.MeshStandardMaterial({ color: 0xdad6cc, roughness: .78 });
function box(parent, material, size, position) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    m.position.set(...position); m.receiveShadow = true; parent.add(m); return m;
}
function label(parent, text, position, width = 7) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
    const c = canvas.getContext('2d'); c.fillStyle = '#142534'; c.fillRect(0, 0, 1024, 128);
    c.fillStyle = '#f6f1dc'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 512, 64);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    m.position.set(...position); parent.add(m); return m;
}

export function tileMaterial() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d'); c.fillStyle = '#e5e6e3'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#c6c9c5'; c.lineWidth = 1.5; c.strokeRect(.75, .75, 254.5, 254.5);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(.5, .5); map.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: .82, metalness: 0, emissive: 0x000000 });
}

export function addPrayerCarpet(root, angle, radius, depth, length) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
    const c = canvas.getContext('2d'); c.fillStyle = '#3f604a'; c.fillRect(0, 0, 128, 256);
    c.strokeStyle = '#b2ad7a'; c.lineWidth = 3; c.strokeRect(5, 5, 118, 246);
    c.beginPath(); c.moveTo(18, 230); c.lineTo(18, 90); c.quadraticCurveTo(18, 55, 64, 24); c.quadraticCurveTo(110, 55, 110, 90); c.lineTo(110, 230); c.stroke();
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    const positions = [], uvs = [];
    // Continuous fitted carpet across each radial wedge, with tiled gate aisles.
    for (let row = 0; row < depth; row++) {
        const a = length / 2 * (radius + row) / radius, b = length / 2 * (radius + row + 1) / radius;
        for (const [lo, hi] of [[-100, -31], [-25, -6], [6, 25], [31, 100]]) {
            const l0 = Math.max(-a, lo), r0 = Math.min(a, hi), l1 = Math.max(-b, lo), r1 = Math.min(b, hi);
            if (r0 <= l0 || r1 <= l1) continue;
            const points = [[l0, -radius-row], [r0, -radius-row], [l1, -radius-row-1], [r0, -radius-row], [r1, -radius-row-1], [l1, -radius-row-1]];
            for (const [x,z] of points) { positions.push(x, .055, z); uvs.push(x / 1.15, z / 2.1); }
        }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material); mesh.name = 'continuous-prayer-carpet'; mesh.rotation.y = angle; root.add(mesh);
    const upper = mesh.clone(); upper.name = 'upper-prayer-carpet'; upper.position.y = 9.65; root.add(upper);
}

export function addGateFacade(engine, root, angle, width) {
    const g = new THREE.Group(); g.rotation.y = angle; root.add(g); g.name = 'haram-entrance-gate';
    const stone = ivory(), trim = new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: .7 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x493e2a, metalness: .12, roughness: .7 });
    const gold = new THREE.MeshStandardMaterial({ color: 0x9d854e, metalness: .5, roughness: .45 });
    const openings = [[-31,-25],[-6,6],[25,31]], solid = [[-width/2,-31],[-25,-6],[6,25],[31,width/2]];
    for (const [a,b] of solid) {
        box(g, stone, [b-a,16,.8], [(a+b)/2,8,-103]);
        box(g, trim, [b-a-.4,.25,.15], [(a+b)/2,4,-102.5]);
        box(g, trim, [b-a-.4,.25,.15], [(a+b)/2,8.5,-102.5]);
        // Short collision segments follow diagonal wings without blocking their aisles.
        for (let x = a; x < b; x += .6) {
            const mid = Math.min(x+.3,(x+b)/2), wx = mid*Math.cos(angle)-103*Math.sin(angle), wz=-mid*Math.sin(angle)-103*Math.cos(angle);
            engine.addBlocker(wx-.45,wz-.45,wx+.45,wz+.45);
        }
    }
    for (const [a,b] of openings) {
        const count = b-a>10 ? 3 : 1, bay = (b-a)/count;
        for (let i=0;i<count;i++) {
            const x=a+(i+.5)*bay, half=bay/2-.22;
            const shape=new THREE.Shape();
            shape.moveTo(-bay/2,5.6); shape.lineTo(-half,5.6); shape.quadraticCurveTo(-half,7.3,0,8.2);
            shape.quadraticCurveTo(half,7.3,half,5.6); shape.lineTo(bay/2,5.6); shape.lineTo(bay/2,16); shape.lineTo(-bay/2,16); shape.closePath();
            const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:false,curveSegments:12}),stone);
            arch.position.set(x,0,-103.4); g.add(arch);
            for (const sign of [-1,1]) {
                box(g,trim,[.35,6,.95],[x+sign*bay/2,3,-103]);
                // Folded timber doors frame an actual walk-through opening.
                box(g,wood,[.16,5,1.1],[x+sign*(half-.15),2.5,-102.5]);
                box(g,gold,[.18,.1,1.12],[x+sign*(half-.15),3.7,-102.5]);
            }
            box(g,wood,[bay*.55,2.6,.12],[x,12.6,-102.5]);
            box(g,trim,[bay*.65,.2,.2],[x,11.2,-102.4]);
        }
    }
    box(g, trim, [width,.5,1.3],[0,16.3,-103]);
    for(let x=-width/2;x<width/2;x+=1.2) box(g,trim,[.4,.8,1],[x,16.9,-103]);
    label(g, angle===Math.PI*1.5?'SAFA — MARWAH  →':'MASJIDIL HARAM · PINTU MASUK', [0,8.8,-102.3],11);
}

export function addHaramFacilities(engine, root) {
    const active = engine.parentEngine || engine;
    const steel = new THREE.MeshStandardMaterial({ color: 0x929da4, metalness:.65,roughness:.35 });
    const rubber = new THREE.MeshStandardMaterial({ color:0x20282b,roughness:.8 });
    const yellow = new THREE.MeshStandardMaterial({ color:0xc7ac45,roughness:.7 });
    const g=new THREE.Group(); g.name='haram-escalators'; root.add(g);
    const rise=9.65, run=19, slope=Math.atan2(rise,run), moving=[];
    for(const x of [-2.5,2.5]) {
        box(g,steel,[2.7,.16,3],[x,.08,-79]);
        for(const dx of [-1.4,1.4]) {
            const panel=box(g,steel,[.17,1.2,Math.hypot(run,rise)],[x+dx,rise/2+.45,-89.5]); panel.rotation.x=slope;
            const rail=box(g,rubber,[.23,.16,Math.hypot(run,rise)],[x+dx,rise/2+1.12,-89.5]); rail.rotation.x=slope;
            engine.addBlocker(x+dx-.09,-98.8,x+dx+.09,-80.2);
        }
        const steps=new THREE.InstancedMesh(new THREE.BoxGeometry(2.55,.25,.51),steel,40);
        const edges=new THREE.InstancedMesh(new THREE.BoxGeometry(2.55,.025,.045),yellow,40);
        steps.frustumCulled=edges.frustumCulled=false; g.add(steps,edges); moving.push({x,steps,edges});
    }
    label(g,'↑ LANTAI 2       ESKALATOR       ↓ LANTAI 1',[0,4.2,-78],10);
    label(g,'LANTAI 2 · GALERI TAWAF',[0,12.5,-101],9);
    for(const x of [-5,5]) box(g,steel,[.12,1.1,18],[x,10.2,-90]);
    box(g,steel,[10,1.1,.12],[0,10.2,-81]);
    // Upper-floor guard rails follow both octagonal edges.
    for(let i=0;i<8;i++) {
        const side=new THREE.Group();side.rotation.y=i*Math.PI/4;root.add(side);
        for(const radius of [78,103]) {
            const len=2*radius*Math.tan(Math.PI/8);
            box(side,steel,[len,.12,.12],[0,10.85,-radius]);
            for(let x=-len/2;x<=len/2;x+=2) box(side,steel,[.075,1.2,.075],[x,10.25,-radius]);
        }
    }
    // The height profile distinguishes the ground floor from the upper gallery.
    const inRamp=(x,z)=>((x>-3.8&&x<-1.2)||(x>1.2&&x<3.8))&&z<=-80&&z>=-99;
    const apothem=(x,z)=>Math.max(Math.abs(x),Math.abs(z),(Math.abs(x)+Math.abs(z))/Math.SQRT2);
    engine.addHeightZone(0,0,120,(x,z,level=0)=> {
        if(inRamp(x,z)) return Math.min(rise,Math.max(0,(-z-80)/run*rise));
        return level===1&&apothem(x,z)>=78&&apothem(x,z)<=103 ? rise : 0;
    });
    active.haramUpperWalkable=(x,z)=>{
        if(Math.abs(x)<5&&z<-81&&z>-99) return inRamp(x,z);
        return inRamp(x,z)||(apothem(x,z)>78.8&&apothem(x,z)<102.2);
    };
    const dummy=new THREE.Object3D();
    engine.onUpdate((dt,time)=>{
        for(const {x,steps,edges} of moving) for(let i=0;i<40;i++) {
            const t=((i/40+(x<0?1:-1)*time*.025)%1+1)%1;
            dummy.position.set(x,t*rise-.12,-80-t*run);dummy.updateMatrix();steps.setMatrixAt(i,dummy.matrix);
            dummy.position.y+=.14;dummy.position.z+=.22;dummy.updateMatrix();edges.setMatrixAt(i,dummy.matrix);
        }
        for(const m of moving){m.steps.instanceMatrix.needsUpdate=true;m.edges.instanceMatrix.needsUpdate=true;}
        const p=active.playerPos(new THREE.Vector3());
        const feet = active.renderer.xr.isPresenting ? active.dolly.position.y - (active._vrSittingOffset || 0) : p.y - 1.7;
        if(feet>8&&Math.abs(p.x)<5&&p.z<-98.8&&p.z>-102.2) active.navigationLevel=1;
        if(Math.abs(p.x)<5&&p.z>-80.2&&p.z<-77) active.navigationLevel=0;
        if(inRamp(p.x,p.z)&&!active.uiOpen&&!active.locomotionLocked) {
            const dz=(p.x<0?-1:1)*Math.min(dt,.05)*.65;
            if(active._walkableStatic(p.x,p.z+dz,.2)) {
                if(active.renderer.xr.isPresenting) active.dolly.position.z+=dz;
                else active.camera.position.z+=dz;
            }
        }
    });
    addConnector(engine,root);
}

function addConnector(engine,root) {
    const g=new THREE.Group();g.name='haram-safa-connector';root.add(g);
    const stone=ivory(),tile=tileMaterial();
    // A roofed L-shaped passage follows the established mission path into Safa.
    tile.map.repeat.set(15,5);
    box(g,tile,[34,.12,10],[118,0,-30]);
    const turnTile=tileMaterial();turnTile.map.repeat.set(5,12);
    box(g,turnTile,[10,.12,25],[130,0,-17.5]);
    box(g,stone,[34,.5,11],[118,8,-30]);box(g,stone,[11,.5,29],[130,8,-17.5]);
    box(g,stone,[22,8,.6],[114,4,-35]);box(g,stone,[22,8,.6],[114,4,-25]);
    box(g,stone,[.6,8,21],[135,4,-24.5]);box(g,stone,[.6,8,15],[125,4,-12.5]);
    engine.addWalkRect(101,-34.5,134.5,-25.5);engine.addWalkRect(125.5,-30,134.5,-5);
    engine.addBlocker(103,-35.3,125,-34.7);engine.addBlocker(103,-25.3,124.7,-24.7);
    engine.addBlocker(134.7,-35,135.3,-14);engine.addBlocker(124.7,-20,125.3,-5);
    for(let x=106;x<130;x+=6) {
        box(g,stone,[.5,.6,10],[x,7.4,-30]);
        const gold=new THREE.MeshStandardMaterial({color:0xb09a61,metalness:.4,roughness:.5});
        for(const z of [-34.5,-25.5]) {
            box(g,stone,[.65,7,.65],[x,3.5,z]);
            box(g,gold,[.85,.2,.85],[x,5.8,z]);
            box(g,new THREE.MeshStandardMaterial({color:0x304b3d}),[.7,.8,.7],[x,6.5,z]);
        }
        box(g,gold,[.04,1.3,.04],[x,6.7,-30]);
        const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,.65,8),new THREE.MeshBasicMaterial({color:0xf3dfac}));
        lamp.position.set(x,5.8,-30);g.add(lamp);
        box(g,gold,[.85,.12,.85],[x,5.45,-30]);
    }
    const sign=label(g,'← MASJIDIL HARAM     SAFA / MARWAH →',[111,5.8,-29],10);sign.rotation.y=-Math.PI/2;
}

export function addMasaaDetails(parent) {
    const stone=ivory(),gold=new THREE.MeshStandardMaterial({color:0xb39b64,metalness:.5,roughness:.4});
    const green=new THREE.MeshStandardMaterial({color:0x245b42,roughness:.7});
    const glow=new THREE.MeshBasicMaterial({color:0xffe4ad});
    for(let x=-60;x<=60;x+=8) {
        box(parent,stone,[.45,.6,24],[x,11.3,0]);
        for(const z of [-9,9]) {
            box(parent,stone,[1.1,9.5,1.1],[x,4.75,z]);
            box(parent,gold,[1.3,.18,1.3],[x,8.2,z]);
            box(parent,green,[1.15,1.2,1.15],[x,9.7,z]);
            box(parent,gold,[.04,3,.04],[x,9,z*.65]);
            const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.32,.44,.7,8),glow);lamp.position.set(x,7.2,z*.65);parent.add(lamp);
            box(parent,gold,[.9,.12,.9],[x,6.8,z*.65]);
        }
    }
    for(const x of [-16,16]) box(parent,green,[.5,.6,24],[x,10.8,0]);
    label(parent,'SAFA  ←                  →  MARWAH',[-62,7,-5],9).rotation.y=-Math.PI/2;
}
