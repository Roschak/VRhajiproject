# Menjalankan VR Haji di Meta Quest 2

Pelengkap operasional dari `VR_WEBXR_BUTTON_GUIDE.md` — dokumen itu menjelaskan
*kenapa*, ini langkah konkret di repo ini.

## 1. Jalankan server agar bisa dijangkau dari luar PC

```powershell
dotnet run --project src\VRHaji.Web --launch-profile vr-lan
```

Profil `vr-lan` mendengarkan `http://0.0.0.0:5101` (bukan hanya `localhost`),
supaya tunnel bisa menembusnya. Profil lain:

| Profil  | URL | Dipakai untuk |
|---|---|---|
| `http`  | `http://localhost:5101` | pengembangan biasa di PC (localhost = secure context, WebXR emulator jalan) |
| `https` | `https://localhost:5201` | uji secure context asli di PC |
| `vr-lan`| `http://0.0.0.0:5101` | testing dari headset lewat ngrok/Cloudflare Tunnel |

## 2. Buat URL HTTPS publik

WebXR hanya aktif di secure context, dan `localhost` PC tidak terjangkau dari headset.

```powershell
ngrok http 5101
```

Salin URL `https://xxxx.ngrok-free.app`. (Alternatif: `cloudflared tunnel --url http://localhost:5101`.)

## 3. Buka dari headset

1. Di Quest 2 buka **Meta Browser** (atau Wolvic) — browser lain sering tidak lengkap WebXR-nya.
2. Buka URL ngrok tadi → pilih scene → tekan **▶ Mulai Simulasi**.
3. Tekan tombol **🥽 Masuk VR** di kanan atas HUD.

Kalau tombol tidak muncul, itu memang perilaku yang dirancang: engine
menyembunyikannya saat `isSessionSupported('immersive-vr')` bernilai `false`, dan
alasannya dicetak di kotak pesan bawah layar (bukan hanya di console).

## 4. Kontrol di dalam VR

| Input | Aksi |
|---|---|
| Thumbstick kiri | Berjalan (relatif arah pandang headset, tetap kena collision) |
| Thumbstick kanan | Snap-turn 30° (berputar mengelilingi kepala) |
| Trigger | Interaksi dengan objek yang ditunjuk sinar controller |
| Jalan kaki fisik | Ikut diuji collision — tidak bisa menembus dinding |

Subtitle, objective, dan label interaksi HUD DOM tidak terlihat di headset, jadi
isinya dicerminkan ke panel 3D yang mengikuti kepala (`Engine._updateVRHud`).

## 5. Troubleshooting cepat

| Gejala | Cek |
|---|---|
| Tombol tersembunyi + pesan "butuh HTTPS" | `window.isSecureContext` harus `true`; jangan pakai `http://<ip-lan>` |
| `requestSession` gagal `NotAllowedError` | Izin **Motion and Light Sensors** untuk Meta Browser belum diberikan |
| Layar hitam saat sesi mulai | Render loop wajib `renderer.setAnimationLoop` — sudah dipakai di `Engine` |
| Stereo rusak/berbayang | Post-processing (`EffectComposer`) sengaja dilewati saat `xr.isPresenting` |

Debug dari PC: `chrome://inspect` → Remote Target (headset terhubung USB, Developer Mode aktif).
