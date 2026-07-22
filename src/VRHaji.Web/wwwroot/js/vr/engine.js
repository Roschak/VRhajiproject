/**
 * VR Education Haji & Umrah — Core Engine (Three.js, WebGL 2.0)
 * Renderer HD: ACES Filmic tone mapping, PBR + PMREM environment,
 * PCF soft shadows, UnrealBloom, physical Sky, instanced crowds.
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };

/* ============================================================
 * Texture prosedural (canvas) — marmer, pasir, kiswah, papan teks
 * ============================================================ */
export const Tex = {
    _canvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    },
    marble(tint = '#f4f1ea', vein = '#d9d2c0') {
        const c = this._canvas(512, 512), g = c.getContext('2d');
        g.fillStyle = tint; g.fillRect(0, 0, 512, 512);
        g.strokeStyle = vein; g.globalAlpha = 0.5;
        for (let i = 0; i < 40; i++) {
            g.lineWidth = 0.5 + Math.random() * 1.5;
            g.beginPath();
            let x = Math.random() * 512, y = Math.random() * 512;
            g.moveTo(x, y);
            for (let s = 0; s < 6; s++) {
                x += (Math.random() - 0.5) * 160; y += (Math.random() - 0.5) * 160;
                g.lineTo(x, y);
            }
            g.stroke();
        }
        // nat ubin
        g.globalAlpha = 0.35; g.strokeStyle = '#b9b2a2'; g.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
            g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
            g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },
    noise(base = '#c9b18a', dots = '#a8916b', n = 4000) {
        const c = this._canvas(512, 512), g = c.getContext('2d');
        g.fillStyle = base; g.fillRect(0, 0, 512, 512);
        g.fillStyle = dots;
        for (let i = 0; i < n; i++) {
            g.globalAlpha = 0.15 + Math.random() * 0.4;
            const r = 0.6 + Math.random() * 2.2;
            g.beginPath();
            g.arc(Math.random() * 512, Math.random() * 512, r, 0, 7);
            g.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },
    kiswah() {
        // Kain hitam Ka'bah — tenunan gelap halus. Hizam & ornamen emas dibuat
        // sebagai geometri terpisah (lihat kaaba() di builders.js) agar tajam.
        const c = this._canvas(512, 1024), g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, 1024);
        grad.addColorStop(0, '#0d0d11'); grad.addColorStop(0.5, '#141418'); grad.addColorStop(1, '#090909');
        g.fillStyle = grad; g.fillRect(0, 0, 512, 1024);
        // tenunan vertikal halus (kilau sutra)
        g.globalAlpha = 0.10; g.strokeStyle = '#2a2a30'; g.lineWidth = 2;
        for (let i = 0; i < 128; i++) { g.beginPath(); g.moveTo(i * 4, 0); g.lineTo(i * 4, 1024); g.stroke(); }
        // jahitan diagonal tersamar
        g.globalAlpha = 0.05; g.strokeStyle = '#000000'; g.lineWidth = 1;
        for (let i = -40; i < 160; i++) { g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8 + 320, 1024); g.stroke(); }
        g.globalAlpha = 1;
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },
    kiswahBand() {
        // Pita hizam emas dengan kaligrafi tersamar (tone-on-tone emas)
        const w = 1024, h = 128, c = this._canvas(w, h), g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#8a6a1a'); grad.addColorStop(0.16, '#e7cd7c');
        grad.addColorStop(0.5, '#f7e7ab'); grad.addColorStop(0.84, '#e7cd7c'); grad.addColorStop(1, '#8a6a1a');
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
        g.fillStyle = '#6f5312'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
        g.strokeStyle = '#7a5c17'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let x = 8; x < w; x += 34) {
            g.beginPath();
            g.moveTo(x, h * 0.72);
            g.bezierCurveTo(x + 6, h * 0.3, x + 20, h * 0.9, x + 28, h * 0.5);
            g.lineTo(x + 31, h * 0.32);
            g.stroke();
            g.fillStyle = '#6b4f12'; g.beginPath(); g.arc(x + 16, h * 0.26, 2.6, 0, 7); g.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
        return t;
    },
    sign(text, { bg = '#0d2b4d', fg = '#ffffff', w = 512, h = 128, font = 'bold 56px "Segoe UI", sans-serif' } = {}) {
        const c = this._canvas(w, h), g = c.getContext('2d');
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.fillStyle = fg; g.font = font;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, w / 2, h / 2);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },
    fids(title = 'KEBERANGKATAN — DEPARTURES') {
        // Papan jadwal penerbangan (Flight Information Display)
        const c = this._canvas(1024, 640), g = c.getContext('2d');
        g.fillStyle = '#0a0f16'; g.fillRect(0, 0, 1024, 640);
        g.fillStyle = '#122b45'; g.fillRect(0, 0, 1024, 88);
        g.fillStyle = '#ffd75e'; g.font = 'bold 44px "Segoe UI", sans-serif';
        g.textBaseline = 'middle';
        g.fillText('🛫  ' + title, 28, 46);
        const rows = [
            ['07:45', 'GA 980', 'JEDDAH', 'BOARDING', '#57d987'],
            ['08:10', 'SV 819', 'MADINAH', 'ON TIME', '#e8eef4'],
            ['08:40', 'GA 142', 'SURABAYA', 'ON TIME', '#e8eef4'],
            ['09:05', 'QR 955', 'DOHA', 'GATE OPEN', '#57d987'],
            ['09:30', 'EK 357', 'DUBAI', 'DELAYED', '#e8b64f'],
            ['10:00', 'GA 972', 'JEDDAH', 'ON TIME', '#e8eef4'],
            ['10:25', 'MH 720', 'KUALA LUMPUR', 'ON TIME', '#e8eef4'],
            ['11:15', 'TK 057', 'ISTANBUL', 'ON TIME', '#e8eef4']
        ];
        g.font = 'bold 30px "Consolas", monospace';
        rows.forEach((r, i) => {
            const y = 130 + i * 62;
            if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, y - 26, 1024, 52); }
            g.fillStyle = '#ffd75e'; g.fillText(r[0], 28, y);
            g.fillStyle = '#e8eef4'; g.fillText(r[1], 170, y);
            g.fillStyle = '#e8eef4'; g.fillText(r[2], 340, y);
            g.fillStyle = r[4]; g.fillText(r[3], 760, y);
        });
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },
    carpet(color = '#7a1f1f', line = '#d8b24a') {
        const c = this._canvas(512, 512), g = c.getContext('2d');
        g.fillStyle = color; g.fillRect(0, 0, 512, 512);
        g.strokeStyle = line; g.lineWidth = 4; g.globalAlpha = 0.85;
        for (let i = 0; i < 8; i++) {
            g.strokeRect(24 + i * 4, 24 + i * 60, 464 - i * 8, 40);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    },

    /**
     * Motif bawah payung Masjid Nabawi — bidang persegi yang dipetakan planar
     * dari atas, sehingga pola sejajar sisi payung persis seperti aslinya:
     * rosette bintang bertumpuk di pusat (tepat di bawah tiang), arabesque
     * menjalar ke empat sudut, pita bertingkat di tepi. Palet tosca–emas–ivory.
     */
    canopyMotif() {
        const S = 1024, c = this._canvas(S, S), g = c.getContext('2d');
        const IVORY = '#f4efe3', TEAL = '#1c6f68', TEAL_L = '#2f9a8c',
            GOLD = '#c1a02f', GOLD_L = '#e8cd7a', SAND = '#e0d4b8';
        const cx = S / 2, cy = S / 2;
        g.fillStyle = IVORY; g.fillRect(0, 0, S, S);

        // Bintang n-titik berpusat di (px,py)
        const star = (n, rO, rI, rot, px = cx, py = cy) => {
            g.beginPath();
            for (let i = 0; i < n * 2; i++) {
                const r = i % 2 ? rI : rO, a = rot + i * Math.PI / n;
                const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r;
                i ? g.lineTo(x, y) : g.moveTo(x, y);
            }
            g.closePath();
        };
        const fillStroke = (fill, stroke, lw) => {
            if (fill) { g.fillStyle = fill; g.fill(); }
            if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
        };
        const ring = (r, col, lw) => {
            g.beginPath(); g.arc(cx, cy, r, 0, 7);
            g.strokeStyle = col; g.lineWidth = lw; g.stroke();
        };

        // Jahitan kain radial dari hub ke tepi — membuat permukaan terbaca sebagai membran
        g.strokeStyle = SAND; g.lineWidth = 2; g.globalAlpha = 0.75;
        for (let i = 0; i < 32; i++) {
            const a = i * Math.PI / 16;
            g.beginPath(); g.moveTo(cx, cy);
            g.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S);
            g.stroke();
        }
        g.globalAlpha = 1;

        // Pita tepi bertingkat
        const band = (inset, col, lw) => {
            g.strokeStyle = col; g.lineWidth = lw;
            g.strokeRect(inset, inset, S - inset * 2, S - inset * 2);
        };
        band(13, TEAL, 26);
        band(38, GOLD, 6);
        band(50, TEAL_L, 2.5);

        // Jalinan belah ketupat di dalam pita tepi
        g.strokeStyle = GOLD_L; g.lineWidth = 2;
        for (let i = 0; i < 40; i++) {
            const t = 13 + (i + 0.5) * (S - 26) / 40, d = 9;
            for (const [ax, ay] of [[t, 13], [t, S - 13], [13, t], [S - 13, t]]) {
                const vert = ax === 13 || ax === S - 13;
                g.beginPath();
                if (vert) {
                    g.moveTo(ax - d, ay); g.lineTo(ax, ay - d);
                    g.lineTo(ax + d, ay); g.lineTo(ax, ay + d);
                } else {
                    g.moveTo(ax, ay - d); g.lineTo(ax + d, ay);
                    g.lineTo(ax, ay + d); g.lineTo(ax - d, ay);
                }
                g.closePath(); g.stroke();
            }
        }

        // Kipas arabesque di empat sudut
        for (const [sx, sy, rot] of [[0, 0, 0], [S, 0, Math.PI / 2], [S, S, Math.PI], [0, S, -Math.PI / 2]]) {
            g.save(); g.translate(sx, sy); g.rotate(rot);
            g.strokeStyle = TEAL_L; g.lineWidth = 3.5;
            for (let i = 1; i <= 5; i++) {
                g.beginPath(); g.arc(0, 0, 60 + i * 26, 0, Math.PI / 2); g.stroke();
            }
            g.strokeStyle = GOLD; g.lineWidth = 2.5;
            for (let i = 0; i <= 6; i++) {
                const a = i * (Math.PI / 2) / 6;
                g.beginPath();
                g.moveTo(Math.cos(a) * 74, Math.sin(a) * 74);
                g.lineTo(Math.cos(a) * 192, Math.sin(a) * 192);
                g.stroke();
            }
            star(8, 52, 22, 0, 0, 0);
            fillStroke(TEAL, GOLD_L, 3);
            g.restore();
        }

        // Cincin medali di antara rosette dan pita tepi — mengisi bidang kain
        // agar motif tetap terbaca saat payung dilihat dari bawah.
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6, R = 428;
            const mx = cx + Math.cos(a) * R, my = cy + Math.sin(a) * R;
            star(8, 34, 15, a, mx, my);
            fillStroke(i % 2 ? GOLD : TEAL, i % 2 ? TEAL : GOLD_L, 2.5);
            g.strokeStyle = TEAL_L; g.lineWidth = 2;
            g.beginPath(); g.arc(mx, my, 46, 0, 7); g.stroke();
        }
        ring(386, GOLD, 2.5);
        ring(378, TEAL_L, 2);

        // Rosette pusat — tepat di bawah hub tiang
        ring(330, TEAL_L, 3);
        ring(318, GOLD, 5);
        star(16, 300, 176, 0);
        fillStroke(TEAL, GOLD_L, 4);
        star(16, 250, 132, Math.PI / 16);
        fillStroke(IVORY, GOLD, 3);
        // Kelopak arabesque mengelilingi medali
        g.strokeStyle = TEAL_L; g.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            g.save(); g.translate(cx, cy); g.rotate(a);
            g.beginPath();
            g.moveTo(0, -60);
            g.quadraticCurveTo(52, -108, 0, -168);
            g.quadraticCurveTo(-52, -108, 0, -60);
            g.stroke();
            g.restore();
        }
        star(8, 96, 44, Math.PI / 8);
        fillStroke(GOLD, TEAL, 3);
        ring(30, TEAL, 8);
        g.beginPath(); g.arc(cx, cy, 25, 0, 7);
        g.fillStyle = GOLD_L; g.fill();

        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
    }
};

/* ============================================================
 * Material pustaka PBR
 * ============================================================ */
export function makeMaterials() {
    const marbleTex = Tex.marble();
    marbleTex.repeat.set(24, 24);
    const marbleDark = Tex.marble('#e8e2d2', '#c4baa2');
    marbleDark.repeat.set(10, 10);
    const sandTex = Tex.noise();
    sandTex.repeat.set(40, 40);
    const rockTex = Tex.noise('#8d8377', '#6e6357', 5000);
    rockTex.repeat.set(30, 30);
    const carpetG = Tex.carpet('#14442f', '#cdae5a');
    carpetG.repeat.set(8, 8);
    return {
        marble: new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.55, metalness: 0.02 }),
        marbleTile: new THREE.MeshStandardMaterial({ map: marbleDark, roughness: 0.3, metalness: 0.04 }),
        sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1, metalness: 0 }),
        rock: new THREE.MeshStandardMaterial({ map: rockTex, roughness: 1, metalness: 0 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.7 }),
        cream: new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.8 }),
        gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 }),
        grey: new THREE.MeshStandardMaterial({ color: 0x9a9a98, roughness: 0.9 }),
        darkGrey: new THREE.MeshStandardMaterial({ color: 0x55565a, roughness: 0.95 }),
        glass: new THREE.MeshPhysicalMaterial({
            color: 0xaaccee, roughness: 0.08, metalness: 0, transmission: 0.85,
            transparent: true, opacity: 0.55, side: THREE.DoubleSide
        }),
        kiswah: new THREE.MeshStandardMaterial({ map: Tex.kiswah(), roughness: 0.85, metalness: 0.12 }),
        greenDome: new THREE.MeshStandardMaterial({ color: 0x1f7a4d, roughness: 0.35, metalness: 0.15 }),
        carpetGreen: new THREE.MeshStandardMaterial({ map: carpetG, roughness: 0.95 }),
        wood: new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 0.8 }),
        steel: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.85 }),
        tarmac: new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.98 }),
        emissiveWarm: new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffdf9e, emissiveIntensity: 2.2 }),
        emissiveCool: new THREE.MeshStandardMaterial({ color: 0xeaf4ff, emissive: 0xcfe6ff, emissiveIntensity: 1.8 })
    };
}

/* ============================================================
 * Audio prosedural (WebAudio): ambient bed + efek
 * ============================================================ */
class AudioBed {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.bedGain = null;
        this.bedNodes = [];
    }
    ensure() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.bedGain = this.ctx.createGain();
        this.bedGain.gain.value = 0;
        this.bedGain.connect(this.master);
    }
    _noiseBuffer(seconds = 2) {
        const rate = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, rate * seconds, rate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < d.length; i++) {
            const w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02; // brown-ish
            d[i] = last * 3.2;
        }
        return buf;
    }
    /** preset: 'airport' | 'crowd' | 'night' | 'wind' | 'interior' */
    ambient(preset, volume = 0.35) {
        this.ensure();
        if (!this.ctx) return;
        this.bedNodes.forEach(n => { try { n.stop(); } catch { } });
        this.bedNodes = [];
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer(3);
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        const presets = {
            airport: { f: 420, q: 0.5, v: volume },
            crowd: { f: 560, q: 0.6, v: volume * 1.15 },
            night: { f: 180, q: 0.7, v: volume * 0.5 },
            wind: { f: 300, q: 0.3, v: volume * 0.8 },
            interior: { f: 240, q: 0.4, v: volume * 0.6 }
        };
        const p = presets[preset] || presets.wind;
        filter.frequency.value = p.f; filter.Q.value = p.q;
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.13; lfoGain.gain.value = p.f * 0.25;
        lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
        src.connect(filter); filter.connect(this.bedGain);
        this.bedGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.bedGain.gain.linearRampToValueAtTime(p.v, this.ctx.currentTime + 1.5);
        src.start(); lfo.start();
        this.bedNodes.push(src, lfo);
    }
    sfx(kind) {
        this.ensure();
        if (!this.ctx) return;
        const t0 = this.ctx.currentTime;
        const tone = (freq, dur, type = 'sine', vol = 0.25, delay = 0) => {
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.type = type; o.frequency.value = freq;
            g.gain.setValueAtTime(0, t0 + delay);
            g.gain.linearRampToValueAtTime(vol, t0 + delay + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
            o.connect(g); g.connect(this.master);
            o.start(t0 + delay); o.stop(t0 + delay + dur + 0.05);
        };
        switch (kind) {
            case 'click': tone(880, 0.08, 'triangle', 0.18); break;
            case 'hover': tone(520, 0.05, 'sine', 0.06); break;
            case 'success': tone(523, 0.14, 'sine', 0.22); tone(659, 0.14, 'sine', 0.22, 0.12); tone(784, 0.3, 'sine', 0.25, 0.24); break;
            case 'fail': tone(220, 0.25, 'sawtooth', 0.12); tone(180, 0.3, 'sawtooth', 0.12, 0.18); break;
            case 'collect': tone(700, 0.07, 'triangle', 0.2); tone(1050, 0.1, 'triangle', 0.16, 0.06); break;
            case 'throw': tone(320, 0.18, 'triangle', 0.14); break;
            case 'stamp': tone(140, 0.12, 'square', 0.2); break;
            case 'step': tone(90, 0.05, 'triangle', 0.05); break;
            case 'chime': tone(988, 0.4, 'sine', 0.14); tone(740, 0.5, 'sine', 0.12, 0.3); break;
        }
    }
}

/* ============================================================
 * Narasi: Web Speech API + subtitle
 * ============================================================ */
class Narrator {
    constructor(subtitleEl) {
        this.el = subtitleEl;
        this.voice = null;
        this.enabled = 'speechSynthesis' in window;
        if (this.enabled) {
            const pick = () => {
                const vs = speechSynthesis.getVoices();
                this.voice = vs.find(v => v.lang?.toLowerCase().startsWith('id'))
                    || vs.find(v => v.lang?.toLowerCase().startsWith('ms'))
                    || null;
            };
            pick();
            speechSynthesis.onvoiceschanged = pick;
        }
    }
    stop() {
        if (this.enabled) speechSynthesis.cancel();
        if (this.el) this.el.textContent = '';
    }
    say(text, { sub = null, rate = 1.02 } = {}) {
        const subtitle = sub ?? text;
        if (this.el) this.el.textContent = subtitle;
        const minMs = Math.max(2200, subtitle.length * 62);
        return new Promise(resolve => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                if (this.el && this.el.textContent === subtitle) this.el.textContent = '';
                resolve();
            };
            if (this.enabled) {
                try {
                    const u = new SpeechSynthesisUtterance(text);
                    u.lang = 'id-ID';
                    if (this.voice) u.voice = this.voice;
                    u.rate = rate;
                    u.onend = finish;
                    u.onerror = finish;
                    speechSynthesis.speak(u);
                    setTimeout(finish, minMs + 14000); // pengaman
                } catch { setTimeout(finish, minMs); }
            } else {
                setTimeout(finish, minMs);
            }
        });
    }
}

/* ============================================================
 * Kerumunan jamaah — figur manusia instanced (kepala, torso,
 * dua kaki berporos pinggul, dua lengan berporos bahu) dengan
 * animasi berjalan. Terdaftar otomatis agar di-update engine.
 * ============================================================ */
export const ACTIVE_CROWDS = [];
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa5673f];
const CAP_COLORS = [0xffffff, 0xf2f2f2, 0x14202e, 0x22303f, 0x3a2d1a, 0x6b0f0f, 0x0e3b26, 0xd9c9a3];
// Referensi engine aktif (dipakai Crowd untuk uji tembus dinding/blocker).
let ACTIVE_ENGINE = null;

export class Crowd {
    /**
     * @param {object} opts { count, mode:'orbit'|'line'|'idle'|'sit'|'wander'|'post',
     *                        center, rMin, rMax, from, to, area:{x,z,w,d},
     *                        spots:[{x,z,ry}], sitY, colors:[hex...], capChance }
     *
     * Mode 'post' — petugas yang bertugas di satu titik tetap (counter check-in,
     * booth imigrasi, kios kafe): diam menghadap ry, boleh duduk/berdiri per titik
     * (spot.sit, spot.sitY) dan berseragam sendiri-sendiri (spot.color).
     */
    constructor(scene, opts) {
        this.opts = opts;
        if ((opts.mode === 'sit' || opts.mode === 'post') && opts.spots) {
            opts.count = Math.min(opts.count, opts.spots.length);
        }
        const count = opts.count;
        // Geometri anatomis: pivot tiap tungkai di sendi atas (digeser) agar bisa diayun.
        // Panjang segmen (pivot→sendi) — dipakai juga oleh FK di update().
        this.L = { thigh: 0.42, shin: 0.44, uArm: 0.30, fArm: 0.28 };
        const L = this.L;
        // Batang tubuh meruncing: bahu lebar → pinggang ramping, dipipihkan di sumbu Z
        const torsoGeo = new THREE.CylinderGeometry(0.195, 0.135, 0.44, 12, 1);
        torsoGeo.scale(1, 1, 0.62);
        const pelvisGeo = new THREE.CylinderGeometry(0.15, 0.135, 0.2, 10);
        pelvisGeo.scale(1, 1, 0.72);
        const neckGeo = new THREE.CylinderGeometry(0.05, 0.058, 0.11, 8);
        const headGeo = new THREE.SphereGeometry(0.12, 16, 12);
        headGeo.scale(0.9, 1.08, 1.0);
        // Peci/kopiah/tudung — kubah rendah menempel di atas kepala
        const capGeo = new THREE.SphereGeometry(0.128, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
        const thighGeo = new THREE.CapsuleGeometry(0.088, L.thigh - 0.176, 3, 8); thighGeo.translate(0, -L.thigh / 2, 0);
        const shinGeo = new THREE.CapsuleGeometry(0.072, L.shin - 0.144, 3, 8); shinGeo.translate(0, -L.shin / 2, 0);
        const footGeo = new THREE.BoxGeometry(0.11, 0.08, 0.27);
        const uArmGeo = new THREE.CapsuleGeometry(0.056, L.uArm - 0.112, 3, 8); uArmGeo.translate(0, -L.uArm / 2, 0);
        const fArmGeo = new THREE.CapsuleGeometry(0.05, L.fArm - 0.10, 3, 8); fArmGeo.translate(0, -L.fArm / 2, 0);
        const handGeo = new THREE.SphereGeometry(0.062, 8, 6); handGeo.scale(1, 0.85, 1.2);

        const outfitMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
        const pantsMat = new THREE.MeshStandardMaterial({ roughness: 0.93 });
        const skinMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 });
        const capMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
        const im = (geo, mat) => {
            const m = new THREE.InstancedMesh(geo, mat, count);
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            m.castShadow = true;
            return m;
        };
        // Bagian tubuh (L/R berbagi geometri; masing-masing instanceColor sendiri)
        this.torso = im(torsoGeo, outfitMat);
        this.pelvis = im(pelvisGeo, pantsMat);
        this.neck = im(neckGeo, skinMat);
        this.head = im(headGeo, skinMat);
        this.cap = im(capGeo, capMat);
        this.thighL = im(thighGeo, pantsMat); this.thighR = im(thighGeo, pantsMat);
        this.shinL = im(shinGeo, pantsMat); this.shinR = im(shinGeo, pantsMat);
        this.footL = im(footGeo, shoeMat); this.footR = im(footGeo, shoeMat);
        this.uArmL = im(uArmGeo, outfitMat); this.uArmR = im(uArmGeo, outfitMat);
        this.fArmL = im(fArmGeo, outfitMat); this.fArmR = im(fArmGeo, outfitMat);
        this.handL = im(handGeo, skinMat); this.handR = im(handGeo, skinMat);

        const eyeGeo = new THREE.SphereGeometry(0.016, 8, 6);
        eyeGeo.scale(1, 1, 0.4);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
        this.eyeL = im(eyeGeo, eyeMat); this.eyeR = im(eyeGeo, eyeMat);
        const noseGeo = new THREE.ConeGeometry(0.022, 0.05, 6);
        noseGeo.rotateX(Math.PI / 2);
        this.nose = im(noseGeo, skinMat);

        this.parts = [
            this.torso, this.pelvis, this.neck, this.head, this.cap,
            this.thighL, this.thighR, this.shinL, this.shinR, this.footL, this.footR,
            this.uArmL, this.uArmR, this.fArmL, this.fArmR, this.handL, this.handR,
            this.eyeL, this.eyeR, this.nose
        ];
        // Kelompok pewarnaan
        this._outfitParts = [this.torso, this.uArmL, this.uArmR, this.fArmL, this.fArmR];
        this._pantsParts = [this.pelvis, this.thighL, this.thighR, this.shinL, this.shinR];
        this._skinParts = [this.head, this.neck, this.handL, this.handR, this.nose];

        this.agents = [];
        const colors = opts.colors || [0xffffff];
        const cOutfit = new THREE.Color(), cPants = new THREE.Color(), cSkin = new THREE.Color(), cCap = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const a = {
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.3, // Animasi langkah diperlambat
                s: 0.94 + Math.random() * 0.13
            };
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
                a.x = opts.area.x + (Math.random() - 0.5) * opts.area.w;
                a.z = opts.area.z + (Math.random() - 0.5) * opts.area.d;
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
                a.x = opts.area.x + (Math.random() - 0.5) * opts.area.w;
                a.z = opts.area.z + (Math.random() - 0.5) * opts.area.d;
                a.v = 0.35 + Math.random() * 0.15;
                a.dwell = Math.random() * 3;
                a.heading = Math.random() * Math.PI * 2;
                a.sit = false;
            } else {
                a.x = opts.area ? opts.area.x + (Math.random() - 0.5) * opts.area.w : (Math.random() - 0.5) * 20;
                a.z = opts.area ? opts.area.z + (Math.random() - 0.5) * opts.area.d : (Math.random() - 0.5) * 20;
                a.heading = Math.random() * Math.PI * 2;
                a.sit = opts.mode === 'sit' || opts.mode === 'sitFloor';
                a.sitFloor = opts.mode === 'sitFloor';
            }
            a.wx = a.x ?? 0; a.wz = a.z ?? 0;
            this.agents.push(a);

            cOutfit.setHex(a.outfit ?? colors[Math.floor(Math.random() * colors.length)]);
            // pakaian terang (ihram) = jubah sewarna; pakaian gelap = celana lebih gelap
            const lum = cOutfit.r * 0.3 + cOutfit.g * 0.6 + cOutfit.b * 0.1;
            const ihramLike = lum > 0.72;
            if (ihramLike) cPants.copy(cOutfit).multiplyScalar(0.95);
            else cPants.copy(cOutfit).multiplyScalar(0.32 + Math.random() * 0.22);
            cSkin.setHex(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
            // Tutup kepala: jamaah ihram tak bertutup; selainnya ± kopiah/peci warna acak
            a.cap = !ihramLike && Math.random() < (opts.capChance ?? 0.55);
            cCap.setHex(CAP_COLORS[Math.floor(Math.random() * CAP_COLORS.length)]);
            for (const p of this._outfitParts) p.setColorAt(i, cOutfit);
            for (const p of this._pantsParts) p.setColorAt(i, cPants);
            for (const p of this._skinParts) p.setColorAt(i, cSkin);
            this.cap.setColorAt(i, cCap);
        }
        for (const p of this.parts) {
            if (p.instanceColor) p.instanceColor.needsUpdate = true;
        }
        scene.add(...this.parts);
        this._m = new THREE.Matrix4();
        this._p = new THREE.Vector3();
        this._s = new THREE.Vector3(1, 1, 1);
        this._up = new THREE.Vector3(0, 1, 0);
        this._axR = new THREE.Vector3(1, 0, 0);
        this._qYaw = new THREE.Quaternion();
        this._qSwing = new THREE.Quaternion();
        this._qa = new THREE.Quaternion();
        this._qb = new THREE.Quaternion();
        this._v1 = new THREE.Vector3();
        this._v2 = new THREE.Vector3();
        this._v3 = new THREE.Vector3();
        ACTIVE_CROWDS.push(this);
        this.update(0, 0);
    }

    /** Susun matriks satu bagian dari posisi dunia + orientasi + skala seragam. */
    _compose(mesh, i, px, py, pz, quat, sc) {
        this._p.set(px, py, pz);
        this._s.setScalar(sc);
        this._m.compose(this._p, quat, this._s);
        mesh.setMatrixAt(i, this._m);
    }

    /**
     * Tungkai dua-ruas ber-FK: segmen1 (paha/lengan-atas), segmen2 (betis/lengan-bawah),
     * dan ujung (kaki/tangan). Semua berputar mengikuti yaw badan.
     */
    _limb(seg1, seg2, endM, i, rx, ry, rz, ox, oz, L1, L2, sw1, bend, endFlat, qYaw, sc) {
        const root = this._v1, joint = this._v2, dir = this._v3;
        // sendi atas (bahu/pinggul) di ruang dunia
        root.set(ox * sc, 0, oz * sc).applyQuaternion(qYaw);
        root.set(rx + root.x, ry, rz + root.z);
        // segmen 1 — mengayun sw1 terhadap sumbu kanan lalu diputar yaw
        this._qSwing.setFromAxisAngle(this._axR, sw1);
        this._qa.copy(qYaw).multiply(this._qSwing);
        this._compose(seg1, i, root.x, root.y, root.z, this._qa, sc);
        // sendi bawah (lutut/siku)
        dir.set(0, -1, 0).applyQuaternion(this._qa);
        joint.copy(root).addScaledVector(dir, L1 * sc);
        // segmen 2 — menekuk relatif (bend) di sendi bawah
        this._qSwing.setFromAxisAngle(this._axR, sw1 + bend);
        this._qb.copy(qYaw).multiply(this._qSwing);
        this._compose(seg2, i, joint.x, joint.y, joint.z, this._qb, sc);
        if (!endM) return;
        dir.set(0, -1, 0).applyQuaternion(this._qb);
        root.copy(joint).addScaledVector(dir, L2 * sc); // ujung ruas (pergelangan/mata kaki)
        if (endFlat) {
            // telapak kaki rata di lantai, sedikit maju ke arah hadap
            joint.set(0, 0, 0.06 * sc).applyQuaternion(qYaw);
            this._compose(endM, i, root.x + joint.x, Math.max(0.045 * sc, root.y + 0.015 * sc), root.z + joint.z, qYaw, sc);
        } else {
            this._compose(endM, i, root.x, root.y, root.z, this._qb, sc);
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
                if (eng && !eng._walkableStatic(nx, nz)) {
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
                a.t += a.v * dt * a.dir;
                if (a.t > 1) { 
                    if (o.oneWay) a.t -= 1; 
                    else { a.t = 1; a.dir = -1; }
                }
                if (a.t < 0) { 
                    if (o.oneWay) a.t += 1; 
                    else { a.t = 0; a.dir = 1; }
                }
                
                const px = o.to.z - o.from.z, pz = -(o.to.x - o.from.x);
                const pl = Math.hypot(px, pz) || 1;
                const orthX = px / pl, orthZ = pz / pl;
                
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
                
                const finalLane = a.lane + a.laneOffset;
                let nx = o.from.x + (o.to.x - o.from.x) * a.t + orthX * finalLane;
                let nz = o.from.z + (o.to.z - o.from.z) * a.t + orthZ * finalLane;
                
                // Jangan tembus blocker atau pemain/jamaah lain
                const eng = ACTIVE_ENGINE;
                if (eng && !eng._agentWalkable(a, nx, nz)) {
                    a.laneOffset *= 0.5;
                    const safeLane = a.lane + a.laneOffset;
                    nx = o.from.x + (o.to.x - o.from.x) * a.t + orthX * safeLane;
                    nz = o.from.z + (o.to.z - o.from.z) * a.t + orthZ * safeLane;
                }
                
                x = nx;
                z = nz;
                heading = Math.atan2((o.to.x - o.from.x) * a.dir, (o.to.z - o.from.z) * a.dir) + (a.laneOffset * a.dir * 0.3);
                moving = true;
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
                    const nx = a.x + Math.sin(a.heading) * a.v * dt;
                    const nz = a.z + Math.cos(a.heading) * a.v * dt;
                    // Solid: jangan menembus dinding/blocker/pemain — bila terhalang, pilih tujuan baru
                    const eng = ACTIVE_ENGINE;
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

    /** Tutup kepala: tampil bila a.cap, selainnya diciutkan (skala 0). */
    _capAt(a, i, x, y, z, qYaw, sc) {
        if (a.cap) this._compose(this.cap, i, x, y, z, qYaw, sc);
        else this._compose(this.cap, i, x, y, z, qYaw, 0);
    }

    _facial(i, hx, hy, hz, qYaw, sc) {
        // mata kiri
        this._v1.set(-0.04 * sc, 0.02 * sc, 0.105 * sc).applyQuaternion(qYaw);
        this._compose(this.eyeL, i, hx + this._v1.x, hy + this._v1.y, hz + this._v1.z, qYaw, sc);
        // mata kanan
        this._v1.set(0.04 * sc, 0.02 * sc, 0.105 * sc).applyQuaternion(qYaw);
        this._compose(this.eyeR, i, hx + this._v1.x, hy + this._v1.y, hz + this._v1.z, qYaw, sc);
        // hidung
        this._v1.set(0, -0.015 * sc, 0.115 * sc).applyQuaternion(qYaw);
        this._compose(this.nose, i, hx + this._v1.x, hy + this._v1.y, hz + this._v1.z, qYaw, sc);
    }
}

/* ============================================================
 * ENGINE UTAMA
 * ============================================================ */
const _NDC_CENTER = new THREE.Vector2(0, 0);

// Kontrol pandangan
const LOOK_SENS = 0.0028;      // radian per piksel geseran
const MAX_LOOK_DELTA = 120;    // piksel; batas lonjakan per event
const LOOK_DAMP = 18;          // makin besar makin cepat menyusul target
const MOVE_DAMP = 12;          // pelunakan akselerasi/pengereman jalan

// Pekerjaan non-render yang tak perlu ikut laju frame.
const MINIMAP_HZ = 12;
const HOVER_HZ = 20;
// Resolusi adaptif: turunkan pixel ratio bila frame konsisten meleset dari 60fps.
const FRAME_BUDGET_MS = 18;    // ~55fps; di atas ini dianggap gagal 60fps
const FRAME_GOOD_MS = 11;      // ~90fps; ada ruang untuk naik lagi
const PR_MIN = 1.0;

// Scratch — dipakai ulang tiap frame agar tak menyampah GC.
const _eul = new THREE.Euler(0, 0, 0, 'YXZ');
const _eulB = new THREE.Euler(0, 0, 0, 'YXZ');
const _vec = new THREE.Vector3();
const _prevPos = new THREE.Vector3();

export class Engine {
    constructor(container) {
        this.container = container;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        // Supersampling ringan: minimal 1.5× agar tetap tajam di monitor ber-DPR 1.
        // Ini plafon; _adaptResolution boleh turun sampai PR_MIN demi 60fps.
        this._prMax = Math.min(Math.max(window.devicePixelRatio, 1.5), 2);
        this._pr = this._prMax;
        this.renderer.setPixelRatio(this._pr);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.85;
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60, container.clientWidth / container.clientHeight, 0.1, 1200);
        this.camera.position.set(0, 1.7, 5);

        // WebXR (§8): kamera dijadikan anak "dolly"/rig. Di desktop dolly diam di
        // origin (identity) → seluruh kode kamera lama tetap berjalan apa adanya
        // (world == local). Di sesi VR, pose headset diterapkan relatif ke parent
        // kamera (three.WebXRManager: cameraXR = parent.matrixWorld * pose), sehingga
        // memindah dolly = memindah pemain. Lihat _initVR / _onXRStart / _moveVR.
        this.renderer.xr.enabled = true;
        this.dolly = new THREE.Group();
        this.dolly.name = 'xr-rig';
        this.dolly.add(this.camera);
        this.scene.add(this.dolly);

        // Post-processing: bloom halus agar lampu & emissive bercahaya
        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(this.renderer.getPixelRatio());
        // MSAA pada render target composer — tanpa ini post-processing menghilangkan antialias
        if (this.renderer.capabilities.isWebGL2) {
            this.composer.renderTarget1.samples = 4;
            this.composer.renderTarget2.samples = 4;
        }
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloom = new UnrealBloomPass(
            new THREE.Vector2(container.clientWidth, container.clientHeight), 0.2, 0.5, 0.92);
        this.composer.addPass(this.bloom);
        this.composer.addPass(new OutputPass());

        this.pmrem = new THREE.PMREMGenerator(this.renderer);
        this._roomEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        this._lastTime = performance.now();
        this._elapsedTime = 0;
        this.keys = {};
        this.updaters = [];
        this.interactables = [];
        this.walkRects = [];
        this.walkCircles = [];
        this.blockers = [];
        this.playerRadius = 0.3;   // radius tabrakan pemain (kapsul) untuk collision solid
        ACTIVE_ENGINE = this;      // agar Crowd bisa menguji tembus dinding
        this.uiOpen = false;
        this.paused = false;
        this._hover = null;
        this._pendingResolve = null;
        this.audio = new AudioBed();
        this.mats = makeMaterials();
        this.playerSpeed = 3.2;
        this.runSpeed = 6.4;
        this.minimapCfg = null;
        this.waypoint = null;
        this._raycaster = new THREE.Raycaster();
        this._pointerNDC = new THREE.Vector2(0, 0);
        this._dragging = false;
        this._dragMoved = 0;
        this._nextMinimap = 0;
        this._nextHover = 0;
        this._minimapBase = null;  // lapisan statis minimap, digambar sekali
        this._frameAvg = 16.7;
        this._prCooldown = 0;

        this.hud = {
            subtitle: document.getElementById('vr-subtitle'),
            hint: document.getElementById('vr-hint'),
            objective: document.getElementById('vr-objective'),
            counter: document.getElementById('vr-counter'),
            progress: document.getElementById('vr-progressbar'),
            compass: document.getElementById('vr-compass-dial'),
            interactLabel: document.getElementById('vr-interact-label'),
            minimap: document.getElementById('vr-minimap')
        };
        this.narrator = new Narrator(this.hud.subtitle);

        // Fade overlay
        this.fadeEl = document.createElement('div');
        Object.assign(this.fadeEl.style, {
            position: 'absolute', inset: '0', background: '#000', opacity: '1',
            transition: 'opacity 1.2s ease', pointerEvents: 'none', zIndex: '4'
        });
        container.appendChild(this.fadeEl);

        this._onKeyDown = e => { this.keys[e.code] = true; };
        this._onKeyUp = e => { this.keys[e.code] = false; };
        this._onResize = () => this.resize();
        // Kontrol "tahan & geser": tahan klik/touchpad untuk melihat sekeliling,
        // lepas tombol = kursor bebas otomatis (tanpa Esc).
        // Klik tanpa geser = interaksi objek langsung.
        this._onMouseDown = e => {
            if (this.uiOpen || e.button !== 0) return;
            this._dragging = true;
            this._dragMoved = 0;
            this._wasLocked = false;
            this._lastCX = e.clientX;
            this._lastCY = e.clientY;
        };
        this._onMouseMove = e => {
            const r = this.renderer.domElement.getBoundingClientRect();
            this._pointerNDC.set(
                ((e.clientX - r.left) / r.width) * 2 - 1,
                -((e.clientY - r.top) / r.height) * 2 + 1);
            if (!this._dragging || this.uiOpen || this.paused) return;
            const locked = document.pointerLockElement === this.renderer.domElement;
            // movementX hanya andal saat pointer terkunci; selain itu pakai delta clientX
            let mx, my;
            if (locked) {
                mx = e.movementX ?? 0; my = e.movementY ?? 0;
            } else {
                mx = e.clientX - this._lastCX;
                my = e.clientY - this._lastCY;
            }
            this._lastCX = e.clientX;
            this._lastCY = e.clientY;
            // Saat lock baru didapat browser memusatkan kursor dan mengirim satu
            // delta raksasa; buang agar pandangan tak melompat di tengah drag.
            if (locked && !this._wasLocked) { this._wasLocked = true; return; }
            this._wasLocked = locked;
            // Lonjakan dari driver/kompositor (mis. jeda frame) dibatasi supaya satu
            // event tak pernah memutar lebih dari yang bisa diikuti smoothing.
            mx = Math.max(-MAX_LOOK_DELTA, Math.min(MAX_LOOK_DELTA, mx));
            my = Math.max(-MAX_LOOK_DELTA, Math.min(MAX_LOOK_DELTA, my));
            this._dragMoved += Math.abs(mx) + Math.abs(my);
            // kunci pointer hanya SELAMA drag agar gerakan tak terbatas tepi layar
            if (this._dragMoved > 5 && !locked) {
                try { this.renderer.domElement.requestPointerLock(); } catch { }
            }
            if (this._camTargetYaw === undefined) {
                const initEul = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
                this._camTargetYaw = initEul.y;
                this._camTargetPitch = initEul.x;
                this._camCurrentYaw = initEul.y;
                this._camCurrentPitch = initEul.x;
            }
            this._camTargetYaw -= mx * LOOK_SENS;
            this._camTargetPitch = Math.max(-1.45, Math.min(1.45, this._camTargetPitch - my * LOOK_SENS));
        };
        this._onMouseUp = e => {
            if (e.button !== 0 || !this._dragging) return;
            const wasDrag = this._dragMoved > 6;
            this._dragging = false;
            this._wasLocked = false;
            if (document.pointerLockElement) {
                try { document.exitPointerLock(); } catch { }
            }
            if (!wasDrag) this._handleClick();
        };
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('resize', this._onResize);
        this.renderer.domElement.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        this.renderer.domElement.style.cursor = 'crosshair';
        this._initVR();
        this.renderer.setAnimationLoop(() => this._tick());
    }

    /* ------------ Lingkungan & pencahayaan ------------ */

    /** preset waktu: 'day' | 'goldenHour' | 'night' | 'dawn' */
    setEnvironment(preset, { fog = true } = {}) {
        const cfg = {
            day: { elev: 55, azim: 140, turb: 6, rayl: 1.2, expo: 0.35, sun: 0.9, sunColor: 0xfff3df, hemi: 0.18, fogC: 0xcfd9e4, envI: 0.18, bloom: 0.03 },
            goldenHour: { elev: 8, azim: 250, turb: 7, rayl: 2.6, expo: 0.35, sun: 0.8, sunColor: 0xffc37a, hemi: 0.15, fogC: 0xe8c9a0, envI: 0.18, bloom: 0.06 },
            dawn: { elev: 3, azim: 95, turb: 8, rayl: 3.2, expo: 0.4, sun: 0.6, sunColor: 0xa8bfe8, hemi: 0.12, fogC: 0x9fb2cd, envI: 0.15, bloom: 0.09 },
            night: { elev: -12, azim: 0, turb: 4, rayl: 1, expo: 0.55, sun: 0.15, sunColor: 0xa9c3ff, hemi: 0.05, fogC: 0x0a1120, envI: 0.1, bloom: 0.15 }
        }[preset] || {};
        this.envPreset = preset;
        this.renderer.toneMappingExposure = cfg.expo;
        this.bloom.strength = cfg.bloom;

        if (preset === 'night') {
            this.scene.background = new THREE.Color(0x060b18);
            this._addStars();
            this._addMoon();
        } else {
            const sky = new Sky();
            sky.scale.setScalar(45000);
            const u = sky.material.uniforms;
            u.turbidity.value = cfg.turb;
            u.rayleigh.value = cfg.rayl;
            u.mieCoefficient.value = 0.004;
            u.mieDirectionalG.value = 0.8;
            const sun = new THREE.Vector3();
            const phi = THREE.MathUtils.degToRad(90 - cfg.elev);
            const theta = THREE.MathUtils.degToRad(cfg.azim);
            sun.setFromSphericalCoords(1, phi, theta);
            u.sunPosition.value.copy(sun);
            this.scene.add(sky);
            this.sunDir = sun.clone();
            if (preset === 'dawn') this._addStars(600, 0.35);
        }
        this.scene.environment = this._roomEnv;
        this.scene.environmentIntensity = cfg.envI;

        // Cahaya
        const hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7a5c, cfg.hemi);
        this.scene.add(hemi);
        const dir = new THREE.DirectionalLight(cfg.sunColor, cfg.sun);
        const sd = this.sunDir || new THREE.Vector3(-0.4, 0.8, 0.3);
        dir.position.copy(sd.clone().multiplyScalar(140));
        dir.castShadow = true;
        dir.shadow.mapSize.set(4096, 4096);
        dir.shadow.camera.left = -90; dir.shadow.camera.right = 90;
        dir.shadow.camera.top = 90; dir.shadow.camera.bottom = -90;
        dir.shadow.camera.far = 420;
        dir.shadow.bias = -0.0004;
        this.scene.add(dir);
        this.sunLight = dir;

        if (fog) {
            const density = preset === 'night' ? 0.006 : 0.0012;
            this.scene.fog = new THREE.FogExp2(cfg.fogC, density);
        }
    }

    _addStars(count = 1600, opacity = 0.9) {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const v = new THREE.Vector3().randomDirection();
            v.y = Math.abs(v.y) * 0.9 + 0.08;
            v.normalize().multiplyScalar(900);
            pos.set([v.x, v.y, v.z], i * 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffffff, size: 1.6, sizeAttenuation: false,
            transparent: true, opacity
        });
        this.scene.add(new THREE.Points(geo, mat));
    }

    _addMoon() {
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(14, 24, 18),
            new THREE.MeshBasicMaterial({ color: 0xf4f1e0 }));
        moon.position.set(-260, 320, -520);
        this.scene.add(moon);
        const glow = new THREE.PointLight(0xbcd0ff, 0.6, 0, 0);
        glow.position.copy(moon.position);
        this.scene.add(glow);
    }

    addPointLamp(x, y, z, { color = 0xffdf9e, intensity = 22, distance = 30 } = {}) {
        const l = new THREE.PointLight(color, intensity, distance, 2);
        l.position.set(x, y, z);
        this.scene.add(l);
        return l;
    }

    ground(size, material, y = 0) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
        g.rotation.x = -Math.PI / 2;
        g.position.y = y;
        g.receiveShadow = true;
        this.scene.add(g);
        return g;
    }

    /* ------------ Player, navigasi, collision ------------ */

    spawn(x, z, yawDeg = 0, y = 1.7) {
        this.camera.position.set(x, y, z);
        this.camera.rotation.set(0, THREE.MathUtils.degToRad(yawDeg), 0, 'YXZ');
        this._camTargetYaw = undefined;
        this._velF = 0; this._velS = 0; // jangan bawa momentum melewati teleport
    }

    addWalkRect(x1, z1, x2, z2) {
        this.walkRects.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) });
    }
    addWalkCircle(x, z, rOuter, rInner = 0) {
        this.walkCircles.push({ x, z, rOuter, rInner });
    }
    addBlocker(x1, z1, x2, z2) {
        this.blockers.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) });
    }
    /** Bisa dilewati secara geometri statis (blocker + area jalan). Tanpa kerumunan. */
    _walkableStatic(x, z) {
        for (const b of this.blockers) {
            if (x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2) return false;
        }
        if (this.walkRects.length === 0 && this.walkCircles.length === 0) return true;
        for (const r of this.walkRects) {
            if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return true;
        }
        for (const c of this.walkCircles) {
            const d = Math.hypot(x - c.x, z - c.z);
            if (d <= c.rOuter && d >= c.rInner) return true;
        }
        return false;
    }
    /** Terhalang figur kerumunan? (collision solid pemain ↔ jamaah). */
    _crowdBlocks(x, z) {
        // jarak pusat-ke-pusat: radius pemain + radius kapsul jamaah (± 0.3 m, §4.1)
        const rr = this.playerRadius + 0.28, rr2 = rr * rr;
        for (const c of ACTIVE_CROWDS) {
            const agents = c.agents;
            for (let i = 0; i < agents.length; i++) {
                const a = agents[i];
                const dx = x - a.wx, dz = z - a.wz;
                if (dx * dx + dz * dz < rr2) return true;
            }
        }
        return false;
    }
    /** Bisa ditempati pemain: geometri statis DAN tidak menembus jamaah. */
    _walkable(x, z) {
        return this._walkableStatic(x, z) && !this._crowdBlocks(x, z);
    }
    
    /** Bisa ditempati jamaah: geometri statis, hindari pemain, hindari jamaah lain (SOLID). */
    _agentWalkable(agent, x, z) {
        if (!this._walkableStatic(x, z)) return false;
        
        // Hindari pemain
        const dx = x - this.camera.position.x;
        const dz = z - this.camera.position.z;
        const rr = this.playerRadius + 0.35; 
        if (dx * dx + dz * dz < rr * rr) return false;
        
        // Hindari jamaah lain (opsional untuk performa, tapi diminta user agar solid 100%)
        for (const c of ACTIVE_CROWDS) {
            const agents = c.agents;
            for (let i = 0; i < agents.length; i++) {
                const b = agents[i];
                if (agent === b) continue;
                const bdx = x - b.wx, bdz = z - b.wz;
                if (bdx * bdx + bdz * bdz < 0.25) return false; // 0.5 meter jarak aman minimal
            }
        }
        return true;
    }

    _movePlayer(dt) {
        if (this.uiOpen) return;
        const speed = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? this.runSpeed : this.playerSpeed;
        let f = 0, s = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) f += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) f -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) s += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) s -= 1;
        const len = Math.hypot(f, s);
        if (len) { f /= len; s /= len; }
        // Tombol berpindah dari 0 ke 1 seketika; luruhkan ke arah masukan agar
        // langkah punya awalan dan hentian, bukan hidup-mati mendadak.
        const k = 1 - Math.exp(-MOVE_DAMP * dt);
        this._velF = (this._velF ?? 0) + (f - (this._velF ?? 0)) * k;
        this._velS = (this._velS ?? 0) + (s - (this._velS ?? 0)) * k;
        if (Math.abs(this._velF) < 1e-3 && Math.abs(this._velS) < 1e-3) {
            this._velF = 0; this._velS = 0;
            return;
        }
        f = this._velF; s = this._velS;
        const prev = _prevPos.copy(this.camera.position);
        // maju/samping relatif arah pandang (yaw): yaw 0 menghadap -Z
        _eulB.setFromQuaternion(this.camera.quaternion, 'YXZ');
        const sinY = Math.sin(_eulB.y), cosY = Math.cos(_eulB.y);
        const p = this.camera.position;
        p.x += (f * -sinY + s * cosY) * speed * dt;
        p.z += (f * -cosY + s * -sinY) * speed * dt;
        if (!this._walkable(p.x, p.z)) {
            // coba per-sumbu agar bisa menyusur dinding
            if (this._walkable(p.x, prev.z)) p.z = prev.z;
            else if (this._walkable(prev.x, p.z)) p.x = prev.x;
            else p.copy(prev);
        }
        p.y = 1.7;
    }

    /* ============ WebXR / VR (§8) ============ */

    /** Siapkan tombol "Enter VR", controller, dan handler sesi. Aman di non-VR. */
    _initVR() {
        this._vrButton = null;
        this._xrControllers = [];
        // Tombol Enter VR (mandiri, tanpa addon eksternal)
        const btn = document.createElement('button');
        btn.className = 'vr-enter-btn';
        btn.textContent = 'VR';
        btn.style.cssText = [
            'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
            'z-index:45', 'padding:10px 22px', 'font:600 14px/1 "Segoe UI",sans-serif',
            'letter-spacing:1px', 'color:#0d1a12', 'background:#e8c96a', 'border:0',
            'border-radius:24px', 'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,.4)'
        ].join(';');
        this.container.appendChild(btn);
        this._vrButton = btn;

        const xr = navigator.xr;
        if (!xr || !xr.isSessionSupported) {
            btn.textContent = 'VR TAK DIDUKUNG';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            return;
        }
        xr.isSessionSupported('immersive-vr').then(supported => {
            if (!supported) {
                btn.textContent = 'VR TAK TERSEDIA';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                return;
            }
            btn.textContent = '🥽 ENTER VR';
            let currentSession = null;
            btn.onclick = async () => {
                if (currentSession) { currentSession.end(); return; }
                try {
                    const session = await xr.requestSession('immersive-vr', {
                        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
                    });
                    currentSession = session;
                    session.addEventListener('end', () => { currentSession = null; btn.textContent = '🥽 ENTER VR'; });
                    btn.textContent = '⏹ EXIT VR';
                    this.renderer.xr.setReferenceSpaceType('local-floor');
                    await this.renderer.xr.setSession(session);
                } catch (e) {
                    console.error('Gagal memulai sesi VR:', e);
                    btn.textContent = 'VR GAGAL';
                }
            };
        }).catch(() => {
            btn.textContent = 'VR TAK TERSEDIA';
            btn.disabled = true;
        });

        // Controller Quest 2 (kiri & kanan) + sinar penunjuk, dipasang di dolly.
        const rayGeo = new THREE.BufferGeometry().setFromPoints(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.add(new THREE.Line(rayGeo,
                new THREE.LineBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.8 })));
            controller.userData.ray = controller.children[0];
            controller.userData.ray.scale.z = 6;
            controller.addEventListener('selectstart', () => this._onVRSelect(controller));
            this.dolly.add(controller);
            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(new THREE.Mesh(
                new THREE.BoxGeometry(0.045, 0.045, 0.12),
                new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.6 })));
            this.dolly.add(grip);
            this._xrControllers.push(controller);
        }

        this.renderer.xr.addEventListener('sessionstart', () => this._onXRStart());
        this.renderer.xr.addEventListener('sessionend', () => this._onXREnd());
    }

    /** Saat sesi VR mulai: pindahkan posisi pemain (dunia) ke dolly, kamera lokal di-nol. */
    _onXRStart() {
        const p = this.camera.position;
        const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        this.dolly.position.set(p.x, 0, p.z); // kaki di lantai; tinggi dari headset (local-floor)
        this.dolly.rotation.set(0, e.y, 0);
        this.camera.position.set(0, 0, 0);    // pose diambil alih headset
        this.setHint('Mode VR aktif · dorong thumbstick kiri untuk berjalan · trigger untuk berinteraksi');
    }

    /** Saat keluar VR: kembalikan posisi ke kamera desktop (kontinu dari lokasi terakhir). */
    _onXREnd() {
        const p = this.dolly.position;
        this.camera.position.set(p.x, 1.7, p.z);
        this.camera.quaternion.setFromEuler(new THREE.Euler(0, this.dolly.rotation.y, 0, 'YXZ'));
        this.dolly.position.set(0, 0, 0);
        this.dolly.rotation.set(0, 0, 0);
    }

    /** Lokomosi VR: thumbstick kiri menggeser dolly, relatif arah pandang headset, dengan collision. */
    _moveVR(dt) {
        const session = this.renderer.xr.getSession && this.renderer.xr.getSession();
        if (!session || this.uiOpen) return;
        let mx = 0, my = 0;
        for (const src of session.inputSources) {
            if (!src.gamepad || (src.handedness !== 'left' && src.handedness !== 'none')) continue;
            const ax = src.gamepad.axes;
            mx += ax.length >= 4 ? ax[2] : (ax[0] || 0);
            my += ax.length >= 4 ? ax[3] : (ax[1] || 0);
        }
        if (Math.abs(mx) < 0.15 && Math.abs(my) < 0.15) return;
        const cam = this.renderer.xr.getCamera();
        const e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
        const sinY = Math.sin(e.y), cosY = Math.cos(e.y);
        const f = -my, s = mx; // thumbstick atas = maju (-Z)
        const speed = this.playerSpeed;
        const nx = this.dolly.position.x + (f * -sinY + s * cosY) * speed * dt;
        const nz = this.dolly.position.z + (f * -cosY + s * -sinY) * speed * dt;
        if (this._walkable(nx, nz)) { this.dolly.position.x = nx; this.dolly.position.z = nz; }
        else if (this._walkable(nx, this.dolly.position.z)) this.dolly.position.x = nx;
        else if (this._walkable(this.dolly.position.x, nz)) this.dolly.position.z = nz;
    }

    /** Trigger controller → raycast ke objek interaktif lalu klik (reuse alur desktop). */
    _onVRSelect(controller) {
        if (this.uiOpen || this.interactables.length === 0) return;
        const m = new THREE.Matrix4().extractRotation(controller.matrixWorld);
        this._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(m);
        this._raycaster.far = 30;
        const hits = this._raycaster.intersectObjects(this.interactables, true);
        for (const h of hits) {
            const root = h.object.userData.interactRoot;
            if (root && root.userData.interact?.enabled) { this._hover = root; this._handleClick(); return; }
        }
    }

    /* ------------ Interaksi (hover + klik) ------------ */

    addInteractable(object3d, { label, onClick, once = true, radius = 14 } = {}) {
        object3d.traverse(o => { o.userData.interactRoot = object3d; });
        object3d.userData.interact = { label, onClick, once, radius, enabled: true };
        this.interactables.push(object3d);
        return object3d;
    }
    removeInteractable(object3d) {
        const i = this.interactables.indexOf(object3d);
        if (i >= 0) this.interactables.splice(i, 1);
        if (object3d.userData.interact) object3d.userData.interact.enabled = false;
    }

    _raycastInteract() {
        if (this.interactables.length === 0) return null;
        // saat drag pakai tengah layar, selain itu ikuti posisi kursor
        const ndc = this._dragging ? _NDC_CENTER : this._pointerNDC;
        this._raycaster.setFromCamera(ndc, this.camera);
        this._raycaster.far = 30;
        const hits = this._raycaster.intersectObjects(this.interactables, true);
        for (const h of hits) {
            const root = h.object.userData.interactRoot;
            if (!root || !root.userData.interact?.enabled) continue;
            const d = this.camera.position.distanceTo(root.getWorldPosition(_vec));
            if (d <= root.userData.interact.radius) return root;
        }
        return null;
    }

    _setHover(obj) {
        if (this._hover === obj) return;
        if (this._hover) this._applyHighlight(this._hover, false);
        this._hover = obj;
        if (obj) {
            this._applyHighlight(obj, true);
            this.hud.interactLabel.textContent = '🖱 ' + (obj.userData.interact.label || 'Interaksi');
            this.audio.sfx('hover');
        } else {
            this.hud.interactLabel.textContent = '';
        }
    }
    _applyHighlight(obj, on) {
        obj.traverse(o => {
            if (o.isMesh && o.material && o.material.emissive !== undefined) {
                if (on) {
                    if (o.userData._origEmissive === undefined) {
                        o.userData._origEmissive = o.material.emissive.getHex();
                        o.userData._origEmissiveI = o.material.emissiveIntensity;
                        o.material = o.material.clone();
                        o.material.emissive.setHex(0xc9a227);
                        o.material.emissiveIntensity = 0.45;
                    }
                } else if (o.userData._origEmissive !== undefined) {
                    o.material.emissive.setHex(o.userData._origEmissive);
                    o.material.emissiveIntensity = o.userData._origEmissiveI;
                    delete o.userData._origEmissive;
                }
            }
        });
    }

    _handleClick() {
        if (this.uiOpen) return;
        const obj = this._hover || this._raycastInteract();
        if (!obj) return;
        const it = obj.userData.interact;
        if (!it?.enabled) return;
        this.audio.sfx('click');
        if (it.once) {
            it.enabled = false;
            this._setHover(null);
        }
        it.onClick?.(obj);
    }

    /* ------------ Waypoint / beacon tujuan ------------ */

    showWaypoint(x, z, color = 0x37c978) {
        this.hideWaypoint();
        const grp = new THREE.Group();
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.9, 0.07, 10, 40),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.42, 7, 14, 1, true),
            new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.22,
                side: THREE.DoubleSide, depthWrite: false
            }));
        beam.position.y = 3.5;
        grp.add(ring, beam);
        grp.position.set(x, 0, z);
        this.scene.add(grp);
        this.waypoint = grp;
        this._waypointRing = ring;
        // Jalur cahaya dari pemain menuju waypoint (titik mengalir di lantai)
        const dotGeo = new THREE.SphereGeometry(0.15, 8, 6);
        const dotMat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.95, depthWrite: false
        });
        this._guide = new THREE.InstancedMesh(dotGeo, dotMat, 36);
        this._guide.frustumCulled = false;
        this.scene.add(this._guide);
        this._guideM = this._guideM || new THREE.Matrix4();
    }
    hideWaypoint() {
        if (this.waypoint) {
            this.scene.remove(this.waypoint);
            this.waypoint = null;
        }
        if (this._guide) {
            this.scene.remove(this._guide);
            this._guide.geometry.dispose();
            this._guide.material.dispose();
            this._guide = null;
        }
    }

    /** Titik cahaya mengalir dari posisi pemain ke waypoint aktif. */
    _updateGuide(t) {
        if (!this._guide || !this.waypoint) return;
        const p = this.camera.position, w = this.waypoint.position;
        const dx = w.x - p.x, dz = w.z - p.z;
        const dist = Math.hypot(dx, dz);
        const n = this._guide.count;
        const flow = (t * 0.35) % (1 / n);
        for (let i = 0; i < n; i++) {
            const u = i / n + flow;
            const d = u * dist;
            // sembunyikan titik yang terlalu dekat pemain / sudah sampai target
            if (d < 1.4 || d > dist - 0.9 || dist < 3) {
                this._guideM.makeScale(0, 0, 0);
            } else {
                const pulse = 0.75 + 0.45 * Math.sin(t * 5 - u * 14);
                this._guideM.makeScale(pulse, pulse, pulse);
                this._guideM.setPosition(p.x + dx * u, 0.18 + Math.sin(u * Math.PI) * 0.1, p.z + dz * u);
            }
            this._guide.setMatrixAt(i, this._guideM);
        }
        this._guide.instanceMatrix.needsUpdate = true;
    }

    /** Menunggu player tiba di titik (x,z). */
    goto(x, z, { radius = 2.2, label = null } = {}) {
        if (label) this.setObjective(label);
        this.showWaypoint(x, z);
        return new Promise(resolve => {
            const check = () => {
                const p = this.camera.position;
                if (Math.hypot(p.x - x, p.z - z) < radius) {
                    this.hideWaypoint();
                    this.audio.sfx('chime');
                    return true;
                }
                return false;
            };
            this.updaters.push({ done: false, fn: (dt, t, self) => { if (check()) { self.done = true; resolve(); } } });
        });
    }

    /** Menunggu klik pada objek interaktif tertentu. */
    interact(object3d, { label, radius = 10, highlightBeacon = true } = {}) {
        return new Promise(resolve => {
            if (highlightBeacon) {
                const p = object3d.getWorldPosition(new THREE.Vector3());
                this.showWaypoint(p.x, p.z, 0xc9a227);
            }
            this.addInteractable(object3d, {
                label, radius,
                onClick: () => { this.hideWaypoint(); resolve(); }
            });
        });
    }

    /* ------------ HUD ------------ */

    setObjective(t) { if (this.hud.objective) this.hud.objective.textContent = t ? '🎯 ' + t : ''; }
    setHint(t) { if (this.hud.hint) this.hud.hint.textContent = t || ''; }
    setCounter(t) { if (this.hud.counter) this.hud.counter.innerHTML = t || ''; }
    setProgress(pct) { if (this.hud.progress) this.hud.progress.style.width = Math.round(pct) + '%'; }

    narrate(text, opts) { return this.narrator.say(text, opts); }
    subtitle(t) { if (this.hud.subtitle) this.hud.subtitle.textContent = t || ''; }

    notifyDotnet(msg, type = 'info') {
        this.dotnet?.invokeMethodAsync('OnNotify', msg, type);
    }

    configureMinimap(cfg) { this.minimapCfg = cfg; this._minimapBase = null; }

    /** Latar minimap (area jalan + fitur) tak pernah berubah — gambar sekali, lalu blit. */
    _buildMinimapBase(W, H, px, scale) {
        const base = document.createElement('canvas');
        base.width = W; base.height = H;
        const g = base.getContext('2d');
        g.fillStyle = 'rgba(8,12,20,0.85)';
        g.fillRect(0, 0, W, H);
        // area jalan
        g.strokeStyle = 'rgba(201,162,39,0.5)'; g.lineWidth = 1;
        g.fillStyle = 'rgba(60,80,110,0.35)';
        for (const r of this.walkRects) {
            const [ax, az] = px(r.x1, r.z1), [bx, bz] = px(r.x2, r.z2);
            g.fillRect(ax, az, bx - ax, bz - az);
            g.strokeRect(ax, az, bx - ax, bz - az);
        }
        for (const ci of this.walkCircles) {
            const [cx, cz] = px(ci.x, ci.z);
            g.beginPath(); g.arc(cx, cz, ci.rOuter * scale, 0, 7); g.fill(); g.stroke();
            if (ci.rInner > 0) {
                g.fillStyle = 'rgba(8,12,20,0.9)';
                g.beginPath(); g.arc(cx, cz, ci.rInner * scale, 0, 7); g.fill();
                g.fillStyle = 'rgba(60,80,110,0.35)';
            }
        }
        // fitur khusus
        for (const f of (this.minimapCfg.features || [])) {
            const [fx, fz] = px(f.x, f.z);
            g.fillStyle = f.color || '#e8c96a';
            if (f.type === 'square') g.fillRect(fx - 4, fz - 4, 8, 8);
            else { g.beginPath(); g.arc(fx, fz, 3.5, 0, 7); g.fill(); }
        }
        return base;
    }

    _drawMinimap() {
        const c = this.hud.minimap;
        if (!c || !this.minimapCfg) return;
        const g = c.getContext('2d');
        const { scale = 1.2, center = { x: 0, z: 0 } } = this.minimapCfg;
        const W = c.width, H = c.height;
        const px = (x, z) => [
            W / 2 + (x - center.x) * scale,
            H / 2 + (z - center.z) * scale
        ];
        // adegan boleh menambah area jalan setelah configureMinimap; bangun ulang bila berubah
        const shape = `${W}x${H}:${this.walkRects.length}:${this.walkCircles.length}`;
        if (!this._minimapBase || this._minimapShape !== shape) {
            this._minimapBase = this._buildMinimapBase(W, H, px, scale);
            this._minimapShape = shape;
        }
        g.clearRect(0, 0, W, H);
        g.drawImage(this._minimapBase, 0, 0);
        // waypoint
        if (this.waypoint) {
            const [wx, wz] = px(this.waypoint.position.x, this.waypoint.position.z);
            g.fillStyle = '#37c978';
            g.beginPath(); g.arc(wx, wz, 5, 0, 7); g.fill();
        }
        // player
        const p = this.camera.position;
        const [pxx, pzz] = px(p.x, p.z);
        _eulB.setFromQuaternion(this.camera.quaternion, 'YXZ');
        g.save();
        g.translate(pxx, pzz);
        g.rotate(-_eulB.y);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6);
        g.closePath(); g.fill();
        g.restore();
    }

    /* ------------ Transisi ------------ */

    async fadeIn(ms = 1200) {
        this.fadeEl.style.transitionDuration = ms + 'ms';
        this.fadeEl.style.opacity = '0';
        await new Promise(r => setTimeout(r, ms));
    }
    async fadeOut(ms = 800) {
        this.fadeEl.style.transitionDuration = ms + 'ms';
        this.fadeEl.style.opacity = '1';
        await new Promise(r => setTimeout(r, ms));
    }
    async teleport(x, z, yawDeg, ms = 900) {
        await this.fadeOut(ms);
        this.spawn(x, z, yawDeg);
        await this.fadeIn(ms);
    }

    wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* ------------ Loop ------------ */

    onUpdate(fn) { this.updaters.push({ done: false, fn }); }

    _tick() {
        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.05);
        this._lastTime = now;
        this._elapsedTime += dt;
        const t = this._elapsedTime;
        const inVR = this.renderer.xr.isPresenting;
        if (!this.paused) {
            if (!inVR && this._camTargetYaw !== undefined) {
                // Peluruhan eksponensial: laju menyusul target sama di 30fps maupun 144fps,
                // tak seperti lerp dt*k yang mengeras saat frame rate turun.
                const k = 1 - Math.exp(-LOOK_DAMP * dt);
                this._camCurrentYaw += (this._camTargetYaw - this._camCurrentYaw) * k;
                this._camCurrentPitch += (this._camTargetPitch - this._camCurrentPitch) * k;
                _eul.set(this._camCurrentPitch, this._camCurrentYaw, 0, 'YXZ');
                this.camera.quaternion.setFromEuler(_eul);
            }
            if (inVR) this._moveVR(dt); else this._movePlayer(dt);
            for (const c of ACTIVE_CROWDS) c.update(dt, t);
            for (let i = this.updaters.length - 1; i >= 0; i--) {
                const u = this.updaters[i];
                u.fn(dt, t, u);
                if (u.done) this.updaters.splice(i, 1);
            }
            if (this.waypoint && this._waypointRing) {
                const s = 1 + Math.sin(t * 4) * 0.18;
                this._waypointRing.scale.setScalar(s);
                this.waypoint.rotation.y = t * 0.8;
                this._updateGuide(t);
            }
            // Raycast & gambar-ulang HUD tak perlu tiap frame: keduanya tak terlihat
            // lebih halus di 60fps, tapi ongkosnya memakan anggaran frame.
            if (!this.uiOpen && t >= this._nextHover) {
                this._nextHover = t + 1 / HOVER_HZ;
                this._setHover(this._raycastInteract());
            }
            if (t >= this._nextMinimap) {
                this._nextMinimap = t + 1 / MINIMAP_HZ;
                if (this.hud.compass) {
                    _eul.setFromQuaternion(this.camera.quaternion, 'YXZ');
                    this.hud.compass.style.transform = `rotate(${_eul.y}rad)`;
                }
                this._drawMinimap();
            }
        }
        // EffectComposer tidak kompatibel dengan framebuffer WebXR (merusak stereo),
        // maka saat sesi VR aktif kita render langsung (tanpa bloom/postprocessing).
        if (inVR) this.renderer.render(this.scene, this.camera);
        else { this.composer.render(); this._adaptResolution(dt); }
    }

    /** Jaga 60fps: turunkan resolusi render saat frame melar, naikkan lagi saat lega. */
    _adaptResolution(dt) {
        // rata-rata bergerak; satu frame tersendat tak boleh memicu perubahan
        this._frameAvg += (dt * 1000 - this._frameAvg) * 0.05;
        if (this._prCooldown > 0) { this._prCooldown -= dt; return; }
        let pr = this._pr;
        if (this._frameAvg > FRAME_BUDGET_MS) pr = Math.max(PR_MIN, this._pr - 0.25);
        else if (this._frameAvg < FRAME_GOOD_MS) pr = Math.min(this._prMax, this._pr + 0.25);
        if (pr === this._pr) return;
        this._pr = pr;
        this.renderer.setPixelRatio(pr);
        this.composer.setPixelRatio(pr);
        this.resize();
        // beri waktu rata-rata menyesuaikan resolusi baru sebelum menilai ulang
        this._prCooldown = 1.5;
        this._frameAvg = (FRAME_BUDGET_MS + FRAME_GOOD_MS) / 2;
    }

    resize() {
        const w = this.container.clientWidth, h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }

    setUiOpen(open) {
        this.uiOpen = open;
        if (open) {
            this._dragging = false;
            this._wasLocked = false;
            this._velF = 0; this._velS = 0; // berhenti, bukan melanjut saat UI ditutup
            if (document.pointerLockElement) {
                try { document.exitPointerLock(); } catch { }
            }
        }
    }

    dispose() {
        this.renderer.setAnimationLoop(null);
        ACTIVE_CROWDS.length = 0;
        if (ACTIVE_ENGINE === this) ACTIVE_ENGINE = null;
        // Bersihkan WebXR: akhiri sesi & lepas tombol Enter VR
        try { this.renderer.xr.getSession()?.end(); } catch { }
        if (this._vrButton) { this._vrButton.remove(); this._vrButton = null; }
        this.narrator.stop();
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('resize', this._onResize);
        this.renderer.domElement.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        if (document.pointerLockElement) {
            try { document.exitPointerLock(); } catch { }
        }
        this.scene.traverse(o => {
            o.geometry?.dispose?.();
            if (o.material) {
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose?.());
            }
        });
        this.pmrem.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.fadeEl.remove();
    }
}
