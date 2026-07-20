/**
 * VR Education Haji & Umrah â€” Definisi 12 Scene (termasuk Wukuf Arafah)
 * Setiap scene: { env, ambient, build(engine), run(engine, ctx) }
 * ctx: { checkpoint(n), complete(), progress(pct) }
 * Alur mengikuti dokumen protokol 02..12 (Activity Flow).
 */
import { THREE, Crowd } from './engine.js';
import * as B from './builders.js';

const IHRAM = [0xffffff, 0xf6f3ea, 0xefece2];
const CASUAL = [0x8a6a4a, 0x4a6a8a, 0x6a8a5a, 0x8a4a5a, 0xd8d2c2, 0x5a5a6a, 0x3f5c46];

function marker(engine, x, z, color = 0x37c978, r = 0.8) {
    const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 0.06, 24),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }));
    m.position.set(x, 0.04, z);
    engine.scene.add(m);
    return m;
}

/* ---------- Mekanik bersama ---------- */

/** Tawaf: 7 putaran mengelilingi Ka'bah. */
async function tawafMechanic(engine, { namaTawaf = 'Tawaf', duas = [] }) {
    const startMk = marker(engine, 24, 5.3, 0x37c978, 1.2);
    await engine.goto(24, 5.3, { radius: 2.6, label: `Menuju garis sejajar Hajar Aswad (garis coklat)` });
    engine.scene.remove(startMk);

    await engine.narrate(
        'Angkat tangan kanan ke arah Hajar Aswad sambil mengucap Bismillahi Allahu Akbar. Inilah istilam, tanda dimulainya ' + namaTawaf + '.',
        { sub: 'âœ‹ Istilam: "Bismillahi Allahu Akbar" â€” ' + namaTawaf + ' dimulai' });

    engine.setObjective(`${namaTawaf}: kelilingi Ka'bah 7 putaran â€” Ka'bah selalu di sisi KIRI Anda`);
    engine.setHint('Berjalanlah berlawanan arah jarum jam mengikuti arus jamaah');

    let lap = 0, accum = 0;
    let prev = Math.atan2(engine.camera.position.z, engine.camera.position.x);
    engine.setCounter(`ðŸ•‹ Putaran<br>0 / 7`);
    await new Promise(resolve => {
        engine.onUpdate((dt, t, self) => {
            const p = engine.camera.position;
            const a = Math.atan2(p.z, p.x);
            let d = a - prev;
            if (d > Math.PI) d -= Math.PI * 2;
            if (d < -Math.PI) d += Math.PI * 2;
            prev = a;
            const dist = Math.hypot(p.x, p.z);
            if (dist > 8 && dist < 66) accum += d;
            const done = Math.floor(Math.abs(accum) / (Math.PI * 2));
            if (done > lap) {
                lap = done;
                engine.audio.sfx('collect');
                engine.setCounter(`ðŸ•‹ Putaran<br>${Math.min(lap, 7)} / 7`);
                const dua = duas[(lap - 1) % Math.max(duas.length, 1)];
                if (dua) engine.narrate(dua.t, { sub: dua.s });
                if (lap >= 7) { self.done = true; resolve(); }
            }
        });
    });
    engine.setCounter('');
    engine.setHint('');
    engine.audio.sfx('success');
    await engine.narrate('Alhamdulillah, tujuh putaran ' + namaTawaf.toLowerCase() + ' telah sempurna.',
        { sub: `âœ… ${namaTawaf} selesai â€” 7 putaran sempurna` });
}

/** Sa'i: 7 perjalanan Shafa â†” Marwah. */
async function saiMechanic(engine, refs, { namaSai = "Sa'i" } = {}) {
    let trips = 0;
    await engine.goto(refs.shafaX + 6, 0, { radius: 3.5, label: 'Menuju Bukit Shafa â€” titik awal Sa\'i' });
    await engine.narrate(
        'Innash shafaa wal marwata min sya\'aairillah. Sesungguhnya Shafa dan Marwah adalah sebagian dari syiar Allah. Kita mulai dari Shafa.',
        { sub: 'ðŸ“– "Innash-shafaa wal-marwata min sya\'aairillah" (QS 2:158)' });

    engine.setObjective(`${namaSai}: berjalan Shafa â†’ Marwah â†’ Shafa â€¦ total 7 perjalanan`);
    let target = 'marwah';
    engine.setCounter(`ðŸƒ Perjalanan<br>0 / 7`);
    engine.showWaypoint(refs.marwahX - 4, 0);
    await new Promise(resolve => {
        engine.onUpdate((dt, t, self) => {
            const x = engine.camera.position.x;
            engine.setHint(Math.abs(x) < 15 ? 'ðŸ’š Area lampu hijau â€” laki-laki disunnahkan berlari-lari kecil' : '');
            if (trips >= 7) {
                engine.hideWaypoint();
                self.done = true;
                resolve();
            }

            if (target === 'marwah' && x > refs.marwahX - 6) {
                trips++;
                target = 'shafa';
                engine.audio.sfx('collect');
                engine.setCounter(`ðŸƒ Perjalanan<br>${trips} / 7`);
                if (trips < 7) {
                    engine.showWaypoint(refs.shafaX + 4, 0);
                    engine.narrate('Anda tiba di Marwah. Berdoalah menghadap Ka\'bah, lalu lanjutkan menuju Shafa.',
                        { sub: `â›° Marwah â€” perjalanan ke-${trips} selesai. Berdoa, lalu lanjut.` });
                }
            } else if (target === 'shafa' && x < refs.shafaX + 6) {
                trips++;
                target = 'marwah';
                engine.audio.sfx('collect');
                engine.setCounter(`ðŸƒ Perjalanan<br>${trips} / 7`);
                if (trips < 7) {
                    engine.showWaypoint(refs.marwahX - 4, 0);
                    engine.narrate('Anda tiba di Shafa. Berdoalah, lalu lanjutkan menuju Marwah.',
                        { sub: `â›° Shafa â€” perjalanan ke-${trips} selesai. Berdoa, lalu lanjut.` });
                }
            }
        });
    });
    
    engine.setCounter('');
    engine.setHint('');
    engine.audio.sfx('success');
    await engine.narrate('Alhamdulillah, tujuh perjalanan Sa\'i telah sempurna dan berakhir di Marwah.',
        { sub: 'âœ… Sa\'i selesai â€” 7 perjalanan, berakhir di Marwah' });
}

/** Melontar batu ke jumrah. */
async function throwStones(engine, pillarGroup, { need = 7, nama = 'Jumrah Aqabah', approach } = {}) {
    if (approach) {
        await engine.goto(approach.x, approach.z, { radius: 4, label: `Menuju ${nama}` });
    }
    engine.setObjective(`Lontar ${need} batu ke ${nama} â€” arahkan pandangan lalu klik`);
    engine.setCounter(`ðŸª¨ Lontaran<br>0 / ${need}`);
    let hits = 0;
    let thrown = 0;
    const stoneGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8ab96, roughness: 0.9 });
    
    // UI Improvement: Tampilkan beacon cahaya pada tiang jumrah agar pemain tahu ke mana harus melempar
    const pPos = pillarGroup.getWorldPosition(new THREE.Vector3());
    engine.showWaypoint(pPos.x, pPos.z, 0xd95757); // Warna merah/orange penanda Jumrah
    
    await new Promise(resolve => {
        engine.addInteractable(pillarGroup, {
            label: `Lontar batu â€” "Bismillahi Allahu Akbar"`,
            once: false, radius: 30,
            onClick: () => {
                if (thrown >= need) return; // Mencegah spam klik melempar batu berlebih
                thrown++;
                engine.audio.sfx('throw');
                const stone = new THREE.Mesh(stoneGeo, stoneMat);
                const from = engine.camera.position.clone();
                from.y -= 0.15;
                const to = pillarGroup.getWorldPosition(new THREE.Vector3());
                to.y = 4 + Math.random() * 3;
                stone.position.copy(from);
                engine.scene.add(stone);
                let tt = 0;
                engine.onUpdate((dt, _t, self) => {
                    tt += dt * 1.8;
                    if (tt >= 1) {
                        engine.scene.remove(stone);
                        self.done = true;
                        hits++;
                        engine.audio.sfx('collect'); // Suara batu mengenai pilar
                        engine.setCounter(`ðŸª¨ Lontaran<br>${hits} / ${need}`);
                        engine.subtitle(`"Bismillahi Allahu Akbar" â€” lontaran ke-${hits}`);
                        if (hits >= need) {
                            engine.removeInteractable(pillarGroup);
                            engine.hideWaypoint();
                            resolve();
                        }
                        return;
                    }
                    stone.position.lerpVectors(from, to, tt);
                    stone.position.y += Math.sin(tt * Math.PI) * 2.2;
                });
            }
        });
    });
    engine.setCounter('');
    engine.audio.sfx('success');
    await engine.narrate(`Alhamdulillah, ${need} lontaran ke ${nama} telah sempurna.`,
        { sub: `âœ… ${nama} â€” ${need} lontaran selesai` });
}

/* ============================================================
 * SCENE 01 â€” BERANGKAT DARI INDONESIA
 * ============================================================ */
const scene01 = {
    env: 'day', ambient: 'airport',
    build(engine) {
        const refs = B.airport(engine);
        refs.cabin = B.airplaneCabin(engine);
        const usedSeats = refs.cabin.seatSpots.filter((_, idx) => idx !== 25 && Math.random() > 0.35);
        new Crowd(engine.scene, { count: usedSeats.length, mode: 'sit', spots: usedSeats, sitY: 0.45, colors: CASUAL });
        refs.playerSeat = refs.cabin.seatSpots[25];
        // penumpang berjalan-jalan di concourse tengah & sisi utara
        new Crowd(engine.scene, { count: 26, mode: 'wander', area: { x: -2, z: -1, w: 62, d: 12 }, colors: CASUAL });
        new Crowd(engine.scene, { count: 12, mode: 'wander', area: { x: 0, z: 22, w: 56, d: 8 }, colors: CASUAL });
        // arus penumpang melintasi hall
        new Crowd(engine.scene, { count: 10, mode: 'line', from: { x: -34, z: -4 }, to: { x: 34, z: 4 }, width: 5, colors: CASUAL });
        // penumpang duduk di bangku ruang tunggu
        new Crowd(engine.scene, { count: 26, mode: 'sit', spots: refs.seatSpots, sitY: 0.5, colors: CASUAL });
        // antrian di depan check-in
        new Crowd(engine.scene, { count: 6, mode: 'idle', area: { x: -26, z: -20.2, w: 8, d: 1 }, colors: CASUAL });
        // petugas berjaga di tiap booth: check-in, imigrasi, kafe, gate
        new Crowd(engine.scene, { count: refs.staffSpots.length, mode: 'post', spots: refs.staffSpots, capChance: 0.75 });
        engine.spawn(0, 20, 0);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Assalamualaikum. Selamat datang di simulasi VR Haji dan Umrah. Perjalanan suci Anda dimulai hari ini dari bandara di Indonesia. Pastikan dokumen penting berada di tas tangan: paspor, visa, dan tiket.',
            { sub: 'ðŸ›« Selamat datang! Perjalanan dimulai dari bandara Indonesia. Siapkan paspor, visa, dan tiket di tas tangan.' });
        ctx.progress(10);

        await engine.goto(-24, -20, { label: 'Menuju counter check-in' });
        await engine.interact(engine._sceneRefs.counters.children[0], {
            label: 'Check-in & serahkan bagasi', radius: 8
        });
        engine.audio.sfx('stamp');
        engine.notifyDotnet('Boarding pass diterima! Bagasi 25 kg diterima.', 'success');
        await engine.narrate(
            'Petugas memeriksa paspor dan tiket Anda. Bagasi ditimbang â€” pastikan tidak melebihi batas. Boarding pass sudah di tangan. Simpan baik-baik.',
            { sub: 'ðŸŽ« Check-in selesai â€” boarding pass diterima, bagasi diserahkan.' });
        ctx.progress(30);

        await engine.goto(22, -14, { label: 'Menuju pemeriksaan imigrasi' });
        await engine.interact(engine._sceneRefs.imigrasi.children[0], {
            label: 'Serahkan paspor ke petugas imigrasi', radius: 8
        });
        engine.audio.sfx('stamp');
        await engine.narrate(
            'Petugas imigrasi memeriksa dan mencap paspor Anda. Proses keimigrasian selesai. Selanjutnya kita menuju checkpoint pemahaman pertama.',
            { sub: 'ðŸ›‚ Paspor dicap â€” pemeriksaan imigrasi selesai.' });
        ctx.progress(45);

        await ctx.checkpoint(1);
        ctx.progress(60);

        await engine.goto(36, 18, { label: 'Menuju Gate 12 untuk boarding' });
        await engine.interact(engine._sceneRefs.gate, { label: 'Boarding â€” masuk ke pesawat', radius: 8 });
        await engine.narrate('Silakan masuk, kita menuju kabin pesawat.', { sub: 'âœˆ Boardingâ€¦' });
        await engine.teleport(10.5, 400, 90);
        engine.audio.ambient('interior', 0.3);
        ctx.progress(75);

        const ps = engine._sceneRefs.playerSeat;
        await engine.goto(ps.x, ps.z, { radius: 1.5, label: 'Berjalan ke kursi Anda' });
        
        // Animasi POV duduk
        await engine.fadeOut(600);
        engine.camera.position.set(ps.x - 0.05, 1.25, ps.z); // Pov duduk bersandar (tinggi mata ~1.25m)
        engine.camera.rotation.set(0, -Math.PI / 2, 0, 'YXZ');
        engine._camTargetYaw = undefined; // reset smoothing
        engine.walkRects.length = 0; // kunci pergerakan
        await engine.fadeIn(600);

        await engine.narrate(
            'Duduklah dengan tenang. Saat pesawat mulai bergerak, bacalah doa safar: Subhanalladzi sakhkhara lana hadza wama kunna lahu muqrinin. Wa inna ila rabbina lamunqalibun. Mahasuci Allah yang menundukkan kendaraan ini bagi kami.',
            { sub: 'ðŸ¤² Doa safar: "Subhanalladzii sakhkhara lanaa haadzaa wamaa kunnaa lahuu muqriniinâ€¦"' });
        await engine.narrate(
            'Selama perjalanan sekitar sembilan jam, perbanyak dzikir, jaga kesehatan, minum air cukup, dan istirahat. Bersabarlah â€” perjalanan ini bagian dari ibadah.',
            { sub: 'ðŸ’¡ Perbanyak dzikir, minum air cukup, dan istirahat selama penerbangan.' });
        ctx.progress(90);

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 02 â€” TIBA DI MADINAH
 * ============================================================ */
const scene02 = {
    env: 'goldenHour', ambient: 'airport',
    build(engine) {
        const refs = B.airport(engine, { nameSign: 'Ù…Ø·Ø§Ø± Ø§Ù„Ø£Ù…ÙŠØ± Ù…Ø­Ù…Ø¯ Ø¨Ù† Ø¹Ø¨Ø¯Ø§Ù„Ø¹Ø²ÙŠØ² â€” MADINAH', arabic: true });
        refs.nabawiOrigin = { x: 0, z: 600 };
        // Masjid Nabawi dibangun di "dunia" terpisah â€” dibangun saat transisi
        new Crowd(engine.scene, { count: 20, mode: 'wander', area: { x: 4, z: -1, w: 50, d: 12 }, colors: CASUAL });
        new Crowd(engine.scene, { count: 14, mode: 'sit', spots: refs.seatSpots, sitY: 0.5, colors: CASUAL });
        // petugas berjaga di tiap booth: check-in, imigrasi, kafe, gate
        new Crowd(engine.scene, { count: refs.staffSpots.length, mode: 'post', spots: refs.staffSpots, capChance: 0.75 });
        engine.spawn(-30, 10, -120);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Alhamdulillah, setelah menempuh penerbangan panjang, Anda tiba di Bandara Pangeran Muhammad bin Abdul Aziz, Madinah. Kota ini disebut Madinah Al-Munawwarah â€” kota yang bercahaya.',
            { sub: 'ðŸ•Œ Selamat datang di Madinah Al-Munawwarah!' });
        ctx.progress(10);

        await engine.goto(22, -14, { label: 'Menuju booth imigrasi Arab Saudi' });
        await engine.interact(engine._sceneRefs.imigrasi.children[0], {
            label: 'Serahkan paspor & visa', radius: 8
        });
        engine.audio.sfx('stamp');
        await engine.narrate(
            'Petugas menyapa: Ahlan wa sahlan! Paspor dan visa diperiksa, sidik jari direkam. Petugas umumnya berbahasa Arab dan Inggris. Tetap tenang dan antri dengan tertib.',
            { sub: 'ðŸ›‚ "Ahlan wa sahlan!" â€” imigrasi selesai. Petugas berbahasa Arab & Inggris.' });
        ctx.progress(30);

        await ctx.checkpoint(1);
        ctx.progress(50);

        await engine.narrate(
            'Bus jamaah membawa Anda ke hotel untuk menyimpan bagasi. Menjelang maghrib, kita berjalan menuju Masjid Nabawi â€” masjid yang dibangun langsung oleh Rasulullah shallallahu alaihi wasallam.',
            { sub: 'ðŸšŒ Perjalanan bus â†’ hotel â†’ Masjid Nabawi menjelang maghribâ€¦' });

        // Transisi ke pelataran Masjid Nabawi
        await engine.fadeOut(1000);
        // bersihkan area jalan lama, bangun Nabawi di lokasi terpisah
        engine.walkRects.length = 0;
        engine.blockers.length = 0;
        const o = engine._sceneRefs.nabawiOrigin;
        const nb = B.nabawi(engine, o);
        // Jamaah memenuhi pelataran di bawah payung dan mengalir ke arah gerbang
        new Crowd(engine.scene, { count: 150, mode: 'idle', area: { x: o.x, z: o.z - 6, w: 150, d: 64 }, colors: CASUAL });
        new Crowd(engine.scene, { count: 60, mode: 'line', from: { x: o.x - 44, z: o.z + 6 }, to: { x: o.x, z: o.z - 36 }, width: 12, colors: CASUAL });
        new Crowd(engine.scene, { count: 40, mode: 'wander', area: { x: o.x, z: o.z + 22, w: 130, d: 22 }, colors: CASUAL });
        engine.spawn(o.x, o.z - 18, 0);
        await engine.fadeIn(1000);
        engine.audio.ambient('crowd', 0.3);
        ctx.progress(65);

        await engine.narrate(
            'Subhanallah. Di hadapan Anda berdiri Masjid Nabawi. Payung-payung raksasa itu terbuka menaungi pelataran â€” perhatikan motif arabesque hijau tosca dan emas di bawahnya. Di kejauhan, Kubah Hijau menaungi makam Rasulullah shallallahu alaihi wasallam. Sholat di masjid ini bernilai seribu kali lipat.',
            { sub: 'ðŸ’š Payung raksasa bermotif arabesque & Kubah Hijau. Sholat di sini bernilai 1000Ã—.' });

        engine.setHint('Arahkan pandangan ke atas untuk melihat motif payung Â· WASD berjalan');
        await engine.goto(nb.gatePos.x, nb.gatePos.z, { radius: 3.5, label: 'Berjalan di bawah payung menuju gerbang Masjid Nabawi' });
        await engine.narrate(
            'Sebelum masuk: dahulukan kaki kanan dan baca doa, Allahummaftah lii abwaaba rahmatik â€” Ya Allah bukakanlah untukku pintu-pintu rahmat-Mu. Di dalam, jaga ketenangan, dan bila memungkinkan sholatlah di Raudhah, taman surga.',
            { sub: 'ðŸšª Masuk kaki kanan + doa: "Allahummaftah lii abwaaba rahmatik". Raudhah = taman surga.' });
        ctx.progress(85);

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 03 â€” MIQAT & NIAT UMRAH
 * ============================================================ */
const scene03 = {
    env: 'day', ambient: 'wind',
    build(engine) {
        const refs = B.miqat(engine);
        new Crowd(engine.scene, { count: 18, mode: 'idle', area: { x: 8, z: -6, w: 24, d: 16 }, colors: IHRAM });
        new Crowd(engine.scene, { count: 8, mode: 'idle', area: { x: -16, z: 6, w: 14, d: 8 }, colors: CASUAL });
        new Crowd(engine.scene, { count: 14, mode: 'sit', spots: refs.seatSpots, sitY: 1.0, colors: CASUAL });
        refs.playerSeat = refs.seatSpots[15] || refs.seatSpots[0];
        engine.spawn(refs.playerSeat.x, refs.playerSeat.z, THREE.MathUtils.radToDeg(refs.playerSeat.ry) + 180, 1.6);
        return refs;
    },
    async run(engine, ctx) {
        engine.walkRects.length = 0;

        await engine.narrate(
            'Alhamdulillah, kita telah tiba di Bir Ali — Dzul Hulaifah. Inilah miqat bagi jamaah yang datang dari arah Madinah. Dari sinilah dimulai perjalanan ibadah yang agung.',
            { sub: '📍 Bir Ali (Dzul Hulaifah) — miqat jamaah dari Madinah.' });

        await engine.narrate(
            'Miqat adalah batas wajib berihram. Ada lima miqat makani: Dzul Hulaifah, Juhfah, Qarnul Manazil, Yalamlam, dan Dzatu Irqin. Melewati miqat tanpa berihram wajib membayar dam.',
            { sub: 'Lima miqat makani ditetapkan Rasulullah ﷺ. Melewatinya tanpa ihram = dam.' });

        ctx.progress(8);

        await engine.interact(engine._sceneRefs.busDoor, { label: '🚌 Keluar dari bus menuju pelataran miqat', radius: 12 });

        await engine.fadeOut(700);
        engine.walkRects.length = 0;
        engine.addWalkRect(-38, -22, 38, 28);
        engine.spawn(18, 18, 270);
        await engine.fadeIn(700);
        engine.audio.ambient('crowd', 0.28);
        ctx.progress(12);

        await engine.narrate(
            'Sebelum berihram, disunnahkan mandi janabat, memotong kuku, merapikan rambut, dan memakai wewangian di badan — bukan di pakaian ihram. Wewangian hanya boleh sebelum niat.',
            { sub: '🚿 Mandi sunnah, potong kuku, merapikan diri, wewangian di badan (sebelum niat).' });

        await engine.goto(-28, -4, { label: '🚿 Menuju area wudhu & mandi ihram' });
        await engine.interact(engine._sceneRefs.bilik, { label: 'Mandi sunnah ihram & berwudhu', radius: 8 });
        engine.audio.sfx('chime');
        ctx.progress(28);

        await engine.narrate(
            'Laki-laki mengenakan dua helai kain putih tanpa jahitan: izar menutup aurat bawah, dan rida di bahu. Kepala dibiarkan terbuka. Perempuan berpakaian menutup seluruh aurat namun wajah dan telapak tangan tetap terbuka.',
            { sub: '🤍 Ihram: 2 helai kain putih tanpa jahitan (laki-laki). Simbol kesetaraan hamba Allah.' });

        await engine.goto(-6, -12, { label: '👘 Ambil kain ihram' });
        await engine.interact(engine._sceneRefs.rak, { label: 'Kenakan kain ihram', radius: 7 });
        await engine.fadeOut(800);
        await engine.fadeIn(800);
        engine.notifyDotnet('Anda kini mengenakan kain ihram putih. Masya Allah!', 'success');
        ctx.progress(45);

        await engine.narrate(
            'Setelah berwudhu dan mengenakan ihram, kerjakan shalat sunnah dua rakaat. Rakaat pertama membaca surat Al-Kafirun, rakaat kedua membaca surat Al-Ikhlas. Ini adalah sunnah sebelum niat ihram.',
            { sub: '🕌 Shalat sunnah ihram 2 rakaat: Al-Kafirun & Al-Ikhlas.' });

        await engine.goto(6, -14, { label: '🕌 Menuju karpet shalat sunnah ihram 2 rakaat' });
        await engine.interact(engine._sceneRefs.sajadah, { label: 'Shalat sunnah ihram 2 rakaat', radius: 6 });
        engine.audio.sfx('chime');
        ctx.progress(58);

        await ctx.checkpoint(1);
        ctx.progress(70);

        await engine.narrate(
            'Setelah salam, ucapkan niat ihram umrah: Labbaika Allahumma umratan — Aku penuhi panggilan-Mu ya Allah untuk umrah. Niat ini menandai dimulainya ihram dan seluruh larangan ihram mulai berlaku.',
            { sub: '🤲 NIAT: "Labbaika Allahumma \'umratan" — larangan ihram mulai berlaku sejak kini.' });

        await engine.narrate(
            'Langsung iringi niat dengan talbiyah: Labbaik Allahumma labbaik, labbaika laa syariika laka labbaik, innal hamda wan ni\'mata laka wal mulk, laa syariika lak. Ucapkan berulang-ulang hingga sampai Makkah.',
            { sub: '📢 TALBIYAH: "Labbaik Allahumma labbaik…" — ucapkan sepanjang perjalanan menuju Makkah.' });

        ctx.progress(80);

        await engine.goto(18, 18, { radius: 5, label: '🚌 Naik bus menuju Makkah sambil bertalbiyah' });
        await engine.interact(engine._sceneRefs.bus, { label: 'Naik bus menuju Makkah', radius: 10 });
        ctx.progress(90);

        await engine.narrate(
            'Allahumma labbaik. Mari berangkat menuju Makkah Al-Mukarramah. Terus lantunkan talbiyah di perjalanan hingga memulai tawaf.',
            { sub: '🕋 Berangkat ke Makkah! Terus bertalbiyah hingga Tawaf dimulai.' });

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 04 â€” MASUK MASJIDIL HARAM
 * ============================================================ */
const scene04 = {
    env: 'goldenHour', ambient: 'crowd',
    build(engine) {
        const refs = B.masjidilHaram(engine);
        new Crowd(engine.scene, { count: 160, mode: 'orbit', center: { x: 0, z: 0 }, rMin: 11, rMax: 24, angularSpeed: 0.09, colors: IHRAM, scene: engine.scene });
        new Crowd(engine.scene, { count: 50, mode: 'idle', area: { x: 0, z: 52, w: 90, d: 24 }, colors: IHRAM });
        engine.spawn(0, 64, 0);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Anda tiba di kota suci Makkah Al-Mukarramah dalam keadaan berihram. Di hadapan Anda berdiri Masjidil Haram â€” masjid paling suci, kiblat umat Islam seluruh dunia.',
            { sub: 'ðŸ•Œ Makkah Al-Mukarramah â€” Masjidil Haram di hadapan Anda.' });
        ctx.progress(15);

        await engine.goto(0, 40, { radius: 3.5, label: 'Berjalan menuju pintu Masjidil Haram' });
        await engine.narrate(
            'Masuklah dengan kaki kanan sambil membaca: Allahummaftah lii abwaaba rahmatik. Jaga pandangan, jaga adab, dan rendahkan hati.',
            { sub: 'ðŸšª Kaki kanan + doa: "Allahummaftah lii abwaaba rahmatik".' });
        ctx.progress(35);

        await engine.goto(0, 26, { radius: 3, label: 'Terus melangkah â€” sebentar lagi Anda melihat Ka\'bah' });
        await engine.narrate(
            'Subhanallahâ€¦ Itulah Ka\'bah, Baitullah. Saat pertama memandangnya, angkat kedua tangan dan berdoalah â€” inilah salah satu waktu doa yang mustajab. Mintalah apa saja kebaikan dunia dan akhirat.',
            { sub: 'ðŸ•‹ PANDANGAN PERTAMA KE KA\'BAH â€” angkat tangan, berdoalah (waktu mustajab).' });
        engine.audio.sfx('chime');
        ctx.progress(55);

        await engine.goto(18, 10, { radius: 3, label: 'Mendekat ke tepi mataf' });
        await engine.narrate(
            'Perhatikan sudut Ka\'bah dengan bingkai perak â€” di sanalah Hajar Aswad, batu dari surga. Di dekatnya ada pintu Ka\'bah berlapis emas, dan area di antaranya disebut Multazam, tempat doa yang mustajab. Bangunan kecil berkubah emas itu adalah Maqam Ibrahim.',
            { sub: 'ðŸ‘€ Kenali: Hajar Aswad (bingkai perak) Â· Pintu Ka\'bah Â· Multazam Â· Maqam Ibrahim.' });
        ctx.progress(75);

        await ctx.checkpoint(1);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 05 â€” TAWAF UMRAH
 * ============================================================ */
const scene05 = {
    env: 'night', ambient: 'crowd',
    build(engine) {
        const refs = B.masjidilHaram(engine);
        new Crowd(engine.scene, { count: 200, mode: 'orbit', center: { x: 0, z: 0 }, rMin: 10.5, rMax: 26, angularSpeed: 0.09, colors: IHRAM });
        new Crowd(engine.scene, { count: 30, mode: 'idle', area: { x: 0, z: 50, w: 80, d: 20 }, colors: IHRAM });
        engine.spawn(30, 22, 54);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Malam di Masjidil Haram. Kini saatnya melaksanakan Tawaf Umrah â€” mengelilingi Ka\'bah tujuh putaran berlawanan arah jarum jam, dengan Ka\'bah selalu di sisi kiri. Pastikan Anda dalam keadaan suci dari hadas.',
            { sub: 'ðŸŒ™ Tawaf Umrah: 7 putaran, Ka\'bah di sisi kiri, wajib suci dari hadas.' });
        ctx.progress(10);

        await tawafMechanic(engine, {
            namaTawaf: 'Tawaf Umrah',
            duas: [
                { t: 'Rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina adzaban nar.', s: 'ðŸ¤² "Rabbanaa aatinaa fid-dunyaa hasanah, wa fil-aakhirati hasanah, wa qinaa \'adzaaban-naar"' },
                { t: 'Subhanallah walhamdulillah wa laa ilaha illallah wallahu akbar.', s: 'ðŸ“¿ "Subhanallah, walhamdulillah, wa laa ilaaha illallah, wallahu akbar"' },
                { t: 'Perbanyak doa pribadi Anda â€” tawaf adalah sholat, berbicaralah hanya yang baik.', s: 'ðŸ’¬ Perbanyak doa pribadi â€” tawaf adalah ibadah seperti sholat.' }
            ]
        });
        ctx.progress(60);

        await engine.goto(11, 8.5, { radius: 3, label: 'Menuju Maqam Ibrahim â€” sholat sunnah tawaf' });
        await engine.interact(engine._sceneRefs.maqam, { label: 'Sholat sunnah 2 rakaat di belakang Maqam Ibrahim', radius: 6 });
        await engine.narrate(
            'Kerjakan sholat sunnah dua rakaat di belakang Maqam Ibrahim: rakaat pertama Al-Kafirun, rakaat kedua Al-Ikhlas. Setelah itu minumlah air Zamzam sambil berdoa.',
            { sub: 'ðŸ•Œ Sholat 2 rakaat di Maqam Ibrahim, lalu minum air Zamzam.' });
        ctx.progress(80);

        await ctx.checkpoint(1);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 06 â€” SA'I UMRAH
 * ============================================================ */
const scene06 = {
    env: 'night', ambient: 'crowd',
    build(engine) {
        const refs = B.masaa(engine);
        // Jamaah arah Shafa ke Marwah (Jalur Kanan, z: 4.5)
        new Crowd(engine.scene, { count: 45, mode: 'line', from: { x: refs.shafaX + 12, z: 4.5 }, to: { x: refs.marwahX - 12, z: 4.5 }, width: 6.5, colors: IHRAM, oneWay: true });
        // Jamaah arah Marwah ke Shafa (Jalur Kiri, z: -4.5)
        new Crowd(engine.scene, { count: 45, mode: 'line', from: { x: refs.marwahX - 12, z: -4.5 }, to: { x: refs.shafaX + 12, z: -4.5 }, width: 6.5, colors: IHRAM, oneWay: true });
        
        engine.spawn(refs.shafaX + 22, 4, -90);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Selamat datang di Mas\'a, lintasan Sa\'i antara bukit Shafa dan Marwah. Sa\'i mengenang perjuangan Siti Hajar yang berlari tujuh kali mencari air untuk putranya Ismail, hingga Allah memancarkan air Zamzam.',
            { sub: 'â›° Mas\'a â€” mengenang perjuangan Siti Hajar hingga terpancar air Zamzam.' });
        ctx.progress(10);

        await saiMechanic(engine, engine._sceneRefs);
        ctx.progress(70);

        await engine.narrate(
            'Kini tahap terakhir umrah: Tahallul â€” mencukur atau memotong rambut minimal tiga helai. Laki-laki lebih utama mencukur habis, perempuan cukup memotong seujung jari.',
            { sub: 'âœ‚ Tahallul: potong rambut min. 3 helai â€” laki-laki afdhal gundul.' });
        const chair = B.barberChair(engine.mats);
        chair.position.set(engine._sceneRefs.marwahX - 2, 0, 4);
        engine.scene.add(chair);
        await engine.interact(chair, { label: 'Tahallul â€” potong rambut', radius: 6 });
        engine.audio.sfx('chime');
        engine.notifyDotnet('Tahallul selesai â€” Umrah Anda sempurna!', 'success');
        await engine.narrate(
            'Alhamdulillah! Dengan tahallul, rangkaian umrah Anda telah sempurna dan larangan ihram telah gugur.',
            { sub: 'ðŸŽ‰ Umrah sempurna â€” larangan ihram gugur.' });
        ctx.progress(85);

        await ctx.checkpoint(1);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 07 â€” WUKUF DI ARAFAH (puncak ibadah haji, 9 Dzulhijjah)
 * ============================================================ */
const sceneArafah = {
    env: 'goldenHour', ambient: 'crowd',
    build(engine) {
        const refs = B.arafah(engine);
        // Jamaah wukuf â€” berkumpul dan berjalan-jalan seperti rombongan haji
        new Crowd(engine.scene, { count: 90, mode: 'groupWander', area: { x: 10, z: 10, w: 90, d: 60 }, colors: IHRAM });
        new Crowd(engine.scene, { count: 42, mode: 'groupWander', area: { x: -20, z: 30, w: 40, d: 30 }, colors: IHRAM });
        
        // Jamaah yang beraktivitas di sekitar Jabal Rahmah (berjalan & ngumpul)
        new Crowd(engine.scene, { count: 36, mode: 'groupWander', area: { x: -58, z: -50, w: 40, d: 20 }, colors: IHRAM });
        new Crowd(engine.scene, { count: 30, mode: 'idle', area: { x: -58, z: -40, w: 30, d: 30 }, colors: IHRAM });
        engine.spawn(14, 26, 38);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Inilah Padang Arafah pada sembilan Dzulhijjah â€” puncak dan rukun terbesar ibadah haji. Rasulullah bersabda: Al-hajju Arafah â€” haji itu (wukufnya di) Arafah. Barangsiapa tidak wukuf di Arafah, hajinya tidak sah.',
            { sub: 'ðŸŒ„ Padang Arafah, 9 Dzulhijjah â€” "Al-hajju Arafah". Wukuf = rukun terbesar haji.' });
        ctx.progress(15);

        await engine.narrate(
            'Wukuf dimulai setelah matahari tergelincir (zawal) hingga terbit fajar. Setelah khutbah dan sholat Dzuhurâ€“Ashar dijama\' qashar di Masjid Namirah, jamaah memperbanyak doa, dzikir, dan istighfar menghadap kiblat.',
            { sub: 'ðŸ•Œ Masjid Namirah: khutbah + Dzuhur-Ashar jama\' qashar. Perbanyak doa hingga maghrib.' });
        ctx.progress(30);

        const jp = engine._sceneRefs.jabalPos;
        await engine.goto(jp.x + 20, jp.z + 20, { radius: 5, label: 'Menuju Jabal Rahmah â€” memperbanyak doa saat wukuf' });
        engine.setObjective('Wukuf: berdiri/duduk menghadap kiblat, perbanyak doa hingga terbenam matahari');
        engine.setHint('Inilah waktu doa paling mustajab sepanjang tahun â€” mintalah kebaikan dunia & akhirat');

        // Momen wukuf â€” untaian doa & dzikir berjalan otomatis (kontemplasi)
        const duas = [
            { t: 'Doa terbaik adalah doa pada hari Arafah. Sebaik-baik ucapan: Laa ilaaha illallah wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa \'alaa kulli syai\'in qadiir.', s: 'ðŸ¤² "Laa ilaaha illallah wahdahu laa syariika lah, lahul mulku wa lahul hamdâ€¦"' },
            { t: 'Rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina adzaban nar.', s: 'ðŸ“¿ "Rabbanaa aatinaa fid-dunyaa hasanah wa fil-aakhirati hasanah wa qinaa \'adzaaban-naar"' },
            { t: 'Perbanyak istighfar dan doa untuk diri, keluarga, dan seluruh kaum muslimin. Menangislah karena takut dan harap kepada Allah.', s: 'ðŸ’§ Perbanyak istighfar & doa untuk diri, keluarga, dan umat.' }
        ];
        for (let i = 0; i < duas.length; i++) {
            await engine.narrate(duas[i].t, { sub: duas[i].s });
            ctx.progress(40 + i * 12);
        }
        engine.setObjective('');
        engine.setHint('');
        engine.audio.sfx('chime');

        await ctx.checkpoint(1);
        ctx.progress(85);

        await engine.narrate(
            'Matahari mulai terbenam. Dengan terbenamnya matahari, wukuf sempurna. Setelah maghrib jamaah bergerak menuju Muzdalifah untuk mabit â€” tanpa sholat maghrib dulu, karena akan dijama\' di Muzdalifah.',
            { sub: 'ðŸŒ‡ Matahari terbenam â€” wukuf sempurna. Bertolak ke Muzdalifah (maghrib dijama\' di sana).' });
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 08 â€” MUZDALIFAH (MALAM)
 * ============================================================ */
const scene07 = {
    env: 'night', ambient: 'night',
    build(engine) {
        const refs = B.muzdalifah(engine);
        // Sebagian besar jamaah sedang Mabit (istirahat/duduk/tidur beralaskan tikar)
        new Crowd(engine.scene, { count: 60, mode: 'sitFloor', area: { x: 0, z: 0, w: 60, d: 40 }, colors: IHRAM });
        // Sebagian kecil berjalan-jalan mencari batu
        new Crowd(engine.scene, { count: 18, mode: 'groupWander', area: { x: 10, z: -10, w: 40, d: 30 }, colors: IHRAM });
        engine.spawn(0, 25, 0); // Spawn menghadap ke depan (kerumunan jamaah mabit)
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Malam sembilan Dzulhijjah. Setelah wukuf di Arafah, jamaah bergerak ke Muzdalifah untuk mabit â€” bermalam di bawah langit terbuka. Mabit di Muzdalifah hukumnya wajib haji. Di sini kita sholat Maghrib dan Isya dijama\'.',
            { sub: 'ðŸŒŒ Muzdalifah â€” mabit (wajib haji), sholat Maghrib+Isya dijama\', perbanyak dzikir.' });
        ctx.progress(10);

        engine.setObjective('Kumpulkan 7 batu kerikil untuk melontar Jumrah Aqabah besok pagi');
        engine.setCounter('ðŸª¨ Batu<br>0 / 7');
        let stones = 0;
        await new Promise(resolve => {
            for (const cluster of engine._sceneRefs.clusters) {
                engine.addInteractable(cluster, {
                    label: 'Ambil batu kerikil', once: true, radius: 4,
                    onClick: () => {
                        if (stones >= 7) return;
                        
                        // Logika mengambil berdasarkan jumlah batu di titik tersebut
                        const count = cluster.userData.stoneCount || 1;
                        stones += count;
                        if (stones > 7) stones = 7; // Mentok di 7 untuk UI objektif ini
                        
                        engine.audio.sfx('collect');
                        engine.setCounter(`ðŸª¨ Batu<br>${stones} / 7`);
                        engine.subtitle(count > 1 
                            ? `Mendapat ${count} batu sekaligus! Total: ${stones}` 
                            : `Mendapat 1 batu. Total: ${stones}`);
                        
                        // Visual feedback: batu yang sudah diambil menghilang
                        cluster.visible = false;
                        
                        if (stones >= 7) {
                            for (const c of engine._sceneRefs.clusters) engine.removeInteractable(c);
                            resolve();
                        }
                    }
                });
            }
        });
        engine.setCounter('');
        engine.audio.sfx('success');
        await engine.narrate(
            'Tujuh batu telah terkumpul untuk Jumrah Aqabah. Bila ingin melengkapi seluruh hari tasyrik, jamaah biasanya mengumpulkan hingga tujuh puluh butir. Simpan dalam kantong kecil.',
            { sub: 'âœ… 7 batu terkumpul (dianjurkan total 70 untuk seluruh hari tasyrik).' });
        ctx.progress(45);

        await ctx.checkpoint(1);
        ctx.progress(60);

        await engine.goto(-12, 16, { radius: 3.5, label: 'Menuju area istirahat â€” dzikir & doa' });
        await engine.narrate(
            'Berdzikirlah di Masy\'aril Haram sebagaimana firman Allah dalam surat Al-Baqarah ayat 198. Istirahatlah sejenak â€” menjelang subuh kita bergerak menuju Mina.',
            { sub: 'ðŸ“– QS 2:198 â€” "Berdzikirlah kepada Allah di Masy\'aril Haram". Istirahat hingga menjelang subuh.' });
        ctx.progress(80);

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 08 â€” MINA: JUMRAH AQABAH
 * ============================================================ */
const scene08 = {
    env: 'day', ambient: 'crowd',
    build(engine) {
        const refs = B.mina(engine);
        new Crowd(engine.scene, { count: 60, mode: 'line', from: { x: 0, z: 30 }, to: { x: 0, z: -24 }, width: 14, colors: IHRAM });
        new Crowd(engine.scene, { count: 40, mode: 'idle', area: { x: 0, z: 60, w: 90, d: 40 }, colors: IHRAM });
        engine.spawn(0, 45, 0); // Spawn menghadap struktur jembatan Jamarat (-Z)
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Pagi sepuluh Dzulhijjah â€” hari raya Idul Adha. Dari Muzdalifah jamaah tiba di Mina, kota tenda putih. Hari ini kita melontar Jumrah Aqabah tujuh kali, menyembelih hadyu, lalu tahallul awal.',
            { sub: 'â›º Mina, 10 Dzulhijjah: lontar Jumrah Aqabah 7Ã— â†’ hadyu â†’ tahallul awal.' });
        ctx.progress(10);

        await throwStones(engine, engine._sceneRefs.jamarat.aqabah, {
            need: 7, nama: 'Jumrah Aqabah', approach: { x: 0, z: -22 }
        });
        await engine.narrate(
            'Melontar jumrah meneladani Nabi Ibrahim yang mengusir setan. Ini simbol tekad kita melawan segala godaan setan dalam hidup. Setelah Jumrah Aqabah, talbiyah dihentikan.',
            { sub: 'ðŸŽ¯ Makna: melawan godaan setan, meneladani Nabi Ibrahim. Talbiyah dihentikan.' });
        ctx.progress(40);

        await ctx.checkpoint(1);
        ctx.progress(55);

        const rph = B.slaughterArea(engine.mats);
        rph.position.set(40, 0, 10);
        engine.scene.add(rph);
        await engine.goto(40, 18, { radius: 5, label: 'Menuju rumah pemotongan hadyu' });
        await engine.interact(rph, { label: 'Tunaikan hadyu (dam) â€” haji tamattu\'/qiran', radius: 10 });
        await engine.narrate(
            'Jamaah haji tamattu\' dan qiran wajib menyembelih hadyu â€” seekor kambing, atau sepertujuh sapi/unta. Dagingnya dibagikan kepada fakir miskin di tanah haram.',
            { sub: 'ðŸ Hadyu (dam) ditunaikan â€” daging untuk fakir miskin tanah haram.' });
        ctx.progress(70);

        const chair = B.barberChair(engine.mats);
        chair.position.set(28, 0, 24);
        engine.scene.add(chair);
        await engine.goto(28, 28, { radius: 4, label: 'Menuju tempat cukur â€” Tahallul Awal' });
        await engine.interact(chair, { label: 'Tahallul Awal â€” cukur rambut', radius: 6 });
        engine.audio.sfx('chime');
        engine.notifyDotnet('Tahallul Awal selesai â€” boleh berganti pakaian biasa.', 'success');
        await engine.narrate(
            'Tahallul awal selesai. Kini sebagian besar larangan ihram gugur â€” Anda boleh memakai pakaian biasa. Namun hubungan suami istri tetap terlarang hingga tahallul tsani.',
            { sub: 'âœ‚ Tahallul Awal â€” larangan ihram gugur KECUALI hubungan suami istri.' });
        ctx.progress(85);

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 09 â€” TAWAF IFADAH & SA'I HAJI
 * ============================================================ */
const scene09 = {
    env: 'day', ambient: 'crowd',
    build(engine) {
        const refs = B.masjidilHaram(engine);
        // Jamaah berpakaian bebas â€” sudah tahallul awal
        new Crowd(engine.scene, { count: 180, mode: 'orbit', center: { x: 0, z: 0 }, rMin: 10.5, rMax: 25, angularSpeed: 0.09, colors: CASUAL });
        new Crowd(engine.scene, { count: 30, mode: 'idle', area: { x: 0, z: 50, w: 80, d: 20 }, colors: CASUAL });
        engine.spawn(28, 26, 47);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Anda kembali ke Masjidil Haram â€” kali ini dengan pakaian biasa karena telah tahallul awal. Kita akan menunaikan Tawaf Ifadah, rukun haji yang tanpanya haji tidak sah, dilanjutkan Sa\'i haji.',
            { sub: 'ðŸ•‹ Tawaf Ifadah (RUKUN haji) + Sa\'i haji â€” pakaian bebas pasca tahallul awal.' });
        ctx.progress(10);

        await tawafMechanic(engine, {
            namaTawaf: 'Tawaf Ifadah',
            duas: [
                { t: 'Rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina adzaban nar.', s: 'ðŸ¤² "Rabbanaa aatinaa fid-dunyaa hasanah wa fil-aakhirati hasanahâ€¦"' },
                { t: 'Tawaf Ifadah disebut juga tawaf ziarah â€” rukun haji yang menentukan sahnya haji.', s: 'ðŸ’¡ Tawaf Ifadah = Tawaf Ziarah = Tawaf Rukun.' }
            ]
        });
        ctx.progress(50);

        await ctx.checkpoint(1);
        ctx.progress(60);

        await engine.narrate('Sekarang kita menuju Mas\'a untuk Sa\'i haji â€” tujuh perjalanan Shafa-Marwah.',
            { sub: 'âž¡ Menuju Mas\'a untuk Sa\'i hajiâ€¦' });
        await engine.fadeOut(900);
        engine.walkRects.length = 0;
        engine.walkCircles.length = 0;
        engine.blockers.length = 0;
        const refs = B.masaa(engine);
        engine._sceneRefs = refs;
        new Crowd(engine.scene, { count: 60, mode: 'line', from: { x: refs.shafaX + 8, z: 0 }, to: { x: refs.marwahX - 8, z: 0 }, width: 9, colors: CASUAL });
        engine.spawn(refs.shafaX + 18, 4, -90);
        await engine.fadeIn(900);

        await saiMechanic(engine, refs, { namaSai: "Sa'i Haji" });
        engine.notifyDotnet('Tahallul Tsani â€” seluruh larangan ihram gugur!', 'success');
        await engine.narrate(
            'Dengan sempurnanya Tawaf Ifadah dan Sa\'i, Anda mencapai Tahallul Tsani. Seluruh larangan ihram kini gugur sepenuhnya.',
            { sub: 'ðŸŽ‰ TAHALLUL TSANI â€” seluruh larangan ihram gugur.' });
        ctx.progress(85);

        await ctx.checkpoint(2);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 10 â€” MABIT MINA & TIGA JUMRAH
 * ============================================================ */
const scene10 = {
    env: 'day', ambient: 'crowd',
    build(engine) {
        const refs = B.mina(engine, { withAllJamarat: true });
        new Crowd(engine.scene, { count: 60, mode: 'line', from: { x: -70, z: -40 }, to: { x: 70, z: -40 }, width: 12, colors: CASUAL });
        new Crowd(engine.scene, { count: 50, mode: 'idle', area: { x: 0, z: 60, w: 110, d: 50 }, colors: CASUAL });
        engine.spawn(0, 80, 180);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Hari-hari Tasyrik: sebelas, dua belas, dan tiga belas Dzulhijjah. Jamaah mabit di tenda-tenda Mina dan setiap hari melontar tiga jumrah secara berurutan: Ula, Wustha, lalu Aqabah â€” tujuh batu untuk masing-masing.',
            { sub: 'â›º Hari Tasyrik (11-13 Dzulhijjah): mabit di Mina + lontar 3 jumrah (21 batu/hari).' });
        ctx.progress(8);

        await engine.goto(0, 60, { radius: 5, label: 'Menuju tenda maktab â€” mabit di Mina' });
        await engine.narrate(
            'Inilah tenda maktab Anda. Mabit di Mina pada malam hari tasyrik hukumnya wajib haji. Siang harinya, setelah matahari tergelincir, kita berangkat melontar.',
            { sub: 'ðŸ• Mabit di Mina = wajib haji. Melontar setelah zawal (matahari tergelincir).' });
        ctx.progress(20);

        await throwStones(engine, engine._sceneRefs.jamarat.ula, {
            need: 7, nama: 'Jumrah Ula', approach: { x: -50, z: -22 }
        });
        await engine.goto(-42, -30, { radius: 3.5, label: 'Menepi â€” berdoa menghadap kiblat setelah Jumrah Ula' });
        await engine.narrate('Setelah Jumrah Ula, disunnahkan menepi dan berdoa panjang menghadap kiblat.',
            { sub: 'ðŸ¤² Doa panjang setelah Jumrah Ula (sunnah).' });
        ctx.progress(45);

        await throwStones(engine, engine._sceneRefs.jamarat.wustha, {
            need: 7, nama: 'Jumrah Wustha', approach: { x: 0, z: -22 }
        });
        await engine.goto(8, -30, { radius: 3.5, label: 'Menepi â€” berdoa setelah Jumrah Wustha' });
        await engine.narrate('Setelah Jumrah Wustha pun kita berdoa. Rasulullah berdiri lama berdoa di sini.',
            { sub: 'ðŸ¤² Doa panjang setelah Jumrah Wustha (sunnah).' });
        ctx.progress(65);

        await throwStones(engine, engine._sceneRefs.jamarat.aqabah, {
            need: 7, nama: 'Jumrah Aqabah', approach: { x: 50, z: -22 }
        });
        await engine.narrate(
            'Setelah Jumrah Aqabah tidak ada doa â€” langsung kembali. Total dua puluh satu batu hari ini. Jamaah yang mengambil Nafar Awal meninggalkan Mina tanggal dua belas sebelum maghrib; Nafar Tsani hingga tanggal tiga belas â€” itu lebih utama.',
            { sub: 'ðŸ’¡ Setelah Aqabah TIDAK berdoa. Nafar Awal = 12 Dzulhijjah, Nafar Tsani = 13 (lebih utama).' });
        ctx.progress(85);

        await ctx.checkpoint(1);
        ctx.progress(100);
        await ctx.complete();
    }
};

/* ============================================================
 * SCENE 11 â€” TAWAF WADA'
 * ============================================================ */
const scene11 = {
    env: 'dawn', ambient: 'crowd',
    build(engine) {
        const refs = B.masjidilHaram(engine);
        new Crowd(engine.scene, { count: 140, mode: 'orbit', center: { x: 0, z: 0 }, rMin: 10.5, rMax: 24, angularSpeed: 0.08, colors: CASUAL });
        engine.spawn(30, 24, 51);
        return refs;
    },
    async run(engine, ctx) {
        await engine.narrate(
            'Fajar terakhir di Makkah. Sebelum meninggalkan kota suci, jamaah wajib menunaikan Tawaf Wada\' â€” tawaf perpisahan. Inilah pamitan seorang hamba kepada Baitullah.',
            { sub: 'ðŸŒ… Tawaf Wada\' â€” tawaf perpisahan (wajib haji) sebelum meninggalkan Makkah.' });
        ctx.progress(10);

        await tawafMechanic(engine, {
            namaTawaf: "Tawaf Wada'",
            duas: [
                { t: 'Perbanyak istighfar dan syukur â€” putaran-putaran terakhir di Baitullah.', s: 'ðŸ“¿ Istighfar & syukur â€” putaran terakhir di Baitullahâ€¦' },
                { t: 'Ya Allah, jangan jadikan ini kunjungan terakhir kami ke rumah-Mu.', s: 'ðŸ¤² "Ya Allah, jangan jadikan ini kunjungan terakhir kamiâ€¦"' }
            ]
        });
        ctx.progress(60);

        await engine.goto(8, 7, { radius: 3, label: 'Berdoa perpisahan menghadap Multazam' });
        await engine.narrate(
            'Menghadaplah ke Multazam dan panjatkan doa perpisahan: Ya Allah, terimalah seluruh amal kami, jadikanlah haji kami haji yang mabrur â€” dan haji mabrur tidak ada balasan baginya kecuali surga. Setelah ini jamaah tidak boleh berlama-lama menetap di Makkah.',
            { sub: 'ðŸ¤² Doa perpisahan di Multazam â€” "Haji mabrur balasannya surga." Setelah ini langsung pulang.' });
        ctx.progress(80);

        await ctx.checkpoint(1);
        ctx.progress(100);
        await ctx.complete();
    }
};

// Urutan kronologis haji tamattu' (Â§7). Wukuf Arafah disisipkan sebagai scene 7,
// menggeser Muzdalifah..Tawaf Wada' ke 8..12. (Nama variabel scene07..scene11 tetap
// merujuk isi lamanya: Muzdalifah, Mina Aqabah, Tawaf Ifadah, Mabit Mina, Tawaf Wada'.)
export const SCENES = {
    1: scene01, 2: scene02, 3: scene03, 4: scene04, 5: scene05, 6: scene06,
    7: sceneArafah, 8: scene07, 9: scene08, 10: scene09, 11: scene10, 12: scene11
};

