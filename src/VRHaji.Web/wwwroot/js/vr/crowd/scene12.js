/**
 * Crowd (logika manusia) — SCENE 12: Tawaf Wada'
 *
 * Salinan MANDIRI dari logika gerak & init manusia untuk scene ini.
 * Mengubah perilaku manusia di file ini TIDAK memengaruhi scene lain.
 * Bentuk tubuh (geometri/mesh) diwarisi dari Crowd base di engine.js.
 */
import { Crowd as CrowdBase, ACTIVE_ENGINE, ACTIVE_CROWDS } from '../engine.js';

export class Crowd extends CrowdBase {
    _initAgent(a, i) {
        const opts = this.opts;
        const pickFree = (gx, gz) => this._pickFree(gx, gz);
        if (opts.mode === 'orbit') {
            a.r = opts.rMin + Math.random() * (opts.rMax - opts.rMin);
            a.angle = Math.random() * Math.PI * 2;
            // Kecepatan tawaf/orbit dikurangi
            a.w = (opts.angularSpeed ?? 0.1) * (opts.rMin / a.r) * (0.5 + Math.random() * 0.3);
        } else if (opts.mode === 'line') {
            a.t = Math.random();
            a.dir = opts.oneWay ? 1 : (Math.random() > 0.5 ? 1 : -1);
            a.lane = (Math.random() - 0.5) * (opts.width ?? 6);
            a.v = 0.01 + Math.random() * 0.01; // Kecepatan Sa'i diperlambat
        } else if (opts.mode === 'wander') {
            const p0 = pickFree(() => opts.area.x + (Math.random() - 0.5) * opts.area.w,
                () => opts.area.z + (Math.random() - 0.5) * opts.area.d);
            a.x = p0.x; a.z = p0.z;
            a.tx = a.x; a.tz = a.z;
            a.heading = Math.random() * Math.PI * 2;
            // Kecepatan jalan bebas dikurangi
            a.v = 0.35 + Math.random() * 0.3;
            a.dwell = Math.random() * 3;
        } else if (opts.mode === 'sit' && opts.spots) {
            const sp = opts.spots[i];
            a.x = sp.x; a.z = sp.z;
            a.heading = sp.ry ?? 0;
            a.sit = true;
        } else if (opts.mode === 'post' && opts.spots) {
            const sp = opts.spots[i];
            a.x = sp.x; a.z = sp.z;
            a.heading = sp.ry ?? 0;
            a.sit = !!sp.sit;
            if (sp.sitY !== undefined) a.sitY = sp.sitY;
            if (sp.color !== undefined) a.outfit = sp.color;
        } else if (opts.mode === 'groupWander') {
            if (i % 6 === 0) {
                a.isLeader = true;
                a.groupId = i;
                a.tx = opts.area.x + (Math.random() - 0.5) * opts.area.w;
                a.tz = opts.area.z + (Math.random() - 0.5) * opts.area.d;
            } else {
                a.isLeader = false;
                a.groupId = i - (i % 6);
            }
            const pg = pickFree(() => opts.area.x + (Math.random() - 0.5) * opts.area.w,
                () => opts.area.z + (Math.random() - 0.5) * opts.area.d);
            a.x = pg.x; a.z = pg.z;
            a.v = 0.35 + Math.random() * 0.15;
            a.dwell = Math.random() * 3;
            a.heading = Math.random() * Math.PI * 2;
            a.sit = false;
        } else {
            const pi0 = opts.area
                ? pickFree(() => opts.area.x + (Math.random() - 0.5) * opts.area.w,
                    () => opts.area.z + (Math.random() - 0.5) * opts.area.d)
                : pickFree(() => (Math.random() - 0.5) * 20, () => (Math.random() - 0.5) * 20);
            a.x = pi0.x; a.z = pi0.z;
            a.heading = Math.random() * Math.PI * 2;
            a.sit = opts.mode === 'sit' || opts.mode === 'sitFloor';
            a.sitFloor = opts.mode === 'sitFloor';
        }
    }

    update(dt, time) {
        const o = this.opts, L = this.L, qYaw = this._qYaw;
        for (let i = 0; i < this.agents.length; i++) {
            const a = this.agents[i];
            let x, z, heading = a.heading ?? 0, moving = false;
            if (o.mode === 'orbit') {
                a.angle -= a.w * dt; // berlawanan arah jarum jam
                
                // Menghindari tabrakan (belok sedikit jika ada orang di depan)
                a.rOffset = a.rOffset || 0;
                let push = 0;
                for (const c of ACTIVE_CROWDS) {
                    for (let j = 0; j < c.agents.length; j++) {
                        const b = c.agents[j];
                        if (a === b || b.sit) continue;
                        const dx = a.wx - b.wx, dz = a.wz - b.wz;
                        const d = Math.hypot(dx, dz);
                        if (d > 0 && d < 1.2) { // menghindar jika jarak < 1.2m
                            const rdx = a.wx - o.center.x, rdz = a.wz - o.center.z;
                            const rl = Math.hypot(rdx, rdz) || 1;
                            let lat = (dx * rdx + dz * rdz) / rl;
                            if (Math.abs(lat) < 0.01) lat = (Math.random() - 0.5) * 0.1;
                            push += (1.2 - d) * (lat > 0 ? 1 : -1);
                        }
                    }
                }
                // Muluskan pergerakan menghindar
                a.rOffset += (push * 2.0 - a.rOffset) * dt * 4;
                if (a.rOffset > 3) a.rOffset = 3;
                if (a.rOffset < -3) a.rOffset = -3;
                
                let rad = a.r + a.rOffset;
                let nx = o.center.x + Math.cos(a.angle) * rad;
                let nz = o.center.z + Math.sin(a.angle) * rad;
                
                // Jangan tembus blocker
                const eng = ACTIVE_ENGINE;
                if (eng && !eng._walkableStatic(nx, nz, 0.32)) {
                    a.rOffset *= 0.5;
                    rad = a.r + a.rOffset;
                    nx = o.center.x + Math.cos(a.angle) * rad;
                    nz = o.center.z + Math.sin(a.angle) * rad;
                }
                // Solid check untuk orbit (Tawaf)
                if (eng && !eng._agentWalkable(a, nx, nz)) {
                    a.angle -= (a.v / o.rMax) * dt * o.angularSpeed * 10; // mundur (macet)
                    x = a.x; z = a.z;
                } else {
                    x = nx;
                    z = nz;
                }
                heading = -a.angle - Math.PI + (a.rOffset * 0.4);
                moving = true;
            } else if (o.mode === 'line') {
                const tPrev = a.t;
                a.t += a.v * dt * a.dir;
                if (a.t > 1) { 
                    if (o.oneWay) a.t -= 1; 
                    else { a.t = 1; a.uturnStart = true; }
                }
                if (a.t < 0) { 
                    if (o.oneWay) a.t += 1; 
                    else { a.t = 0; a.uturnStart = true; }
                }
                
                const px = o.to.z - o.from.z, pz = -(o.to.x - o.from.x);
                const pl = Math.hypot(px, pz) || 1;
                const orthX = px / pl, orthZ = pz / pl;
                const pathLenU = Math.hypot(o.to.x - o.from.x, o.to.z - o.from.z) || 1;
                const vLin = a.v * pathLenU; // kecepatan linier (m/s)

                if (a.uturnStart && !a.uturn) {
                    const lat0 = a.lane + (a.laneOffset || 0);
                    // Aturan sisi: kanan memutar ke kanan, kiri ke kiri; tapi bila
                    // sudah di luar batas lajur, memutar ke sisi DALAM agar arus
                    // tidak melebar keluar lintasan dari putaran ke putaran.
                    let side = (lat0 * a.dir) >= 0 ? 1 : -1;
                    if (Math.abs(lat0) > (o.width ?? 6) / 2) side = -Math.sign(lat0 || 1) * a.dir;
                    a.uturn = { side, r: 0.8 + Math.random() * 0.7, swept: 0, dir0: a.dir };
                }
                if (a.uturn) {
                    // Fase putar balik: berjalan MELENGKUNG setengah lingkaran ke
                    // sisi karakter (bukan berputar di tempat) sehingga arus pergi
                    // dan pulang tidak saling tertahan di ujung lintasan.
                    a.uturnStart = false;
                    const u = a.uturn;
                    const wRate = u.side * vLin / u.r;
                    a.hSmooth = (a.hSmooth ?? Math.atan2((o.to.x - o.from.x) * u.dir0, (o.to.z - o.from.z) * u.dir0)) + wRate * dt;
                    u.swept += Math.abs(wRate * dt);
                    const nxU = a.wx + Math.sin(a.hSmooth) * vLin * dt;
                    const nzU = a.wz + Math.cos(a.hSmooth) * vLin * dt;
                    const engU = ACTIVE_ENGINE;
                    if (!engU || engU._walkableStatic(nxU, nzU, 0.32)) { x = nxU; z = nzU; }
                    else { x = a.wx; z = a.wz; }
                    heading = a.hSmooth;
                    moving = true;
                    if (u.swept >= Math.PI) {
                        // Belokan selesai: masuk kembali ke lintasan pada lajur
                        // hasil proyeksi posisi sekarang, arah dibalik
                        a.uturn = null;
                        a.dir = -u.dir0;
                        const rxU = x - o.from.x, rzU = z - o.from.z;
                        a.t = Math.max(0, Math.min(1,
                            (rxU * (o.to.x - o.from.x) + rzU * (o.to.z - o.from.z)) / (pathLenU * pathLenU)));
                        // Terima lajur hasil belokan APA ADANYA — setelah geser,
                        // langsung lurus; tanpa koreksi menyamping ke lajur lama.
                        a.lane = rxU * orthX + rzU * orthZ;
                        a.laneOffset = 0; a.avoidOffset = 0; a.avoiding = false;
                    }
                } else {
                // Menghindari tabrakan dengan geser ke samping (lane)
                a.laneOffset = a.laneOffset || 0;
                let push = 0;
                for (const c of ACTIVE_CROWDS) {
                    for (let j = 0; j < c.agents.length; j++) {
                        const b = c.agents[j];
                        if (a === b || b.sit) continue;
                        const dx = a.wx - b.wx, dz = a.wz - b.wz;
                        const d = Math.hypot(dx, dz);
                        if (d > 0 && d < 1.2) {
                            let lat = dx * orthX + dz * orthZ;
                            if (Math.abs(lat) < 0.01) lat = (Math.random() - 0.5) * 0.1;
                            push += (1.2 - d) * (lat > 0 ? 1 : -1);
                        }
                    }
                }
                a.laneOffset += (push * 2.0 - a.laneOffset) * dt * 4;
                if (a.laneOffset > 3) a.laneOffset = 3;
                if (a.laneOffset < -3) a.laneOffset = -3;
                
                let finalLane = a.lane + a.laneOffset;
                const eng = ACTIVE_ENGINE;

                // Steering antisipatif ber-state: bila jalur bakal terhalang,
                // belok ke lajur bebas SEBELUM sampai di benda, KUNCI lajur
                // menghindar itu (lawan decay), dan baru kembali lurus setelah
                // lajur asal benar-benar bebas dari sekarang sampai jauh di depan.
                if (eng) {
                    const pathLen = Math.hypot(o.to.x - o.from.x, o.to.z - o.from.z) || 1;
                    const tA = a.t + (2.5 / pathLen) * a.dir;
                    const posAt = (tt, l) => [
                        o.from.x + (o.to.x - o.from.x) * tt + orthX * l,
                        o.from.z + (o.to.z - o.from.z) * tt + orthZ * l];
                    const free = (tt, l) => {
                        const [cx, cz] = posAt(tt, l);
                        return eng._walkableStatic(cx, cz, 0.45);
                    };
                    if (a.avoiding) {
                        // Masih manuver: lajur asal harus bebas di samping DAN
                        // jauh di depan sebelum boleh kembali lurus
                        if (free(a.t, a.lane) && free(tA, a.lane) && free(a.t + (5.5 / pathLen) * a.dir, a.lane)) {
                            a.avoiding = false;
                        } else {
                            a.laneOffset = a.avoidOffset; // kunci lajur menghindar
                        }
                    }
                    finalLane = a.lane + a.laneOffset;
                    if (!free(tA, finalLane)) {
                        let dl = 0;
                        for (const s of [1.2, -1.2, 2.4, -2.4, 3.6, -3.6]) {
                            if (free(tA, finalLane + s)) { dl = Math.sign(s); break; }
                        }
                        a.laneOffset += dl * dt * 3.5;
                        if (a.laneOffset > 8) a.laneOffset = 8;
                        if (a.laneOffset < -8) a.laneOffset = -8;
                        a.avoiding = true;
                    }
                    if (a.avoiding) a.avoidOffset = a.laneOffset;
                    finalLane = a.lane + a.laneOffset;
                }

                let nx = o.from.x + (o.to.x - o.from.x) * a.t + orthX * finalLane;
                let nz = o.from.z + (o.to.z - o.from.z) * a.t + orthZ * finalLane;

                // Jangan tembus blocker atau pemain/jamaah lain: bila terhalang,
                // JANGAN maju (mundurkan progres) lalu belok ke lajur yang bebas
                // agar arus mengalir memutari penghalang, bukan menembusnya.
                if (eng && !eng._agentWalkable(a, nx, nz)) {
                    a.t = tPrev;
                    const laneAt = l => [
                        o.from.x + (o.to.x - o.from.x) * a.t + orthX * l,
                        o.from.z + (o.to.z - o.from.z) * a.t + orthZ * l];
                    let dl = 0;
                    for (const s of [1.2, -1.2, 2.4, -2.4, 3.6, -3.6]) {
                        const [cx, cz] = laneAt(finalLane + s);
                        if (eng._agentWalkable(a, cx, cz)) { dl = Math.sign(s); break; }
                    }
                    a.laneOffset += dl * dt * 5;
                    [nx, nz] = laneAt(a.lane + a.laneOffset);
                }

                x = nx;
                z = nz;
                // Hadap ke arah gerak sesungguhnya: saat menghindar, badan
                // benar-benar berpaling kanan/kiri mengikuti sisi yang diambil,
                // lalu kembali menghadap lurus begitu jalur bebas.
                const pathH = Math.atan2((o.to.x - o.from.x) * a.dir, (o.to.z - o.from.z) * a.dir);
                const mvx = nx - a.wx, mvz = nz - a.wz;
                const mvd = Math.hypot(mvx, mvz);
                if (mvd > 3) {
                    a.hSmooth = pathH; // lompatan wrap oneWay — jangan berputar
                } else if (mvd > 1e-4) {
                    const hT = Math.atan2(mvx, mvz);
                    let dh = hT - (a.hSmooth ?? hT);
                    if (dh > Math.PI) dh -= Math.PI * 2;
                    if (dh < -Math.PI) dh += Math.PI * 2;
                    // Puter balik (~180°): arah memutar mengikuti sisi karakter
                    // terhadap jalur — sebelah kanan memutar ke kanan, sebelah
                    // kiri memutar ke kiri (dihitung relatif arah jalan lamanya)
                    if (Math.abs(dh) > 2.6) {
                        const lat = a.lane + a.laneOffset;
                        const side = (-lat * a.dir) >= 0 ? 1 : -1;
                        dh = side * Math.abs(dh);
                    }
                    a.hSmooth = (a.hSmooth ?? hT) + dh * Math.min(1, dt * 6);
                }
                heading = a.hSmooth ?? pathH;
                moving = true;
                }
            } else if (o.mode === 'wander') {
                const dx = a.tx - a.x, dz = a.tz - a.z;
                const d = Math.hypot(dx, dz);
                if (d < 0.35) {
                    if (a.dwell > 0) {
                        a.dwell -= dt;
                    } else {
                        a.tx = o.area.x + (Math.random() - 0.5) * o.area.w;
                        a.tz = o.area.z + (Math.random() - 0.5) * o.area.d;
                        a.dwell = 0.8 + Math.random() * 4;
                    }
                } else {
                    const target = Math.atan2(dx, dz);
                    // belok halus ke arah tujuan
                    let dh = target - a.heading;
                    if (dh > Math.PI) dh -= Math.PI * 2;
                    if (dh < -Math.PI) dh += Math.PI * 2;
                    a.heading += dh * Math.min(1, dt * 4);
                    // Steering antisipatif: intip ±1.6 m di depan — belok dulu
                    // ke arah bebas sebelum menyentuh dinding/bangunan
                    const eng = ACTIVE_ENGINE;
                    if (eng) {
                        const lx = a.x + Math.sin(a.heading) * 1.6;
                        const lz = a.z + Math.cos(a.heading) * 1.6;
                        if (!eng._walkableStatic(lx, lz, 0.45)) {
                            for (const s of [0.7, -0.7, 1.4, -1.4]) {
                                const hx = a.x + Math.sin(a.heading + s) * 1.6;
                                const hz = a.z + Math.cos(a.heading + s) * 1.6;
                                if (eng._walkableStatic(hx, hz, 0.45)) { a.heading += s * Math.min(1, dt * 5); break; }
                            }
                        }
                    }
                    const nx = a.x + Math.sin(a.heading) * a.v * dt;
                    const nz = a.z + Math.cos(a.heading) * a.v * dt;
                    // Solid: jangan menembus dinding/blocker/pemain — bila terhalang, pilih tujuan baru
                    if (eng && !eng._agentWalkable(a, nx, nz)) {
                        a.tx = o.area.x + (Math.random() - 0.5) * o.area.w;
                        a.tz = o.area.z + (Math.random() - 0.5) * o.area.d;
                        a.dwell = 0.3 + Math.random();
                    } else {
                        a.x = nx; a.z = nz;
                        moving = true;
                    }
                }
                x = a.x; z = a.z; heading = a.heading;
            } else if (o.mode === 'groupWander') {
                let leader = this.agents[a.groupId];
                if (!leader) leader = a;
                if (a.isLeader) {
                    const dx = a.tx - a.x, dz = a.tz - a.z;
                    const d = Math.hypot(dx, dz);
                    if (d < 0.35) {
                        if (a.dwell > 0) {
                            a.dwell -= dt;
                        } else {
                            a.tx = o.area.x + (Math.random() - 0.5) * o.area.w;
                            a.tz = o.area.z + (Math.random() - 0.5) * o.area.d;
                            a.dwell = 3 + Math.random() * 6;
                        }
                    } else {
                        const target = Math.atan2(dx, dz);
                        let dh = target - a.heading;
                        if (dh > Math.PI) dh -= Math.PI * 2;
                        if (dh < -Math.PI) dh += Math.PI * 2;
                        a.heading += dh * Math.min(1, dt * 4);
                        const nx = a.x + Math.sin(a.heading) * a.v * dt;
                        const nz = a.z + Math.cos(a.heading) * a.v * dt;
                        const eng = ACTIVE_ENGINE;
                        if (eng && !eng._agentWalkable(a, nx, nz)) {
                            a.tx = o.area.x + (Math.random() - 0.5) * o.area.w;
                            a.tz = o.area.z + (Math.random() - 0.5) * o.area.d;
                            a.dwell = 0.5 + Math.random();
                        } else {
                            a.x = nx; a.z = nz;
                            moving = true;
                        }
                    }
                } else {
                    const offsetIndex = i - a.groupId;
                    const offsetX = Math.cos(offsetIndex * Math.PI * 0.4) * 1.5;
                    const offsetZ = Math.sin(offsetIndex * Math.PI * 0.4) * 1.5;
                    const dx = (leader.x + offsetX) - a.x, dz = (leader.z + offsetZ) - a.z;
                    const d = Math.hypot(dx, dz);
                    if (d > 0.4) {
                        const speed = d > 2.0 ? a.v * 1.5 : a.v;
                        const target = Math.atan2(dx, dz);
                        let dh = target - a.heading;
                        if (dh > Math.PI) dh -= Math.PI * 2;
                        if (dh < -Math.PI) dh += Math.PI * 2;
                        a.heading += dh * Math.min(1, dt * 6);
                        
                        const nx = a.x + Math.sin(a.heading) * speed * dt;
                        const nz = a.z + Math.cos(a.heading) * speed * dt;
                        const eng = ACTIVE_ENGINE;
                        if (eng && !eng._agentWalkable(a, nx, nz)) {
                            a.x += dx * 0.1; // soft push
                            a.z += dz * 0.1;
                        } else {
                            a.x = nx; a.z = nz;
                        }
                        moving = true;
                    } else {
                        a.heading = leader.heading;
                    }
                }
                x = a.x; z = a.z; heading = a.heading;
            } else {
                x = a.x; z = a.z;
            }
            // Penjaga terakhir (semua mode): tidak ada satu figur pun boleh
            // berakhir di dalam blocker — bila hasil hitungan mode masih
            // menembus, tahan figur di posisi sahnya yang terakhir.
            const engG = ACTIVE_ENGINE;
            if (engG && !engG._walkableStatic(x, z, 0.32) && engG._walkableStatic(a.wx, a.wz, 0.3)) {
                x = a.wx; z = a.wz;
                if (a.x !== undefined) { a.x = x; a.z = z; }
                moving = false;
            }
            a.wx = x; a.wz = z;

            const sc = a.s;
            const wp = time * 5.5 * a.speed + a.phase;
            qYaw.setFromAxisAngle(this._up, heading);

            if (a.sit) {
                // Duduk: di kursi atau lesehan di lantai
                const isFloor = a.sitFloor;
                const base = isFloor ? 0.05 : (a.sitY ?? o.sitY ?? 0.46);
                const hipY = base * sc, shoY = (base + 0.48) * sc;
                // Jika di lantai, luruskan kaki ke depan (knee = 0.0)
                const tSw = -1.45, kB = isFloor ? 0.0 : 1.5;
                this._limb(this.thighL, this.shinL, this.footL, i, x, hipY, z, -0.1, 0.02, L.thigh, L.shin, tSw, kB, true, qYaw, sc);
                this._limb(this.thighR, this.shinR, this.footR, i, x, hipY, z, 0.1, 0.02, L.thigh, L.shin, tSw, kB, true, qYaw, sc);
                this._compose(this.pelvis, i, x, (base + 0.06) * sc, z, qYaw, sc);
                this._compose(this.torso, i, x, (base + 0.28) * sc, z, qYaw, sc);
                this._compose(this.neck, i, x, (base + 0.55) * sc, z, qYaw, sc);
                this._compose(this.head, i, x, (base + 0.68) * sc, z, qYaw, sc);
                this._capAt(a, i, x, (base + 0.72) * sc, z, qYaw, sc);
                this._facial(i, x, (base + 0.68) * sc, z, qYaw, sc);
                
                let uArmSw = -0.6, fArmSw = -0.85; // Default (duduk kursi)
                if (isFloor) {
                    uArmSw = 0.05; fArmSw = -0.1; // Tangan jatuh rileks di paha/samping
                }
                this._limb(this.uArmL, this.fArmL, this.handL, i, x, shoY, z, -0.23, 0, L.uArm, L.fArm, uArmSw, fArmSw, false, qYaw, sc);
                this._limb(this.uArmR, this.fArmR, this.handR, i, x, shoY, z, 0.23, 0, L.uArm, L.fArm, uArmSw, fArmSw, false, qYaw, sc);
            } else {
                a.walkBlend = a.walkBlend || 0;
                if (moving) {
                    a.walkBlend = Math.min(1, a.walkBlend + dt * 5);
                } else {
                    a.walkBlend = Math.max(0, a.walkBlend - dt * 5);
                }
                const bob = a.walkBlend * (Math.abs(Math.sin(wp)) * 0.05) + (1 - a.walkBlend) * (Math.sin(time * 1.4 + a.phase) * 0.006);
                const base = 0.94 + bob;
                const hipY = base * sc, shoY = (base + 0.48) * sc;
                // Kaki: ayun pinggul berlawanan + tekuk lutut saat melangkah maju
                const swL = Math.sin(wp) * 0.42 * a.walkBlend;
                const swR = Math.sin(wp + Math.PI) * 0.42 * a.walkBlend;
                const kneeL = Math.max(0, -Math.cos(wp)) * 0.85 * a.walkBlend + 0.05;
                const kneeR = Math.max(0, -Math.cos(wp + Math.PI)) * 0.85 * a.walkBlend + 0.05;
                this._limb(this.thighL, this.shinL, this.footL, i, x, hipY, z, -0.1, 0, L.thigh, L.shin, swL, kneeL, true, qYaw, sc);
                this._limb(this.thighR, this.shinR, this.footR, i, x, hipY, z, 0.1, 0, L.thigh, L.shin, swR, kneeR, true, qYaw, sc);
                this._compose(this.pelvis, i, x, (base + 0.02) * sc, z, qYaw, sc);
                this._compose(this.torso, i, x, (base + 0.28) * sc, z, qYaw, sc);
                this._compose(this.neck, i, x, (base + 0.55) * sc, z, qYaw, sc);
                this._compose(this.head, i, x, (base + 0.69) * sc, z, qYaw, sc);
                this._capAt(a, i, x, (base + 0.73) * sc, z, qYaw, sc);
                this._facial(i, x, (base + 0.69) * sc, z, qYaw, sc);
                // Lengan: ayun berlawanan kaki + siku sedikit menekuk
                const armIdle = Math.sin(time * 1.4 + a.phase) * 0.03;
                const aSw = -Math.sin(wp) * 0.38 * a.walkBlend + armIdle * (1 - a.walkBlend);
                
                let uSwL = aSw, uSwR = -aSw, fSw = -0.28;
                this._limb(this.uArmL, this.fArmL, this.handL, i, x, shoY, z, -0.23, 0, L.uArm, L.fArm, uSwL, fSw, false, qYaw, sc);
                this._limb(this.uArmR, this.fArmR, this.handR, i, x, shoY, z, 0.23, 0, L.uArm, L.fArm, uSwR, fSw, false, qYaw, sc);
            }
        }
        for (const p of this.parts) p.instanceMatrix.needsUpdate = true;
    }
}
