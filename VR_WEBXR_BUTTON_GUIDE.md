# 🚀 Panduan Implementasi Tombol VR & WebXR (Oculus/Meta Quest 2)

> Dokumen pendamping dari `ASSET_SPEC.md`. Kalau `ASSET_SPEC.md` mengatur **isi scene** (asset, collision), dokumen ini mengatur **cara masuk ke scene itu di headset** — dari tombol "Masuk VR" di halaman Blazor sampai session WebXR benar-benar aktif di Quest 2.

---

## Daftar Isi
1. [Persiapan Infrastruktur](#1-persiapan-infrastruktur-wajib)
2. [Alur Kerja Tombol VR](#2-alur-kerja-tombol-vr)
3. [Implementasi — Three.js (stack utama proyek ini)](#3-implementasi--threejs-stack-utama-proyek-ini)
4. [Implementasi — Alternatif A-Frame / React](#4-implementasi--alternatif-a-frame--react)
5. [Integrasi ke Blazor Server](#5-integrasi-ke-blazor-server)
6. [Checklist Implementasi](#6-checklist-implementasi)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Persiapan Infrastruktur (Wajib)

WebXR **tidak akan aktif** kalau syarat berikut belum terpenuhi — ini penyebab paling umum "tombol VR tidak reaktif":

| Syarat | Detail |
|---|---|
| **Secure Context** | Wajib `https://` atau `localhost`. Protokol `http://` biasa (selain localhost) akan diblokir browser secara diam-diam. |
| **Tunneling untuk testing** | Karena Quest 2 mengakses server dari device lain, `localhost` di PC tidak terjangkau. Gunakan `ngrok` atau `Cloudflare Tunnel` untuk dapat URL HTTPS publik. |
| **Browser di Quest 2** | Gunakan **Meta Browser** (bawaan) atau **Wolvic** — keduanya mendukung WebXR penuh. Browser pihak ketiga lain sering tidak lengkap dukungannya. |

> Detail lengkap cara setup ngrok/HTTPS untuk Blazor Server ada di catatan sebelumnya di percakapan ini — ringkasnya: `ngrok http https://localhost:5001`, lalu buka URL `https://xxxx.ngrok-free.app` dari Meta Browser di headset.

---

## 2. Alur Kerja Tombol VR

Urutan yang harus terjadi setiap kali user menekan tombol "Masuk VR":

```
User klik tombol
      │
      ▼
Cek navigator.xr tersedia? ──── Tidak ──▶ Sembunyikan/nonaktifkan tombol dari awal
      │ Ya
      ▼
Cek isSessionSupported('immersive-vr')? ──── False ──▶ Tampilkan pesan "device tidak mendukung"
      │ True
      ▼
requestSession('immersive-vr', {...})
      │
      ├── Berhasil ──▶ Masukkan session ke render loop Three.js (onSessionStarted)
      │
      └── Gagal/ditolak user ──▶ Tampilkan fallback UI + instruksi
```

Prinsip pentingnya: **jangan asumsikan tombol pasti berhasil**. Selalu ada 3 cabang (tidak didukung / berhasil / gagal), dan ketiganya harus punya UI feedback masing-masing — bukan cuma diam.

---

## 3. Implementasi — Three.js (stack utama proyek ini)

Karena proyek ini pakai **Three.js**, ini implementasi yang paling langsung dipakai (bukan versi React di §4).

### 3.1 Cara termudah — `VRButton` bawaan Three.js

```javascript
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// renderer sudah ada dari scene-init.js
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// PENTING: WebXR wajib pakai setAnimationLoop, BUKAN requestAnimationFrame biasa
renderer.setAnimationLoop(function () {
  // update physics (Rapier/Cannon) di sini, lalu render
  renderer.render(scene, camera);
});
```

`VRButton` otomatis menangani ketiga cabang di §2 (cek dukungan, request session, fallback) — jadi ini pilihan default kalau tidak butuh UI tombol custom.

### 3.2 Kalau butuh tombol custom (desain sendiri, bukan tombol bawaan)

```javascript
async function startVR(renderer, onSessionStarted) {
  // 1. Cek apakah perangkat mendukung WebXR sama sekali
  if (!navigator.xr) {
    showFallbackMessage("Browser ini tidak mendukung WebXR. Gunakan Meta Browser di Quest 2.");
    return;
  }

  // 2. Cek dukungan immersive-vr secara spesifik
  const supported = await navigator.xr.isSessionSupported('immersive-vr');
  if (!supported) {
    showFallbackMessage("Perangkat tidak mendukung sesi VR immersive.");
    return;
  }

  // 3. Minta session — optionalFeatures tidak akan menggagalkan request
  //    kalau tidak tersedia, beda dengan requiredFeatures
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-ur
    });

    await renderer.xr.setSession(session);
    renderer.xr.enabled = true;
    onSessionStarted(session);

  } catch (err) {
    console.error("Gagal masuk ke sesi VR:", err);
    showFallbackMessage("Gagal memulai VR. Pastikan menggunakan Meta Browser dan koneksi HTTPS aktif.");
  }
}

function showFallbackMessage(msg) {
  const el = document.getElementById('vr-fallback-message');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else alert(msg);
}
```

### 3.3 UX: sembunyikan tombol sejak awal kalau tidak didukung

Jangan tunggu user klik dulu baru kasih tahu "tidak didukung" — cek di awal saat halaman load:

```javascript
async function initVRButtonVisibility() {
  const btn = document.getElementById('btn-enter-vr');
  if (!navigator.xr) { btn.style.display = 'none'; return; }

  const supported = await navigator.xr.isSessionSupported('immersive-vr');
  btn.style.display = supported ? 'inline-block' : 'none';
}
initVRButtonVisibility();
```

---

## 4. Implementasi — Alternatif A-Frame / React

Kalau ada bagian proyek yang tetap pakai A-Frame atau komponen React terpisah (bukan Three.js langsung), ini polanya. **Tidak dipakai sebagai jalur utama**, hanya referensi kalau dibutuhkan.

**A-Frame** — cukup atribut di `<a-scene>`, tidak perlu kode JS manual:
```html
<a-scene webxr="optionalFeatures: local-floor;">
  <!-- konten scene -->
</a-scene>
```

**React** — logic sama dengan §3.2, dibungkus jadi handler komponen:
```javascript
async function startVR() {
  if (navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')) {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });
      onSessionStarted(session); // masuk ke render loop Three.js
    } catch (err) {
      console.error("Gagal masuk ke sesi VR:", err);
    }
  } else {
    alert("Perangkat tidak mendukung VR atau tidak dalam Secure Context (HTTPS)!");
  }
}
```

---

## 5. Integrasi ke Blazor Server

Karena render loop & WebXR API harus 100% jalan di sisi client (JS), Blazor **tidak memanggil `requestSession` langsung dari C#**. Pola yang benar:

**`wwwroot/js/interop.js`**
```javascript
window.vrInterop = {
  initVRButton: (dotnetRef) => {
    const btn = document.getElementById('btn-enter-vr');
    btn.addEventListener('click', () => startVR());
    initVRButtonVisibility(); // dari §3.3

    // opsional: kabari Blazor saat session dimulai/berakhir,
    // supaya state simulasi (bukan physics/render) tetap sinkron
    window.__notifySessionStarted = () => dotnetRef.invokeMethodAsync('OnVRSessionStarted');
    window.__notifySessionEnded = () => dotnetRef.invokeMethodAsync('OnVRSessionEnded');
  }
};
```

**`Pages/Simulation.razor`**
```razor
@inject IJSRuntime JS

<button id="btn-enter-vr">Masuk VR</button>

@code {
  private DotNetObjectReference<Simulation>? dotnetRef;

  protected override async Task OnAfterRenderAsync(bool firstRender)
  {
    if (firstRender)
    {
      dotnetRef = DotNetObjectReference.Create(this);
      await JS.InvokeVoidAsync("vrInterop.initVRButton", dotnetRef);
    }
  }

  [JSInvokable]
  public void OnVRSessionStarted()
  {
    // update state simulasi di sisi Blazor (misal: log waktu mulai, ubah UI non-VR)
    StateHasChanged();
  }

  [JSInvokable]
  public void OnVRSessionEnded()
  {
    StateHasChanged();
  }
}
```

Pembagian tanggung jawab tetap sama seperti di `ASSET_SPEC.md` §6: **Blazor = state/orchestration, JS/Three.js = semua yang real-time** (render, physics, WebXR session).

---

## 6. Checklist Implementasi

- [ ] Tombol punya `id="btn-enter-vr"` dan disembunyikan otomatis kalau `isSessionSupported('immersive-vr')` bernilai `false`
- [ ] `renderer.xr.enabled = true` sudah diset sebelum request session
- [ ] Render loop pakai `renderer.setAnimationLoop()`, **bukan** `requestAnimationFrame()`
- [ ] Ada fallback UI (bukan cuma `console.error`) saat `requestSession` gagal — instruksikan user pakai Meta Browser
- [ ] `optionalFeatures` dipakai untuk fitur yang sifatnya "boleh ada" (`local-floor`, `hand-tracking`); pakai `requiredFeatures` hanya kalau simulasi memang tidak bisa jalan tanpa fitur itu
- [ ] Server diakses lewat HTTPS/ngrok saat testing dari headset (lihat §1)
- [ ] Sudah dites: request session dari Blazor Server via JS Interop, session start/end ter-notify balik ke C# (§5)

---

## 7. Troubleshooting

| Gejala | Cara cek | Kemungkinan penyebab |
|---|---|---|
| Tombol tidak bereaksi sama sekali saat diklik | Buka **Remote Debugging** dari Quest 2 ke laptop, lihat console JS | Event listener belum ter-attach, atau ada JS error sebelumnya yang menghentikan eksekusi |
| `isSessionSupported` selalu `false` | Cek `window.isSecureContext` di console browser Quest 2 — harus `true` | Bukan HTTPS, atau certificate tidak valid/tidak di-trust |
| `requestSession` gagal tanpa pesan jelas | Cek izin Meta Browser | Meta Browser belum diberi izin akses **Motion and Light Sensors** — cek di pengaturan browser/OS Quest |
| Session mulai tapi layar hitam / tidak render | Cek render loop | Masih pakai `requestAnimationFrame` alih-alih `renderer.setAnimationLoop()` |
| Bekerja di desktop browser tapi tidak di Quest 2 | Bandingkan browser | Desktop Chrome/Edge punya WebXR emulator yang lebih permisif; test asli tetap wajib di Meta Browser |

---

*Lihat juga: `ASSET_SPEC.md` untuk spesifikasi asset & collision yang berjalan di dalam session VR ini.*
