import * as THREE from 'three';
import { LOCATIONS } from './journey-world.js';
import { setRitualAppearance } from '../character-ritual.js';
import { HAJJ_MISSIONS, runRouteMission } from './route-missions.js';

export const MISSIONS = HAJJ_MISSIONS;
const LEGACY_MISSIONS = [
    { title: 'Persiapan dari rumah dan keberangkatan', location: 'home', spawn: [0, 3] },
    { title: 'Tiba di Bandara Madinah', location: 'madinah', spawn: [0, 10] },
    { title: 'Miqat Bir Ali dan ihram umrah', location: 'miqat', spawn: [0, 44] },
    { title: 'Tiba di Makkah dan Masjidil Haram', location: 'haram', spawn: [0, 65] },
    { title: 'Tawaf umrah', location: 'haram', spawn: [24, 20] },
    { title: 'Sai umrah dan tahallul', location: 'masaa', spawn: [-72, -5] },
    { title: 'Ihram haji, Mina dan wukuf Arafah', location: 'haram', spawn: [0, 65] },
    { title: 'Mabit di Muzdalifah', location: 'muzdalifah', spawn: [0, 0] },
    { title: 'Jumrah Aqabah, hadyu dan tahallul', location: 'mina', spawn: [0, 30] },
    { title: 'Tawaf ifadah dan sai haji', location: 'haram', spawn: [24, 20] },
    { title: 'Mabit Mina dan jumrah hari Tasyrik', location: 'mina', spawn: [0, 30] },
    { title: 'Tawaf wada dan perjalanan pulang', location: 'haram', spawn: [24, 20] }
];

/** Every awaited step observes the journey lifetime; disposing cannot resume an old mission. */
export class MissionContext {
    constructor(engine, world, ui, signal) {
        Object.assign(this, { engine, world, ui, signal }); this.location = 'home';
    }
    check() { this.signal.throwIfAborted(); }
    async wait(promise) { const value = await promise; this.check(); return value; }
    say(text) { this.check(); return this.wait(this.engine.narrate(text, { sub: text })); }
    confirm(title, text, choices) { this.check(); return this.wait(this.ui.choose(title, text, choices)); }
    async go(key, x, z, label, radius = 3) {
        this.check(); this.world.ensure(key); const p = this.world.point(key, x, z); this.location = key;
        await this.wait(this.engine.goto(p.x, p.z, { label, radius }));
    }
    touch(object, label, radius = 10) {
        this.check(); return this.wait(this.engine.interact(object, { label, radius }));
    }
    async travel(key, x, z, { vehicle = 'Bus', walking = false } = {}) {
        this.check(); this.world.ensure(key);
        const destination = LOCATIONS[key].label;
        const choice = await this.confirm(`Menuju ${destination}`,
            walking ? 'Pilih perjalanan singkat dengan bus atau ikuti penunjuk tujuan dengan berjalan.' : `${vehicle} siap berangkat. Waktu perjalanan disingkat dalam simulasi.`,
            walking ? ['Naik bus', 'Berjalan ke tujuan'] : [`Naik ${vehicle.toLowerCase()}`]);
        if (walking && choice === 1) {
            await this.go(key, x, z, `Ikuti jalan penghubung menuju ${destination}`);
        } else {
            const e = this.engine;
            await this.wait(e.fadeOut(250));
            // Stationary seated interior avoids moving the user's head along an imposed camera path.
            let bus = null;
            if (vehicle !== 'Pesawat') {
                bus = this.world.vehicle(vehicle);
                e.spawn(vehicle === 'Mobil' ? -7599.55 : -7500, 0, vehicle === 'Mobil' ? 0 : -90);
                this.world.update(0, 0);
            } else {
                this.world.spawn('cabin', 0, 0, 90);
            }
            e.locomotionLocked = true;
            try {
                await this.wait(e.fadeIn(250));
                await this.say(`${vehicle} menuju ${destination}. Perjalanan berlangsung dalam sesi simulasi yang sama.`);
                await this.wait(e.fadeOut(250));
            } finally {
                e.locomotionLocked = false;
                if (bus) bus.visible = false;
            }
            this.world.spawn(key, x, z);
            await this.wait(e.fadeIn(250));
        }
        this.location = key;
    }

    async tawaf(name) {
        const e = this.engine;
        await this.go('haram', 24, 5.3, 'Menuju garis awal tawaf sejajar Hajar Aswad');
        await this.say(`${name}: mulai dengan istilam. Kelilingi Kabah tujuh putaran berlawanan arah jarum jam, dengan Kabah di sebelah kiri.`);
        const p = e.playerPos(new THREE.Vector3());
        let previous = Math.atan2(p.z, p.x), angle = 0, lap = 0;
        let lastPosition = p.clone(), teleport = e.teleportSerial || 0, updater;
        e.setObjective(`${name} - tujuh putaran, Kabah di sisi kiri`);
        e.setCounter('Putaran 0 / 7');
        const completed = new Promise(resolve => {
            updater = e.onUpdate((_dt, _time, self) => {
                const current = e.playerPos(new THREE.Vector3());
                const a = Math.atan2(current.z, current.x);
                let delta = a - previous;
                if (delta > Math.PI) delta -= Math.PI * 2;
                if (delta < -Math.PI) delta += Math.PI * 2;
                const radius = Math.hypot(current.x, current.z);
                // In the X/Z plane counter-clockwise travel has a decreasing angle.
                // Teleports and shortcuts through the centre never award a lap.
                if (radius > 9 && radius < 66 && current.distanceTo(lastPosition) < 3 && teleport === (e.teleportSerial || 0)) {
                    angle = Math.max(0, angle - delta);
                }
                previous = a; lastPosition.copy(current); teleport = e.teleportSerial || 0;
                const next = Math.min(7, Math.floor(angle / (2 * Math.PI)));
                if (next !== lap) { lap = next; e.setCounter(`Putaran ${lap} / 7`); e.audio.sfx('collect'); }
                if (lap === 7) { self.done = true; resolve(); }
            });
        });
        try { await this.wait(e.skippable(completed, () => { updater.done = true; })); }
        finally { updater.done = true; e.setCounter(''); }
        await this.confirm(`${name} selesai`, 'Lanjutkan setelah menuntaskan latihan tujuh putaran.');
    }

    async sai(name) {
        await this.go('haram', 80, -30, 'Menuju jalan penghubung ke Safa');
        await this.go('masaa', -60, -5, 'Ikuti jalan masuk ke galeri sai');
        await this.go('masaa', -70, -5, 'Berjalan dari Masjidil Haram menuju Safa');
        await this.say(`${name}: mulai di Safa, tujuh perjalanan dan berakhir di Marwah. Safa ke Marwah dihitung satu perjalanan.`);
        try {
            for (let trip = 1; trip <= 7; trip++) {
                this.engine.setCounter(`Perjalanan ${trip - 1} / 7`);
                const toMarwah = trip % 2 === 1;
                await this.go('masaa', toMarwah ? 70 : -70, toMarwah ? -5 : 5,
                    `${name}: menuju ${toMarwah ? 'Marwah' : 'Safa'} (${trip}/7)`, 4);
            }
        } finally { this.engine.setCounter(''); }
    }

    async stones(key, name) {
        const e = this.engine, pillar = this.world.ensure('mina').refs.jamarat[key];
        const localX = { ula: -50, wustha: 0, aqabah: 50 }[key];
        await this.go('mina', localX, -22, `Dekati ${name}`, 5);
        e.setObjective(`Lontar tujuh kerikil satu per satu ke ${name}`);
        let count = 0, lastClick = -Infinity;
        e.setCounter('Lontaran 0 / 7');
        const done = new Promise(resolve => e.addInteractable(pillar, {
            label: `Lontar kerikil ke ${name}`, once: false, radius: 30,
            onClick: () => {
                if (performance.now() - lastClick < 350 || count >= 7) return;
                lastClick = performance.now(); count++;
                e.audio.sfx('throw'); e.setCounter(`Lontaran ${count} / 7`);
                e.subtitle(`Allahu Akbar - lontaran ${count}`);
                if (count === 7) resolve();
            }
        }));
        try { await this.wait(e.skippable(done, () => e.removeInteractable(pillar))); }
        finally { e.removeInteractable(pillar); e.setCounter(''); }
    }
}

async function runLegacyMission(number, c) {
    const e = c.engine, world = c.world;
    switch (number) {
        case 1: {
            await c.say('Perjalanan haji tamattu dimulai di rumah. Siapkan paspor, visa, tiket, obat pribadi dan perlengkapan ibadah. Rute latihan ini melalui Madinah dan miqat Bir Ali.');
            await c.go('home', 0, -1, 'Dekati koper dan dokumen perjalanan');
            await c.touch(world.ensure('home').refs.checklist, 'Periksa perlengkapan keberangkatan');
            await c.travel('indonesia', 0, 10, { vehicle: 'Mobil' });
            const airport = world.ensure('indonesia').refs;
            await c.go('indonesia', -24, -20, 'Menuju konter check-in');
            await c.touch(airport.counters.children[0], 'Periksa paspor, tiket dan serahkan bagasi');
            await c.go('indonesia', 22, -14, 'Menuju pemeriksaan imigrasi');
            await c.touch(airport.imigrasi.children[0], 'Pemeriksaan dokumen imigrasi');
            await c.go('indonesia', 36, 18, 'Menuju gerbang keberangkatan');
            await c.touch(airport.gate, 'Boarding pesawat ke Madinah');
            world.ensure('cabin');
            await c.travel('cabin', 0, 0, { vehicle: 'Pesawat' });
            await c.say('Bacalah doa safar. Selama penerbangan, beristirahatlah dan ikuti arahan petugas. Penerbangan Indonesia ke Madinah disingkat dalam latihan ini.');
            break;
        }
        case 2: {
            await c.travel('madinah', 0, 10, { vehicle: 'Pesawat' });
            await c.say('Selamat datang di Bandara Madinah. Selesaikan imigrasi, ambil bagasi dan berkumpul dengan rombongan.');
            await c.go('madinah', 22, -14, 'Menuju pemeriksaan kedatangan Saudi');
            await c.touch(world.ensure('madinah').refs.imigrasi.children[0], 'Selesaikan pemeriksaan kedatangan');
            await c.confirm('Bagasi dan rombongan', 'Periksa kembali barang bawaan dan identitas rombongan. Bus berikutnya menuju miqat Bir Ali, sebelum perjalanan ke Makkah.');
            break;
        }
        case 3: {
            await c.travel('miqat', 0, 44);
            const refs = world.ensure('miqat').refs;
            await c.go('miqat', -20, -10, 'Persiapan ihram di tempat yang disediakan');
            await c.touch(refs.bilik, 'Persiapan kebersihan dan pakaian ihram');
            await c.go('miqat', -6, -12, 'Dekati tempat perlengkapan ihram');
            await c.touch(refs.rak, 'Kenakan pakaian ihram');
            setRitualAppearance(e, {ihram: true});
            await c.confirm('Niat umrah di miqat', 'Untuk haji tamattu, mulai dengan niat umrah: Labbaika Allahumma umratan. Pahami larangan ihram dan lanjutkan dengan talbiyah.');
            await c.say('Labbaik Allahumma labbaik. Labbaika la syarika laka labbaik. Innal hamda wan nimata laka wal mulk. La syarika lak. Bir Ali adalah miqat bagi perjalanan melalui Madinah.');
            break;
        }
        case 4:
            await c.wait(world.prepareSaudi());
            await c.travel('haram', 0, 65);
            await c.say('Anda tiba di Makkah. Masjidil Haram dan jalur Safa-Marwah berada dalam satu kawasan yang dapat dijelajahi. Ikuti penunjuk misi berikutnya.');
            await c.go('haram', 0, 28, 'Masuk ke pelataran Masjidil Haram');
            await c.confirm('Adab di Masjidil Haram', 'Masuk dengan tenang, berdoa dan jaga keselamatan jamaah. Persiapkan tawaf umrah.');
            break;
        case 5:
            await c.tawaf('Tawaf umrah');
            await c.go('haram', 14, 13, 'Area salat setelah tawaf, tanpa menghalangi arus jamaah');
            await c.confirm('Setelah tawaf', 'Pelajari salat dua rakaat setelah tawaf dan minum zamzam. Berikutnya berjalan menuju Safa untuk sai.');
            break;
        case 6:
            await c.sai('Sai umrah');
            await c.confirm('Tahallul umrah', 'Setelah sai, cukur atau pendekkan rambut sesuai ketentuan. Umrah selesai dan Anda keluar dari ihram sampai memulai ihram haji.');
            setRitualAppearance(e, {ihram: false, shaved: true});
            break;
        case 7:
            await c.go('masaa', -70, -5, 'Kembali melalui ujung Safa');
            await c.go('masaa', -70, -30, 'Keluar galeri menuju Makkah');
            await c.go('haram', 80, -30, 'Ikuti jalan kembali ke kawasan Makkah');
            await c.go('haram', 60, 30, 'Kembali ke kawasan Makkah untuk persiapan haji');
            await c.confirm('8 Dzulhijjah - ihram haji', 'Berihram untuk haji dari tempat tinggal di Makkah. Niat: Labbaika Allahumma hajjan. Lanjutkan talbiyah dan berangkat ke Mina.');
            setRitualAppearance(e, {ihram: true});
            await c.travel('mina', 0, 30, { walking: true });
            await c.confirm('Hari Tarwiyah di Mina', 'Pelajari ibadah dan bermalam di Mina pada 8 Dzulhijjah. Pada 9 Dzulhijjah, perjalanan dilanjutkan ke Arafah.');
            await c.travel('arafah', 14, 26, { walking: true });
            await c.go('arafah', 14, 35, 'Area wukuf di dataran Arafah');
            await c.confirm('9 Dzulhijjah - wukuf di Arafah', 'Wukuf merupakan rukun haji. Perbanyak doa dan dzikir di wilayah Arafah; tidak harus mendaki Jabal Rahmah. Dalam alur ini, rombongan berangkat setelah matahari terbenam.');
            break;
        case 8: {
            e.setEnvironment('night');
            await c.travel('muzdalifah', 0, 0, { walking: true });
            await c.confirm('Mabit di Muzdalifah', 'Setelah tiba dari Arafah, pelajari salat Maghrib dan Isya serta mabit. Persiapkan kerikil untuk lontar jumrah.');
            const rocks = world.ensure('muzdalifah').refs.clusters.slice(0, 7);
            for (let i = 0; i < rocks.length; i++) {
                // A small, reachable collection area, independent of random scenery placement.
                rocks[i].visible = true; rocks[i].position.set(-3 + i, .12, 3);
                await c.touch(rocks[i], `Ambil kerikil ${i + 1} / 7`, 12);
                rocks[i].visible = false;
            }
            await c.confirm('Persiapan menuju Mina', 'Tujuh kerikil telah disiapkan untuk Jumrah Aqabah. Perjalanan berikutnya menuju Mina pada 10 Dzulhijjah.');
            break;
        }
        case 9:
            e.setEnvironment('day');
            await c.travel('mina', 0, 30, { walking: true });
            await c.stones('aqabah', 'Jumrah Aqabah');
            await c.go('mina', 80, 25, 'Menuju layanan hadyu');
            await c.touch(world.ensure('mina').refs.hadyu, 'Pelajari pelaksanaan hadyu', 20);
            await c.confirm('Hadyu haji tamattu', 'Pelajari kewajiban hadyu bagi yang mampu dan pelaksanaannya melalui layanan resmi. Ini adalah penjelasan ibadah, bukan transaksi penyembelihan.');
            await c.go('mina', 100, 25, 'Menuju tempat cukur rambut');
            await c.touch(world.ensure('mina').refs.chair, 'Latihan tahallul setelah lontar', 10);
            await c.confirm('Tahallul awal', 'Pelajari mencukur atau memendekkan rambut serta ketentuan tahallul awal. Rangkaian berikutnya adalah tawaf ifadah dan sai haji.');
            setRitualAppearance(e, {ihram: false, shaved: true});
            break;
        case 10:
            await c.travel('haram', 24, 20, { walking: true });
            await c.tawaf('Tawaf ifadah');
            await c.sai('Sai haji tamattu');
            await c.confirm('Tahallul tsani', 'Setelah rangkaian yang disyaratkan selesai, pelajari tahallul sempurna. Rombongan kembali ke Mina untuk hari Tasyrik.');
            break;
        case 11:
            await c.travel('mina', 0, 30, { walking: true });
            for (const day of [11, 12]) {
                await c.confirm(`${day} Dzulhijjah - Mina`, 'Pelajari mabit di Mina. Latihan melontar dilakukan berurutan: Ula, Wustha, lalu Aqabah; masing-masing tujuh kerikil.');
                for (const [key, name] of [['ula', 'Jumrah Ula'], ['wustha', 'Jumrah Wustha'], ['aqabah', 'Jumrah Aqabah']]) {
                    await c.stones(key, name);
                    if (key !== 'aqabah') await c.confirm('Doa setelah lontar', 'Berdoa di tempat yang aman setelah jumrah ini, lalu lanjutkan ke jumrah berikutnya.');
                }
            }
            await c.confirm('Nafar awal', 'Alur latihan ini memakai nafar awal: meninggalkan Mina pada 12 Dzulhijjah sebelum matahari terbenam. Nafar tsani menambah mabit dan lontar pada 13 Dzulhijjah.');
            break;
        case 12:
            await c.travel('haram', 24, 20, { walking: true });
            await c.tawaf('Tawaf wada');
            await c.confirm('Meninggalkan Makkah', 'Tawaf wada menjadi penutup kunjungan sebelum meninggalkan Makkah. Rute latihan pulang melalui Bandara Madinah.');
            await c.travel('madinah', 0, 10);
            await c.go('madinah', 36, 18, 'Menuju gerbang penerbangan pulang');
            await c.touch(world.ensure('madinah').refs.gate, 'Boarding penerbangan ke Indonesia');
            await c.travel('indonesia', 0, 10, { vehicle: 'Pesawat' });
            await c.confirm('Tiba di Indonesia', 'Selesaikan proses kedatangan dan pastikan bagasi lengkap sebelum pulang bersama keluarga.');
            await c.travel('home', 0, 3, { vehicle: 'Mobil' });
            await c.say('Alhamdulillah, Anda kembali ke rumah. Perjalanan latihan haji tamattu dari keberangkatan hingga kepulangan telah selesai.');
            break;
        default: throw new Error(`Misi tidak dikenal: ${number}`);
    }
}

export async function runMission(number, c, route = 'haji') {
    return runRouteMission(number, c, route);
}
