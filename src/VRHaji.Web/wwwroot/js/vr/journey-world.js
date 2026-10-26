import * as THREE from 'three';
import * as B from './builders.js';
import { ChunkManager } from './chunkManager.js';
import { Crowd } from './engine.js';
import { referenceHome, extendDepartureAirport, enhanceCabin, addTravelPeople, silverSUV } from './departure-scenes.js';

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
                case 'home': zone.refs = referenceHome(local); break;
                case 'indonesia': zone.refs = extendDepartureAirport(local, B.airport(local)); break;
                case 'madinah': zone.refs = B.airport(local, { nameSign: 'BANDARA MADINAH - KEDATANGAN HAJI', arabic: true, madinah: true }); break;
                case 'jeddah': zone.refs = B.airport(local, { nameSign: 'BANDARA JEDDAH - KEDATANGAN', arabic: true }); break;
                case 'cabin': zone.refs = enhanceCabin(local, B.airplaneCabin(local, { x: 0, z: 0 })); break;
                case 'miqat': zone.refs = B.miqat(local); break;
                case 'haram':
                    zone.refs = B.masjidilHaram(local);
                    zone.refs.hotel = this.buildHotel(local);
                    zone.refs.halq = B.barberChair(local.mats);
                    zone.refs.halq.position.set(82, 0, -30);
                    group.add(zone.refs.halq);
                    local.addWalkRect(74, -38, 91, -22);
                    local.addWalkRect(-112, 32, -78, 58);
                    new Crowd(group, { count: 36, mode: 'orbit', center: { x: 0, z: 0 }, rMin: 19, rMax: 35, colors: [0xffffff, 0xf6f3ea] });
                    break;
                case 'masaa':
                    zone.refs = B.masaa(local);
                    // The old isolated gallery blocked everything outside its end walls,
                    // including the adjacent Haram when placed in a shared world.
                    local.blockers = local.blockers.filter(b => Math.abs(b.x2 - b.x1) < 250);
                    break;
                case 'mina': {
                    zone.refs = B.mina(local, { withAllJamarat: true });
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
                if (b === zone.refs?.doorBlocker) zone.refs.doorCollider = engine.blockers[engine.blockers.length - 1];
            }
            for (const h of local.heightZones) engine.addHeightZone(h.cx + zone.x, h.cz + zone.z, h.radius, (x, z, level) => h.heightFn(x - zone.x, z - zone.z, level));
            group.updateMatrixWorld(true);
            if (key === 'home') addTravelPeople(local,[{x:-7,z:5,ry:Math.PI},{x:7,z:5,ry:Math.PI},{x:-3,z:16},{x:8,z:17}],{detailed:2});
            else if (key === 'cabin') addTravelPeople(local,zone.refs.seatSpots.filter((_,i)=>i%3!==2).slice(0,60),{seated:true});
            else if (['indonesia','madinah','jeddah'].includes(key)) {
                const spots=[];
                for(let x=-38;x<10;x+=4) for(const z of [-3,4])spots.push({x,z,ry:Math.PI});
                if(key==='indonesia')for(let x=-34;x<=34;x+=6)spots.push({x,z:36,ry:Math.PI});
                addTravelPeople(local,spots,{detailed:2});
            } else if (key !== 'haram') {
                const spots=key==='masaa'?[{x:-45,z:-9},{x:-20,z:-9},{x:15,z:9},{x:45,z:9}]:[{x:-12,z:18},{x:-16,z:20},{x:12,z:18},{x:15,z:20}];
                addTravelPeople(local,spots);
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

    buildHotel(local) {
        const building = new THREE.Group(); building.name = 'hotel-makkah';
        const body = new THREE.Mesh(new THREE.BoxGeometry(32, 24, 24), new THREE.MeshStandardMaterial({ color: 0xc8b99b }));
        body.position.set(-95, 12, 45); building.add(body);
        const door = new THREE.Mesh(new THREE.BoxGeometry(3, 5, .25), new THREE.MeshStandardMaterial({ color: 0x493b2b }));
        door.position.set(-95, 2.5, 32.85); building.add(door);
        for (const x of [-106, -100, -90, -84]) for (const y of [8, 14, 20]) {
            const window = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, .2), new THREE.MeshStandardMaterial({ color: 0x8bb4c1, metalness: .15, roughness: .35 }));
            window.position.set(x, y, 32.8); building.add(window);
        }
        local.scene.add(building);
        return door;
    }

    async prepareSaudi() {
        if (this.saudiReady) return;
        this.prepareRoads();
        for (const key of ['haram', 'masaa', 'mina', 'muzdalifah', 'arafah']) {
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
        this.road(80, -30, 130, -30, 12);
        this.road(130, -30, 130, -5, 12);
        this.road(70, 65, 70, 500, 16);
        this.road(70, 500, 1900, 500, 18);
        this.road(700, 20, 700, 500, 16);
        this.road(1250, 350, 1250, 500, 16);
        this.road(1900, 230, 1900, 500, 16);
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
                this.engine.addWalkRect(-7601,-2,-7599,2);
            }
            this.carTransport.visible=true;return this.carTransport;
        }
        if (!this.transport) {
            this.transport = B.busModel(this.engine.mats).bus;
            this.transport.name = 'kendaraan-perjalanan';
            this.transport.position.set(-7500, 0, 0);
            this.engine.scene.add(this.transport);
            this.engine.addWalkRect(-7506, -1.2, -7494, 1.2);
        }
        this.transport.visible = true;
        return this.transport;
    }
    spawn(key, x = 0, z = 0, yaw = 0) {
        this.ensure(key); const p = this.point(key, x, z);
        this.engine.spawn(p.x, p.z, yaw); this.engine._lastValidHeadPos = null;
        this.update(0, 0);
    }

    update(dt, time) {
        if (this.disposed) return;
        const p = this.engine.playerPos(new THREE.Vector3());
        // Makkah's reference lighting follows the player, including walking arrivals.
        // Restore the journey's time of day when leaving the connected Haram/Safa area.
        const inMakkah = p.x > -120 && p.x < 285 && Math.abs(p.z) < 120;
        if (inMakkah && !this.makkahLighting) {
            this.previousEnvironment = this.engine.envPreset || 'day';
            this.engine.setEnvironment('night');
            this.engine.bloom.strength = .025;
            if (this.engine.scene.fog) this.engine.scene.fog.density = .0012;
            this.makkahLighting = true;
        } else if (!inMakkah && this.makkahLighting) {
            this.engine.setEnvironment(this.previousEnvironment);
            this.makkahLighting = false;
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
        this.disposed = true; this.updater.done = true;
        for (const zone of this.zones.values()) {
            for (const dispose of zone.local.disposeCallbacks || []) dispose();
            zone.local.chunkManager.dispose();
        }
        // Engine owns final disposal of shared materials and all retained area roots.
        this.zones.clear();
    }
}
