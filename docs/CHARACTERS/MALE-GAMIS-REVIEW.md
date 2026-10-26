# Revisi bertahap: gamis pria

Lingkup tahap ini hanya **gamis pria**, sesuai instruksi untuk mengerjakan satu
pakaian terlebih dahulu. Acuan visual: `Gamis cowo.png`; standar pengerjaan:
`CHARACTERS.md`. Ihram dan seluruh pakaian wanita tetap pada versi sebelumnya.

## Analisis sebelum pembuatan

- Referensi memperlihatkan kerah tegak pendek, plaket depan dengan kancing kecil,
  saku dada kiri, lengan panjang dengan manset, bahu membulat, dan potongan hampir
  lurus hingga mata kaki. Lebar bawah tidak menyerupai rok mengembang.
- Gamis sebelumnya memisahkan badan dan lengan menjadi permukaan bertumpuk.
  Sambungan bahu/ketiak dan tarikan kain di sekitar leher perlu dibangun ulang.
- Scene Blender yang terbuka awalnya hanya berisi Cube, Camera, dan Light.
  Karakter proyek dimuat dalam scene pemeriksaan terpisah, tanpa menghapus scene
  tersebut. Sumber fitting adalah tubuh dan rig Rocketbox pria yang sudah dipakai
  aplikasi, bukan karakter pengganti atau perkiraan ukuran manusia.
- Tubuh sumber diperiksa dalam koordinat X kiri/kanan, -Y depan, Z atas, skala
  meter. Tingginya sekitar 1,80 m. Posisi bahu, siku, pergelangan, leher, serta
  penampang torso diambil dari mesh/rig sumber.

## Konstruksi

`tools/refine_male_gamis.py` memotong salinan permukaan anatomi pada leher,
pergelangan, dan pinggang, menyatukan duplikasi sambungan UV, lalu menambahkan
kelonggaran pakaian. Batas pinggang dilanjutkan menjadi panel bawah yang menyatu.
Dengan demikian bahu, ketiak, lengan, dan badan memiliki sambungan geometris.
Panel bawah diberi kelonggaran pinggul serta lipatan besar dengan jarak tidak
seragam. Kerah, plaket, kancing, saku, manset, dan kelim tetap dapat diedit terpisah.

Simulasi kain offline menggunakan tubuh sumber sebagai collider. Hasilnya dibakar
menjadi mesh, kemudian diberi bobot ke rig asli. Material katun menggunakan warna
putih hangat, roughness tinggi, sheen ringan, serta normal map tenunan yang dapat
diekspor ke GLB. Ketebalan kain sekitar 1,2 mm; detail lipatan tepi memiliki
ketebalannya sendiri. Koleksi pakaian bernama `HAJJ_MALE_GAMIS`.

## Berkas dan reproduksi

- Cadangan sebelum perubahan: `artifacts/male-gamis/before/`.
- Proyek editable: `artifacts/male-gamis/male-gamis.blend`.
- GLB hasil pemeriksaan: `artifacts/male-gamis/man-gamis.glb` dan `man.glb`.
- Laporan simulasi: `artifacts/male-gamis/cloth-report.json`.
- Hasil pemeriksaan browser: `artifacts/male-gamis/runtime-review.json`.
- Tampak depan, samping, belakang, tiga perempat, detail bahu/dada dan gerakan:
  PNG di `artifacts/male-gamis/`.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/refine_male_gamis.py
node tools/review-male-gamis.cjs
```

Script mengambil baseline `artifacts/pilgrim-man.blend` pada eksekusi pertama,
kemudian menggunakan cadangannya agar hasil bisa direproduksi. Baseline dibuat
oleh pipeline `build_pilgrim_wardrobe.py` yang sudah ada. Hasil baru ditulis ke
folder pemeriksaan terlebih dahulu. Setelah pemeriksaan, GLB yang lolos dipasang
ke `wwwroot/assets/characters/man.glb` dan `outfits/man-gamis.glb`.

Kedua GLB hasil revisi sudah dipasang pada lokasi runtime tersebut. Versi cache
karakter pria dinaikkan agar browser mengambil aset baru. File gamis mandiri
sekitar 2,5 MB; paket pria lengkap sekitar 5,8 MB. Versi sebelum perubahan tetap
tersedia dalam folder cadangan.

## Pemeriksaan hasil

- Simulasi Blender benar-benar dijalankan selama 40 frame, lalu hasilnya dirapikan
  secara geometris untuk mempertahankan kelonggaran pola. Cache menyimpan
  signature tubuh, pola, pin, dan pengaturan solver; hasil final bukan simulasi
  mentah yang langsung diekspor.
- Mesh utama memiliki satu komponen tersambung, 8.882 titik pola, dan 8.734 bidang
  sebelum ketebalan. Tidak ada edge dengan lebih dari dua bidang. Bukaan yang
  disengaja berada di leher, pergelangan, dan kelim.
- Diagnostik jarak terhadap tubuh dalam pose dasar: jarak bertanda minimum sekitar
  3,3 mm pada sampel dekat tubuh; tidak ditemukan sampel lebih dari 3 mm di dalam
  tubuh. Ini pemeriksaan titik/normal terdekat, bukan bukti collision kontinu.
- Hasil diperiksa lewat Blender MCP dan tangkapan browser dari depan, samping,
  belakang, tiga perempat, detail bahu/dada, serta pose jalan dan lari.
- Pemeriksaan browser mencakup 27 fase diam/jalan/lari, bobot ternormalisasi,
  koordinat deformasi valid, dan deteksi tarikan edge berlebihan. Tiga klip asli
  dipertahankan; salinan klip akibat impor tubuh acuan dibuang.
- Betis asli dilengkapi pada mask gamis agar pergelangan tidak tampak terputus saat
  kaki terangkat. Bobot manset, kelim, saku, dan jahitan mengikuti permukaan gamis.
- `dotnet build --no-restore`, `npm run test:characters`, dan
  `npm run test:wardrobe` berhasil. Pemeriksaan wardrobe juga mengonfirmasi durasi
  klip tetap sesuai sumber dan seluruh enam GLB pakaian masih dapat dimuat.

Modifier yang digunakan: Subdivision Surface satu tingkat untuk resolusi pola
anatomi, Cloth/Collision untuk drape offline, Solidify untuk ketebalan, serta
Armature untuk animasi runtime. Pemulusan dan penyempurnaan lipatan dilakukan pada
mesh hasil drape. Modifier yang dibakar tetap dapat direproduksi lewat script;
file Blender menyimpan mesh final editable dan modifier Armature.

Cloth simulation tidak berjalan realtime di aplikasi. Gerakan lari masih memakai
pendekatan skinning, sehingga kelim dapat meregang lebih besar daripada kain nyata
pada langkah lebar; garis kelim di bagian dalam dapat terlihat pada sudut lari
tertentu. Tidak ada jaminan bebas clipping untuk semua pose di luar
sampel yang diperiksa. Performa dan tampilan headset Quest perlu diuji di perangkat.
Rambut dan sandal bawaan tetap memiliki keterbatasan visual dari aset sebelumnya;
keduanya tidak menjadi bagian revisi gamis ini.
