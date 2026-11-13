# Laporan Praktik Kerja Lapangan

## Pengembangan Simulasi Perjalanan Haji dan Umrah Berbasis Web 3D/VR

**Nama proyek:** VR Haji Project  
**Jenis aplikasi:** Simulasi edukasi, perjalanan virtual, dan visualisasi 3D  
**Platform:** Web browser dan perangkat WebXR/VR yang kompatibel  
**Status:** Prototipe interaktif

---

## 1. Ringkasan Proyek

VR Haji Project adalah aplikasi simulasi perjalanan Haji dan Umrah yang dibuat agar pengguna dapat mempelajari urutan perjalanan, lokasi penting, aturan dasar, serta aktivitas jamaah melalui lingkungan 3D interaktif. Aplikasi menyatukan antarmuka web, dunia 3D, karakter jamaah, sistem rute, misi pembelajaran, kamera FPS/Drone, dan panel lokasi.

Pengguna dapat memulai perjalanan dari rumah, menuju bandara Indonesia, menaiki pesawat, tiba di Arab Saudi, kemudian mengikuti rangkaian lokasi dan aktivitas Haji atau Umrah. Mode simulasi dirancang sebagai media pembelajaran pendamping, bukan pengganti bimbingan ibadah dari pembimbing resmi.

## 2. Latar Belakang

Materi perjalanan Haji dan Umrah sering dipelajari melalui teks, gambar, atau video. Media tersebut belum selalu memberikan gambaran ruang, arah, jarak, dan urutan kegiatan secara langsung. Proyek ini dibuat untuk menghadirkan pengalaman belajar yang lebih visual dan interaktif melalui teknologi WebGL dan WebXR.

## 3. Tujuan

1. Menyediakan simulasi digital perjalanan Haji dan Umrah.
2. Memvisualisasikan lokasi penting seperti Masjidil Haram, Kaaba, Mas'a, Mina, Arafah, Muzdalifah, miqat, bandara, dan pesawat.
3. Membantu pengguna memahami urutan rute melalui misi dan panel lokasi.
4. Menampilkan lingkungan rumah, perjalanan Jakarta, bandara, dan Makkah secara berkesinambungan.
5. Menyediakan kontrol desktop serta dukungan WebXR/VR.
6. Menjadi dasar pengembangan media pembelajaran 3D yang dapat diperluas.

## 4. Ruang Lingkup Fitur

- Pilihan perjalanan Haji dan Umrah.
- Rute lokasi dan misi pembelajaran.
- Dunia 3D dengan kamera FPS dan Drone.
- Rotasi kamera menggunakan mouse/drag dan zoom menggunakan scroll.
- Gerak karakter mengikuti arah pandang kamera.
- Karakter jamaah, kerumunan, tawaf, sa'i, shalat, dan aktivitas terminal.
- Rumah dua lantai dengan carport, mobil, tangga, balkon, dan interior.
- Pemandangan perjalanan kendaraan menuju bandara dengan nuansa kota Jakarta.
- Bandara dengan karakter yang bergerak ke berbagai area terminal.
- Panel sidebar lokasi: lokasi aktif, lokasi yang telah dikunjungi, dan lokasi berikutnya.
- Minimap yang berada di sisi kanan halaman.
- Dukungan masuk ke mode VR melalui WebXR jika perangkat tersedia.
- Penyimpanan progres lokasi di `localStorage`.
- Validasi otomatis melalui skrip pengujian Node.js dan browser.

## 5. Alur Pengguna

### 5.1 Alur Umum

1. Pengguna membuka aplikasi.
2. Pengguna memilih jenis perjalanan Haji atau Umrah.
3. Sistem memuat lokasi awal dan dunia 3D.
4. Pengguna memilih mode kamera FPS atau Drone.
5. Pengguna bergerak dan mengamati lingkungan.
6. Pengguna menyelesaikan misi pada lokasi aktif.
7. Sidebar memperbarui lokasi yang telah dikunjungi dan lokasi berikutnya.
8. Pengguna melanjutkan hingga seluruh rute selesai.

### 5.2 Rute Haji

Rute Haji mencakup tahapan perjalanan dari rumah dan keberangkatan, bandara, pesawat, kedatangan, miqat, Masjidil Haram, tawaf, sa'i, Mina, Arafah, Muzdalifah, lontar jumrah, tahallul, dan kepulangan. Detail urutan dapat disesuaikan pada konfigurasi misi di `route-missions.js`.

### 5.3 Rute Umrah

Rute Umrah menekankan ihram dan miqat, kedatangan di Makkah, tawaf, sa'i antara Safa dan Marwah, tahallul, serta kepulangan. Rute ini menggunakan sistem misi yang sama tetapi memiliki daftar tahapan yang berbeda.

## 6. Arsitektur Sistem

Aplikasi menggunakan arsitektur client-side. Blazor WebAssembly menangani struktur aplikasi dan komponen antarmuka, sedangkan JavaScript mengelola engine 3D, scene, kamera, karakter, input, serta interaksi WebXR.

```text
Browser
  ├── Blazor WebAssembly (.NET)
  │     ├── App.razor
  │     ├── MainLayout.razor
  │     └── SceneView.razor
  └── JavaScript 3D layer
        ├── main.js
        ├── engine.js
        ├── journey-world.js
        ├── route-missions.js
        ├── camera-view.js
        ├── location-sidebar.js
        ├── builders.js
        └── modules karakter/scene lainnya
```

Komunikasi antara komponen Blazor dan layer JavaScript dilakukan melalui JavaScript interop. Canvas WebGL menjadi tempat rendering dunia 3D, sementara elemen HTML/CSS digunakan untuk menu, sidebar, status misi, tombol, dan pesan kesalahan.

## 7. Tech Stack

| Bagian | Teknologi | Kegunaan |
|---|---|---|
| Framework aplikasi | ASP.NET Core Blazor WebAssembly 9 | Menjalankan UI client-side berbasis .NET |
| Runtime | .NET 9 / SDK 9.0.304 | Build dan eksekusi proyek |
| Bahasa utama UI | C# dan Razor | Komponen, layout, routing, dan interop |
| Bahasa engine | JavaScript ES Modules | Logika dunia 3D, input, kamera, karakter |
| Rendering 3D | Three.js 0.185.x | Scene, camera, lighting, geometry, material, renderer |
| API grafis | WebGL melalui Three.js | Rendering 3D di browser |
| Immersive mode | WebXR | Dukungan headset VR dan controller |
| Styling | CSS dan HTML | Layout, sidebar, tombol, menu, overlay |
| Penyimpanan | `localStorage` browser | Menyimpan progres lokasi dan preferensi ringan |
| Testing | Node.js, jsdom, Playwright | Pengujian unit, DOM, dan browser |
| Dependency manager | npm | Instalasi dependency dan script pengujian |
| Build tooling .NET | MSBuild / dotnet CLI | Restore, build, dan menjalankan aplikasi |
| Kontrol versi | Git | Riwayat perubahan kode dan kolaborasi |

### Dependensi npm

- `three`: engine dan objek 3D.
- `@types/three`: tipe TypeScript untuk ekosistem Three.js.
- `jsdom`: simulasi DOM untuk pengujian.
- `playwright-core`: otomasi dan pengujian browser.

### Dependensi NuGet

- `Microsoft.AspNetCore.Components.WebAssembly` versi 9.0.0.
- `Microsoft.AspNetCore.Components.WebAssembly.DevServer` versi 9.0.0.

## 8. Struktur Folder Utama

```text
VRhajiproject/
├── src/
│   ├── VRHaji.Web/
│   │   ├── Components/
│   │   ├── Layout/
│   │   ├── Pages/
│   │   ├── Properties/launchSettings.json
│   │   ├── wwwroot/
│   │   │   ├── css/app.css
│   │   │   ├── js/vr/
│   │   │   └── index.html
│   │   └── VRHaji.Web.csproj
│   └── ...
├── tests/
├── assets/
├── docs/
│   ├── PKL_REPORT/README.md
│   └── dokumentasi teknis lainnya
├── tools/
├── package.json
├── global.json
└── VRHaji.sln
```

## 9. Modul dan Tanggung Jawab File

| Modul | Tanggung jawab |
|---|---|
| `main.js` | Inisialisasi aplikasi, engine, input, lifecycle, dan interaksi UI |
| `engine.js` | Renderer, scene, camera, lighting, materials, loop animasi, dan crowd |
| `journey-world.js` | Memuat lokasi, objek, kendaraan, karakter, dan perpindahan scene |
| `route-missions.js` | Konfigurasi rute Haji/Umrah dan daftar misi |
| `journey-missions.js` | Context misi, validasi tujuan, progres, dan status selesai |
| `builders.js` | Factory objek lingkungan 3D seperti Kaaba, bandara, Mina, dan pesawat |
| `camera-view.js` | Mode FPS/Drone, orbit, rotasi, zoom, dan arah gerak |
| `location-sidebar.js` | Sidebar lokasi aktif, kunjungan, lokasi berikutnya, dan minimap |
| `reference-home.js` | Rumah dua lantai, interior, tangga, carport, dan kendaraan |
| `indonesia-scenery.js` | Pemandangan Jakarta dan lingkungan perumahan |
| `airport-wander.js` | Pergerakan acak/terarah karakter di area terminal |
| `makkah-crowd.js` | Populasi jamaah dan distribusi kerumunan Makkah |
| `realistic-travellers.js` | Karakter jamaah dan perilaku perjalanan |
| `standing-prayer.js` | Kelompok shalat di area Hijr Ismail dan Maqam Ibrahim |
| `player-avatar.js` | Avatar pengguna dan rotasi badan mengikuti arah gerak |
| `departure-scenes.js` | Scene rumah, kendaraan, perjalanan, dan keberangkatan |

## 10. Fitur Kamera dan Kontrol

### Mode FPS

Mode FPS memberikan pandangan dari posisi karakter. Mouse digunakan untuk melihat ke kiri, kanan, atas, dan bawah. Tombol gerak mengubah posisi avatar. Badan/avatar ikut berputar mengikuti arah gerak sehingga gerakan tidak hanya bergeser menyamping.

### Mode Drone

Mode Drone memberikan pandangan kamera yang lebih bebas dari posisi melayang. Kamera dapat diputar seperti kepala, didekatkan atau dijauhkan dengan scroll, dan digerakkan mengikuti arah pandang. Saat bergerak ke kiri, kanan, depan, atau belakang, arah perpindahan mengikuti orientasi kamera.

### Kontrol Desktop

- `W/A/S/D` atau tombol arah: bergerak.
- Drag mouse: rotasi kamera.
- Scroll mouse: zoom dekat/jauh pada mode Drone.
- Klik objek: interaksi objek yang mendukung.
- Tombol mode kamera: memilih FPS atau Drone.

Panduan instruksi yang sebelumnya tampil di layar simulasi telah dihilangkan agar area simulasi lebih bersih.

## 11. Lingkungan 3D dan Karakter

Lingkungan dibangun menggunakan primitive Three.js seperti box, cylinder, plane, sphere, group, material, texture, lighting, dan fog. Pendekatan builder membuat objek dapat dipakai ulang di banyak lokasi.

Karakter dibagi menjadi beberapa kelompok: jamaah berjalan, jamaah tawaf, jamaah sa'i, jamaah di area plaza, karakter bandara, kelompok shalat, pengemudi, dan avatar pengguna. Sistem crowd menggunakan pooling dan perilaku sederhana agar jumlah karakter besar tetap dapat dirender di browser.

Pada area Makkah, distribusi jamaah diperbanyak untuk membuat suasana lebih hidup. Selain kerumunan tawaf dan plaza, terdapat kelompok yang melakukan shalat di depan Hijr Ismail dan di area Maqam Ibrahim.

## 12. Sistem Navigasi dan Sidebar

Sidebar menampilkan:

- lokasi aktif saat ini;
- lokasi yang sudah dikunjungi;
- lokasi berikutnya;
- indikator progres perjalanan;
- minimap pada sisi kanan.

Data kunjungan disimpan melalui `localStorage` dengan key aplikasi sehingga dapat dipulihkan ketika halaman dimuat kembali. Sistem sidebar menerima pembaruan dari `JourneyWorld` dan `JourneyMissions` ketika lokasi atau misi berubah.

## 13. Pengujian

Pengujian tersedia pada folder `tests/`. Jenis pengujian meliputi:

- pengujian rute dan mekanik perjalanan;
- pengujian menu, karakter, wardrobe, dan crowd;
- pengujian scene rumah dan pemandangan Indonesia;
- pengujian sidebar lokasi dan minimap;
- pengujian gerak kendaraan serta keberangkatan;
- pengujian browser menggunakan Playwright;
- pengujian DOM menggunakan jsdom.

Perintah yang tersedia:

```powershell
npm install
npm test
npm run test:menu
npm run test:characters
npm run test:wardrobe
dotnet build src/VRHaji.Web --no-restore
```

## 14. Cara Menjalankan Aplikasi

Pastikan .NET 9 SDK dan Node.js sudah terpasang.

```powershell
cd C:\VRhajiproject
npm install
dotnet restore src\VRHaji.Web\VRHaji.Web.csproj
dotnet run --project src\VRHaji.Web\VRHaji.Web.csproj
```

Alamat development ditentukan di `src/VRHaji.Web/Properties/launchSettings.json`. Jika port default sedang digunakan, hentikan proses yang memakai port tersebut atau jalankan dengan port lain untuk sementara.

## 15. Penanganan Error Port

Pesan `address already in use` berarti port telah dipakai proses lain. Di Windows, port yang digunakan dapat diperiksa dengan:

```powershell
netstat -ano | findstr :5101
tasklist /FI "PID eq NOMOR_PID"
```

Setelah memastikan proses tersebut adalah server lama milik proyek, proses dapat dihentikan dari Task Manager atau dengan:

```powershell
Stop-Process -Id NOMOR_PID
```

Hanya hentikan PID yang sudah diverifikasi agar tidak menghentikan aplikasi lain.

## 16. Optimasi dan Pertimbangan Teknis

- Menggunakan geometry dan material yang dapat dipakai ulang.
- Mengelompokkan objek dengan `THREE.Group`.
- Menggunakan pooling untuk karakter berjumlah banyak.
- Membatasi pembaruan animasi yang tidak perlu.
- Memisahkan builder scene dari logic misi.
- Menyediakan fallback ketika WebGL/WebXR tidak tersedia.
- Menggunakan overlay HTML untuk informasi sehingga UI tidak perlu dirender sebagai objek 3D.
- Menyediakan mode FPS dan Drone sesuai kebutuhan pengguna.

## 17. Keterbatasan Sistem

1. Kualitas rendering bergantung pada kemampuan GPU dan browser.
2. WebXR memerlukan browser, perangkat, dan izin yang mendukung.
3. Beberapa asset masih berupa bentuk geometris/prototipe.
4. Perilaku crowd merupakan simulasi sederhana, bukan AI kerumunan penuh.
5. Aplikasi belum dimaksudkan sebagai sumber hukum ibadah; materi harus divalidasi dengan pembimbing Haji/Umrah.
6. Penggunaan port development hanya berlaku pada komputer lokal.

## 18. Rencana Pengembangan

- Menambahkan sistem akun dan penyimpanan progres berbasis server.
- Menambahkan voice guidance dan subtitle multibahasa.
- Menambah asset 3D dengan tekstur dan optimasi LOD.
- Menambahkan multiplayer atau mode instruktur.
- Menambahkan evaluasi/kuis setelah setiap misi.
- Menambah analytics penggunaan secara anonim.
- Mengoptimalkan WebXR untuk perangkat mobile dan headset tertentu.
- Menyediakan panel admin untuk mengubah rute, misi, dan konten edukasi.

## 19. Kesimpulan

VR Haji Project merupakan aplikasi pembelajaran interaktif yang menggabungkan Blazor WebAssembly, Three.js, WebGL, dan WebXR. Sistem ini menyediakan perjalanan Haji dan Umrah berbasis misi, lingkungan 3D yang dapat dijelajahi, karakter jamaah, kamera FPS/Drone, sidebar navigasi, serta dukungan pengujian otomatis. Struktur modular membuat proyek mudah dikembangkan untuk penambahan lokasi, aktivitas, karakter, dan materi edukasi berikutnya.

## 20. Referensi Internal Proyek

- `src/VRHaji.Web/VRHaji.Web.csproj`
- `src/VRHaji.Web/Properties/launchSettings.json`
- `src/VRHaji.Web/wwwroot/js/vr/engine.js`
- `src/VRHaji.Web/wwwroot/js/vr/journey-world.js`
- `src/VRHaji.Web/wwwroot/js/vr/route-missions.js`
- `src/VRHaji.Web/wwwroot/js/vr/journey-missions.js`
- `src/VRHaji.Web/wwwroot/js/vr/camera-view.js`
- `src/VRHaji.Web/wwwroot/js/vr/location-sidebar.js`
- `src/VRHaji.Web/wwwroot/js/vr/builders.js`
- `src/VRHaji.Web/wwwroot/js/vr/reference-home.js`
- `src/VRHaji.Web/wwwroot/js/vr/indonesia-scenery.js`
- `tests/`
- `package.json`
- `global.json`

