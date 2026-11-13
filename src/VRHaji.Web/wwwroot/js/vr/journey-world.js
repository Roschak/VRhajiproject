import * as THREE from 'three';
import {createJakartaDrive,updateJakartaDrive} from './indonesia-scenery.js';
import * as B from './builders.js';
import { ChunkManager } from './chunkManager.js';
import { airportDestinations } from './airport-wander.js';
import { walkingRoute } from './walking-route.js';
import { createMakkahCrowd } from './makkah-crowd.js';
import { createHaramGuard, HOTEL } from './makkah-landmarks.js';
import { modernNeighborhood, arabDistrict, arabHouse, datePalm, enrichBus, roadSign } from './journey-scenery.js';
import { referenceHome, extendDepartureAirport, enhanceCabin, addTravelPeople, silverSUV, departureSign } from './departure-scenes.js';

// A compressed teaching map, not a survey map. All coordinates share one world.
export const LOCATIONS = {
    home: { x: -6000, z: 0, label: 'Rumah di Indonesia' },
    indonesia: { x: -5000, z: 0, label: 'Bandara Indonesia' },
    cabin: { x: -4000, z: 0, label: 'Kabin pesawat' },
    madinah: { x: -3000, z: 0, label: 'Bandara Madinah' },
    jeddah: { x: -3500, z: 0, label: 'Bandara Jeddah' },
    miqat: { x: -1500, z: 0, label: 'Miqat Bir Ali' },
    haram: { x: 0, z: 0, label: 'Masjidil Haram' },
    masaa: { x: 200, z: 0, label: 'Safa dan Marwah' },
    mina: { x: 700, z: -100, label: 'Mina' },
    muzdalifah: { x: 1250, z: 80, label: 'Muzdalifah' },
    arafah: { x: 1900, z: 150, label: 'Arafah' }
};

export class JourneyWorld {
    constructor(engine) {
        this.engine = engine; this.zones = new Map(); this.disposed = false;
        this.roads = new THREE.Group(); this.roads.name = 'jalan-penghubung'; engine.scene.add(this.roads);
        this.navigationPanel=document.createElement('div');this.navigationPanel.className='journey-road-directions';
        Object.assign(this.navigationPanel.style,{position:'absolute',right:'20px',top:'135px',padding:'12px 18px',background:'#122b32ed',color:'#fff',borderRadius:'12px',pointerEvents:'none',fontSize:'15px',maxWidth:'290px'});
        document.getElementById('vr-root').append(this.navigationPanel);
        this.updater = engine.onUpdate((dt, t) => this.update(dt, t));
    }

    ensure(key) {
        if (this.zones.has(key)) return this.zones.get(key);
        const engine = this.engine, location = LOCATIONS[key];
        if (!location) throw new Error(`Lokasi tidak dikenal: ${key}`);
        const group = new THREE.Group(); group.name = `area-${key}`;
        group.position.set(location.x, 0, location.z); engine.scene.add(group);
        // Builders keep their local coordinates; navigation is registered in world coordinates.
        const local = Object.create(engine);
        Object.assign(local, { parentEngine: engine, scene: group, walkRects: [], walkCircles: [], blockers: [],
            heightZones: [], updaters: [], camera: new THREE.PerspectiveCamera(60, 1, .1, 1200) });
        local.chunkManager = new ChunkManager({ scene: group, camera: local.camera },
            { frustumCulling: false, occlusionCulling: false });
        const zone = { ...location, key, group, local, refs: null };
        this.zones.set(key, zone);
        try {
            switch (key) {
                case 'home': zone.refs = referenceHome(local); modernNeighborhood(local); break;
                case 'indonesia': zone.refs = extendDepartureAirport(local, B.airport(local)); break;
                case 'madinah': zone.refs = B.airport(local, { nameSign: 'BANDARA MADINAH - KEDATANGAN HAJI', arabic: true, madinah: true }); break;
                case 'jeddah': zone.refs = B.airport(local, { nameSign: 'BANDARA JEDDAH - KEDATANGAN', arabic: true }); break;
                case 'cabin': zone.refs = enhanceCabin(local, B.airplaneCabin(local, { x: 0, z: 0 })); break;
                case 'miqat': zone.refs = B.miqat(local); break;
                case 'haram':
                    zone.refs = B.masjidilHaram(local);
                    zone.refs.entryOfficer = this.buildHaramEntrance(local);
                    zone.refs.hotel = this.buildHotel(local);
                    zone.refs.halq = B.barberChair(local.mats);
                    zone.refs.halq.position.set(82, 0, -30);
                    group.add(zone.refs.halq);
                    local.addWalkRect(74, -38, 91, -22);
                    zone.refs.crowd = createMakkahCrowd(local);
                    break;
                case 'masaa':
                    zone.refs = B.masaa(local);
                    // The old isolated gallery blocked everything outside its end walls,
                    // including the adjacent Haram when placed in a shared world.
                    local.blockers = local.blockers.filter(b => Math.abs(b.x2 - b.x1) < 250);
                    break;
                case 'mina': {
                    zone.refs = B.mina(local, { withAllJamarat: true });
                    zone.refs.crowd = createMakkahCrowd(local,{kind:'mina'});
                    const hadyu = B.slaughterArea(local.mats), chair = B.barberChair(local.mats);
                    hadyu.position.set(80, 0, 10); chair.position.set(100, 0, 20);
                    group.add(hadyu, chair);
                    local.addWalkRect(60, 12, 115, 40);
                    zone.refs.hadyu = hadyu; zone.refs.chair = chair;
                    break;
                }
                case 'muzdalifah': zone.refs = B.muzdalifah(local); break;
                case 'arafah': zone.refs = B.arafah(local); break;
            }
            // A gate is controlled by its mission interaction, not a permanent invisible wall.
            // Older builders with no walk boundary assumed an otherwise empty world.
            if (!local.walkRects.length && !local.walkCircles.length) local.addWalkRect(-100, -100, 100, 100);
            let pointLights = 0;
            group.traverse(object => {
                if (object.isPointLight && ++pointLights > 2) object.visible = false;
            });
            local.blockers = local.blockers.filter(b => !b.isAutogateDoor);
            for (const r of local.walkRects) engine.addWalkRect(r.x1 + zone.x, r.z1 + zone.z, r.x2 + zone.x, r.z2 + zone.z);
            for (const c of local.walkCircles) engine.addWalkCircle(c.x + zone.x, c.z + zone.z, c.rOuter, c.rInner);
            for (const b of local.blockers) {
                engine.addBlocker(b.x1 + zone.x, b.z1 + zone.z, b.x2 + zone.x, b.z2 + zone.z);
                b.worldBlocker=engine.blockers[engine.blockers.length-1];
                if(b.disabled)b.worldBlocker.disabled=true;
                if (b === zone.refs?.doorBlocker) {zone.refs.doorCollider = engine.blockers[engine.blockers.length - 1];zone.refs.doorCollider.routePassable=true;}
            }
            for (const h of local.heightZones) engine.addHeightZone(h.cx + zone.x, h.cz + zone.z, h.radius, (x, z, level) => h.heightFn(x - zone.x, z - zone.z, level));
            group.updateMatrixWorld(true);
            if (key === 'home') addTravelPeople(local,[{x:-3,z:6,ry:Math.PI},{x:7,z:5,ry:Math.PI},{x:-3,z:18},{x:8,z:18}],{luggage:true});
            else if (key === 'cabin') addTravelPeople(local,zone.refs.seatSpots.filter((p,i)=>i%4===0&&Math.hypot(p.x+1.7,p.z+.8)>.6),{seated:true});
            else if (['indonesia','madinah','jeddah'].includes(key)) {
                const destinations=airportDestinations(local);
                const spots=Array.from({length:8},(_,i)=>({...destinations[Math.floor(i*destinations.length/8)]}));
                addTravelPeople(local,spots,{walking:true,wander:destinations,luggage:true});
                if(key==='indonesia'||key==='jeddah') {
                    const waiting=[];
                    for(const x of [-32,-16,-8,0,8])for(let i=0;i<3;i++)waiting.push({x,z:-21+i*2,ry:Math.PI});
                    addTravelPeople(local,waiting,{frozen:true,luggage:true});
                    const active=addTravelPeople(local,Array.from({length:4},(_,i)=>({x:-24,z:-21+i*2,ry:Math.PI})),{luggage:true});
                    const state=zone.refs.checkinQueue={remaining:4,started:false};let service=0;
                    local.onUpdate(dt=>{
                        if(!state.started||!active.agents.length||!state.remaining)return;
                        service+=dt;
                        if(service>=4){service=0;const served=active.agents.shift();served.root.removeFromParent();served.mixer.stopAllAction();served.model.traverse(o=>o.skeleton?.dispose());state.remaining--;}
                        active.agents.forEach((a,i)=>{a.root.position.z=Math.max(-21+i*2,a.root.position.z-dt*.8);});
                    });
                } else if(zone.refs.seatSpots) addTravelPeople(local,zone.refs.seatSpots.filter((_,i)=>i%4===0),{seated:true,frozen:true});
            } else if (key === 'haram') {
                const spots=[];
                // Clear of the Hijr wall, Maqam enclosure and first tawaf lane.
                for(let row=0;row<2;row++)for(let col=0;col<5;col++){
                    const x=(col-2)*1.05,z=-15.3-row*.95;
                    spots.push({x,z,ry:Math.atan2(-x,-z),prayerArea:'hijr-ismail'});
                }
                for(let row=0;row<2;row++)for(let col=0;col<4;col++){
                    const x=12.6+row*.75+(col-1.5)*.6,z=10.5+row*.6-(col-1.5)*.75;
                    spots.push({x,z,ry:Math.atan2(-x,-z),prayerArea:'maqam-ibrahim'});
                }
                addTravelPeople(local,spots,{praying:true});
            } else {
                const path=[{x:70,z:-5},{x:70,z:5},{x:-70,z:5},{x:-70,z:-5}];
                const spots=key==='masaa'?Array.from({length:64},(_,i)=>({x:-62+(i%32)*4,z:i<32?-5:5,path,target:i<32?0:2})):[{x:-12,z:18},{x:-16,z:20},{x:12,z:18},{x:15,z:20}];
                addTravelPeople(local,spots,{walking:key==='masaa'});
            }
            return zone;
        } catch (error) {
            this.zones.delete(key); local.chunkManager.dispose(); group.removeFromParent(); throw error;
        }
    }

    buildHome(local) {
        const box = (size, position, color) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
            mesh.position.set(...position); local.scene.add(mesh); return mesh;
        };
        box([14, .2, 14], [0, -.1, 0], 0xd9c6a3);
        box([.2, 4, 14], [-7, 2, 0], 0xede6d4); box([.2, 4, 14], [7, 2, 0], 0xede6d4);
        box([14, 4, .2], [0, 2, 7], 0xede6d4);
        box([2.4, .2, 1.3], [0, .8, -3], 0x785538);
        const checklist = box([1, .7, .5], [0, 1.25, -3], 0x38794c);
        box([3, .6, 1.3], [-4, .5, 3], 0x9b634b);
        local.addWalkRect(-6.8, -7, 6.8, 6.8);
        return { checklist };
    }

    buildHaramEntrance(local) {
        const g=new THREE.Group();g.name='haram-entrance-checkpoint';local.scene.add(g);
        const stone=new THREE.MeshStandardMaterial({color:0xe3d7bc}),green=new THREE.MeshStandardMaterial({color:0x235745});
        const box=(size,position,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...position);g.add(m);return m;};
        for(const x of [24,36]){box([1,10,1],[x,5,113],stone);local.addBlocker(x-.5,112.5,x+.5,113.5);}
        box([13,1,1],[30,10,113],stone);
        departureSign(g,'MASUK MASJIDIL HARAM',[30,9,113.6],10);
        local.addWalkRect(21,99,39,130);
        return createHaramGuard(local).object;
    }

    buildHotel(local) {
        const building = new THREE.Group(); building.name = 'hotel-makkah';
        const body = new THREE.Mesh(new THREE.BoxGeometry(32, 24, 24), new THREE.MeshStandardMaterial({ color: 0xc8b99b }));
        body.position.set(HOTEL.x, 12, 45); building.add(body);
        const door = new THREE.Mesh(new THREE.BoxGeometry(3, 5, .25), new THREE.MeshStandardMaterial({ color: 0x493b2b }));
        door.position.set(HOTEL.x, 2.5, 32.85); building.add(door);
        for (const x of [-106, -100, -90, -84]) for (const y of [8, 14, 20]) {
            const window = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, .2), new THREE.MeshStandardMaterial({ color: 0x8bb4c1, metalness: .15, roughness: .35 }));
            window.position.set(x+HOTEL.x+95, y, 32.8); building.add(window);
        }
        local.scene.add(building);
        local.addBlocker(HOTEL.x-16,33,HOTEL.x+16,57);
        return door;
    }

    async prepareSaudi() {
        if (this.saudiReady) return;
        this.prepareRoads();
        for (const key of ['haram', 'masaa', 'miqat', 'mina', 'muzdalifah', 'arafah']) {
            if (this.disposed) throw new Error('Perjalanan ditutup');
            this.ensure(key);
            // Yield between areas so the compositor and loading text can update.
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        this.saudiReady = true;
    }

    prepareRoads() {
        if (this.roadsReady) return;
        this.roadsReady = true;
        this.road(-1500,44,-1500,500,16);
        this.road(-1500,500,70,500,16);
        for(let x=-1450;x<0;x+=60)for(const side of [-1,1]){
            arabHouse(this.roads,x,500+side*28,Math.abs(x/60)|0);
            datePalm(this.roads,x+18,500+side*12);
        }
        for(let z=110;z<490;z+=32)for(const side of [-1,1])datePalm(this.roads,-1500+side*12,z);
        const roadLocal=Object.create(this.engine);Object.assign(roadLocal,{parentEngine:this.engine,scene:this.roads,updaters:[],disposeCallbacks:[]});
        this.roadLocal=roadLocal;
        const walkers=[];for(let x=-1440;x<40;x+=45)walkers.push({x,z:496,axis:'x',range:16},{x:x+15,z:504,axis:'x',range:16});
        for(let z=120;z<480;z+=35)walkers.push({x:-1496,z,axis:'z',range:12});
        addTravelPeople(roadLocal,walkers,{walking:true});
        this.road(80, -30, 130, -30, 12);
        this.road(130, -30, 130, -5, 12);
        this.road(70,65,70,250,16);
        this.road(70,250,190,250,16);
        this.road(190,250,190,500,16);
        this.road(30,124,70,124,12);
        this.road(70, 500, 1900, 500, 18);
        this.road(700, 20, 700, 500, 16);
        this.road(1250, 350, 1250, 500, 16);
        this.road(1900, 230, 1900, 500, 16);
        roadSign(this.roads,'MAKKAH / MASJIDIL HARAM →',-1510,485,Math.PI);
        roadSign(this.roads,'← MASJIDIL HARAM',58,510,-Math.PI/2);
        roadSign(this.roads,'MIQAT BIR ALI ←',-1450,510,-Math.PI/2);
        for(let x=-1320;x<0;x+=240)roadSign(this.roads,'MASJIDIL HARAM · IKUTI JALAN',x,510,-Math.PI/2);
        roadSign(this.roads,'SAFA / MARWAH →',94,-38,0);
    }

    road(x1, z1, x2, z2, width) {
        const length = Math.hypot(x2 - x1, z2 - z1);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, .05, length), new THREE.MeshStandardMaterial({ color: 0xb7a88b }));
        mesh.position.set((x1 + x2) / 2, -.015, (z1 + z2) / 2);
        mesh.rotation.y = Math.atan2(x2 - x1, z2 - z1); this.roads.add(mesh);
        this.engine.addWalkRect(Math.min(x1, x2) - width / 2, Math.min(z1, z2) - width / 2,
            Math.max(x1, x2) + width / 2, Math.max(z1, z2) + width / 2);
    }

    point(key, x = 0, z = 0) { const p = LOCATIONS[key]; return { x: p.x + x, z: p.z + z }; }
    vehicle(type = 'Bus') {
        if (type === 'Mobil') {
            if (!this.carTransport) {
                this.carTransport = silverSUV(); this.carTransport.position.set(-7600,0,0);this.engine.scene.add(this.carTransport);
                this.carTransport.traverse(o=>{if(o.isMesh&&o.material?.transparent){o.material.opacity=.2;o.material.depthWrite=false;}});
                this.carTransport.add(new THREE.HemisphereLight(0xe5f3ff,0x9c9b87,1.7));
                this.carSceneryResources={disposeCallbacks:[]};
                createJakartaDrive(this.carTransport,this.carSceneryResources);
                this.engine.addWalkRect(-7601,-2,-7599,2);
            }
            this.carTransport.visible=true;return this.carTransport;
        }
        if (!this.transport) {
            this.transport = B.busModel(this.engine.mats).bus; enrichBus(this.transport);
            this.transport.name = 'kendaraan-perjalanan';
            this.transport.position.set(-7500, 0, 0);
            this.engine.scene.add(this.transport);
            const local=Object.create(this.engine);Object.assign(local,{parentEngine:this.engine,scene:this.transport,updaters:[],disposeCallbacks:[],camera:new THREE.PerspectiveCamera()});this.busLocal=local;
            addTravelPeople(local,Array.from({length:12},(_,i)=>({x:-4.4+Math.floor(i/2)*1.1,z:i%2?.9:-.9,ry:Math.PI/2,y:.3})).filter(p=>Math.abs(p.x)>.01||p.z<0),{seated:true});
            this.engine.addWalkRect(-7506, -1.2, -7494, 1.2);
        }
        this.transport.visible = true;
        return this.transport;
    }
    spawn(key, x = 0, z = 0, yaw = 0) {
        this.engine.prayerContext=key;
        if(key==='haram'){x=30;z=124;yaw=0;this.engine.haramEntryPending=true;}
        this.ensure(key); const p = this.point(key, x, z);
        this.engine.spawn(p.x, p.z, yaw); this.engine._lastValidHeadPos = null;
        this.locationSidebar?.arrive(key);
        this.update(0, 0);
    }

    update(dt, time) {
        if (this.disposed) return;
        const p = this.engine.playerPos(new THREE.Vector3());
        // The flight map belongs to the seatback display, not the ground minimap.
        if(this.engine.hud.minimap)this.engine.hud.minimap.style.visibility=Math.abs(p.x+4000)<100?'hidden':'';
        if(this.carTransport?.visible)updateJakartaDrive(this.carTransport,dt);
        if(this.transport?.visible&&this.transport.userData.scenery)this.transport.userData.scenery.position.x=-(time*6%72);
        if(this.transport?.visible&&this.busLocal){this.busLocal.camera.position.set(p.x+7500,p.y,p.z);for(const u of this.busLocal.updaters)if(!u.done)u.fn(dt,time,u);}
        for(const u of this.roadLocal?.updaters||[])if(!u.done)u.fn(dt,time,u);
        // Makkah's reference lighting follows the player, including walking arrivals.
        // Restore the journey's time of day when leaving the connected Haram/Safa area.
        const inMakkah = Math.hypot(p.x,p.z)<425;
        if (inMakkah && !this.makkahLighting) {
            this.previousEnvironment = this.engine.envPreset || 'day';
            this.makkahGraphics={bloom:this.engine.bloom.enabled,locked:this.engine._lockResolution,shadows:this.engine.renderer.shadowMap.enabled};
            this.engine.setEnvironment('night');
            this.engine.bloom.enabled=false;
            this.engine.renderer.shadowMap.enabled=false;
            this.engine._lockResolution=false;
            if (this.engine.scene.fog) this.engine.scene.fog.density = .0012;
            this.makkahLighting = true;
        } else if (!inMakkah && this.makkahLighting) {
            this.engine.setEnvironment(this.previousEnvironment);
            this.engine.bloom.enabled=this.makkahGraphics.bloom;
            this.engine.renderer.shadowMap.enabled=this.makkahGraphics.shadows;
            this.engine._lockResolution=this.makkahGraphics.locked;
            this.makkahLighting = false;
        }
        this.navigationPanel.hidden=!this.engine.waypoint;
        if(this.engine.waypoint){
            const next=this.engine.navigationNext,heading=this.engine.camera.getWorldDirection(new THREE.Vector3());
            if(next){const dx=next.x-p.x,dz=next.z-p.z,angle=Math.atan2(heading.x*dz-heading.z*dx,heading.x*dx+heading.z*dz);
                const instruction=Math.abs(angle)<.35?'\u2191 Lurus mengikuti panah':Math.abs(angle)>2.5?'\u21b6 Berbalik mengikuti jalan':angle>0?'\u2192 Belok kanan':'\u2190 Belok kiri';
                this.navigationPanel.textContent=`${instruction} - ${this.engine.navigationDistance} m ke tujuan`;
            }else this.navigationPanel.textContent='Jalur belum ditemukan - Dekati jalur utama';
        }
        const mapX = Math.round(p.x / 40) * 40, mapZ = Math.round(p.z / 40) * 40;
        const mapKey = `${mapX}:${mapZ}`;
        if (mapKey !== this.mapKey) {
            this.mapKey = mapKey;
            this.engine.configureMinimap({ scale: p.x < -500 ? 1.2 : .65, center: { x: mapX, z: mapZ },
                features: Object.values(LOCATIONS).map(place => ({ ...place, type: 'point', color: '#e8c96a' })) });
        }
        for (const zone of this.zones.values()) {
            zone.group.visible = Math.hypot(p.x - zone.x, p.z - zone.z) < 520;
            if (!zone.group.visible) continue;
            zone.local.camera.position.set(p.x - zone.x, p.y, p.z - zone.z);
            zone.local.camera.updateMatrixWorld();
            zone.local.chunkManager.update();
            for (const u of zone.local.updaters) if (!u.done) u.fn(dt, time, u);
        }
    }

    dispose() {
        this.disposed = true; this.updater.done = true;this.navigationPanel.remove();
        for(const dispose of [...(this.roadLocal?.disposeCallbacks||[]),...(this.busLocal?.disposeCallbacks||[]),...(this.carSceneryResources?.disposeCallbacks||[])])dispose();
        for (const zone of this.zones.values()) {
            for (const dispose of zone.local.disposeCallbacks || []) dispose();
            zone.local.chunkManager.dispose();
        }
        // Engine owns final disposal of shared materials and all retained area roots.
        this.zones.clear();
    }
}
