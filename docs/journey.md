# Perjalanan haji dalam satu sesi

Implementasi aktif adalah Blazor WebAssembly dan Three.js. Dokumen perencanaan lama yang menyebut Blazor Server atau perpindahan halaman per scene tidak menjelaskan arsitektur perjalanan yang sekarang.

- `SceneView.razor`: satu halaman `/simulasi/haji`, menerima `?tahap=1..12` untuk memulai atau mengulang latihan. Rute lama tetap kompatibel.
- `main.js`: satu runner berurutan; penyimpanan progres ditunggu sebelum Lanjutkan. Klik ganda tidak menjalankan runner baru. Kesalahan mempertahankan halaman dan menyediakan percobaan ulang.
- `journey-world.js`: lingkungan dengan koordinat tetap, dibangun sekali lalu dipakai ulang. Lingkungan Saudi disiapkan bersama, jalan menghubungkan area. Culling menyembunyikan area jauh; objek disimpan sampai sesi ditutup.
- `journey-missions.js`: urutan perjalanan, interaksi, tawaf, sai, pengambilan kerikil dan lontar berurutan. Semua langkah menunggu input atau narasi dan memeriksa pembatalan saat halaman ditutup.
- `journey-ui.js`: panel HTML untuk layar dan bidang 3D untuk raycast controller. Panel hanya mengunci gerak, bukan interaksi controller atau tracking kepala.
- `engine.js`: memiliki sesi WebXR; peralihan misi tidak memanggil `session.end()`. Fade memakai lapisan 3D yang terlihat di headset. Grip melakukan teleport pendek dengan pemeriksaan jalur dan collision.

## Menjalankan dan memeriksa

```powershell
dotnet build src/VRHaji.Web/VRHaji.Web.csproj
dotnet run --project src/VRHaji.Web/VRHaji.Web.csproj --no-build --no-launch-profile --urls http://localhost:5101
npm.cmd ci --ignore-scripts
npm.cmd test
```

SDK 9 diprioritaskan; `global.json` mengizinkan fallback ke SDK mayor berikutnya apabila SDK 9 tidak tersedia. Target aplikasi tetap net9.0.

Tes browser memakai Edge headless dari lokasi instalasi Windows. Set `BROWSER_PATH` bila memakai executable lain. Tes menuntaskan 12 tahap memakai kontrol lewati langkah latihan, memilih dialog melalui raycast dan handler trigger, memastikan tujuan misi dapat ditempati, URL dan renderer tidak berubah, memeriksa 12 catatan progres dan posisi kembali ke rumah. Tes juga menutup dan membuka ulang simulasi dari tahap tengah. Tes mekanik terpisah memeriksa arah tawaf, penolakan putaran dari teleport, tujuh perjalanan sai, urutan jumrah dan pembatalan. Ini menguji integrasi alur, bukan validasi fisik headset atau akurasi performa Quest.

## Pemeriksaan pada headset

Hasil pemeriksaan pengembangan: build berhasil dengan 0 error dan 0 warning; tes mekanik, keterhubungan jalur jalan antarlokasi, serta perjalanan browser 12 tahap dan resume berhasil. Pengujian fisik Oculus/Quest belum dilakukan.

Gunakan alamat HTTPS yang dapat diakses headset. Mulai simulasi, masuk VR sekali, lalu periksa:

1. Trigger memilih objek dan Lanjutkan tanpa keluar dari VR.
2. Grip berpindah ke lantai dekat; dinding atau area terputus tidak dapat dilewati.
3. Berjalan mengitari Kabah dihitung menggunakan posisi dunia, dengan arah yang benar. Teleport tidak menambah putaran.
4. Berjalan ke galeri sai tidak mengganti dunia. Kembali ke Haram menggunakan bangunan yang sama.
5. Transisi kendaraan dan perubahan siang/malam tidak menyisakan layar hitam.
6. Progres tersimpan setelah tiap tahap; membuka kembali menu dapat melanjutkan dari tahap yang tersedia.
7. Tahap terakhir berakhir di rumah dengan sesi VR tetap aktif. Keluar melalui kontrol sistem atau tombol Keluar VR.

Peta adalah kawasan pembelajaran dengan jarak dipadatkan. Rute melalui Madinah/Bir Ali dipilih agar miqat darat konsisten. Urutan ibadah mengacu pada Nusuk; materi tetap perlu ditinjau pembimbing manasik sebelum dipakai sebagai materi resmi.
