# Revisi kain ihram pria

## Analisis panduan dan referensi

Panduan: `CHARACTERS.md`. Referensi: `Ihram cowo.webp`, yang berhasil dibuka dari
folder proyek meskipun lampiran pesan pengguna menampilkan kesalahan path.

Referensi memperlihatkan dua lembar kain yang dapat dibedakan: izar dari pinggang
sampai dekat mata kaki, serta rida melintang dari bawah lengan kanan ke bahu kiri.
Tepi bawah rida menjuntai miring melewati pinggang. Bahu kanan terbuka pada gambar.
Tidak ada lengan jahitan, kerah, atau ikat pinggang yang mengubah rida menjadi baju.

Aset sebelumnya mempunyai izar sampai sekitar betis dan rida yang tampak tertahan
di pinggang. Revisi memprioritaskan panjang izar, tumpang tindih lembar kain,
dukungan rida pada bahu, dan jatuh kain bagian dada/punggung. Varian kedua dengan
kedua bahu tertutup dipertahankan karena dipakai alur aplikasi yang sudah ada.

Tubuh dan rig acuan berasal dari `source/rocketbox-man.glb`, model yang sama dengan
karakter aplikasi. Bagian torso, pinggang, serta pose bahu diperiksa. Pola dibentuk
dalam pose idle dengan lengan turun, kemudian ditransformasikan kembali ke pose
ikatan rig setelah drape. Rotasi root pada klip idle diperhitungkan agar acuan tubuh
tidak tertukar antara arah depan dan samping.

## Lingkup dan alur pengerjaan

`tools/refine_male_ihram.py` membuka salinan proyek gamis terbaru dan mengganti
hanya mesh ihram. Sebelum perubahan dibuat cadangan di `artifacts/male-ihram/before`.
Signature geometri dan bobot gamis dibandingkan sebelum/sesudah; berkas gamis
mandiri dan pakaian wanita juga direkam hash-nya.

Izar menggunakan satu panel terbuka dengan bagian tepi atas terlipat dan
tumpang tindih terpisah. Rida menggunakan panel terbuka untuk masing-masing
susunan bahu. Tepi kain tidak disambung menjadi tabung tertutup. Material katun
putih memiliki roughness tinggi, sheen ringan, normal map tenunan, serta selvedge
yang sedikit berbeda. Kain memiliki ketebalan 1,4 mm.

Koleksi: `HAJJ_MALE_IHRAM_IZAR` dan `HAJJ_MALE_IHRAM_RIDA`. File sumber gamis dan
scene Blender yang sudah terbuka dipertahankan.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/refine_male_ihram.py
node tools/review-male-gamis.cjs male-ihram/man-ihram
node tools/review-male-gamis.cjs male-ihram/man-ihram-covered
```

Script pemeriksaan browser yang dipakai bersama menerima path aset sebagai
argumen. Tanpa argumen, perilakunya tetap memeriksa gamis sebelumnya.

## Hasil final dan simulasi

Hasil yang diperiksa sudah dipasang ke `wwwroot/assets/characters/man.glb`,
`outfits/man-ihram.glb`, dan `outfits/man-ihram-covered.glb`. Ukuran masing-masing
4.180.000, 2.238.708, dan 2.218.816 byte. Sumber editable:
[`male-ihram.blend`](../../artifacts/male-ihram/male-ihram.blend).

Fitting memakai permukaan tubuh Rocketbox asli dalam pose idle, termasuk posisi
bahu dan ketiak. Cloth simulation Blender benar-benar dijalankan selama 32 frame
untuk izar dan masing-masing rida, dengan collision terhadap tubuh. Hasil drape
dicampur dengan pola awal, dihaluskan, dan diperbaiki jarak lapisannya sebelum
diikat kembali ke skeleton. Ini bukan simulasi kain real-time di aplikasi.

| Panel sebelum ketebalan | Vertex | Face | Tepi terbuka | Perpindahan rata-rata simulasi |
| --- | ---: | ---: | ---: | ---: |
| Izar | 4.365 | 4.224 | 280 | 41,35 mm |
| Rida bahu kanan terbuka | 3.589 | 3.456 | 264 | 23,48 mm |
| Rida kedua bahu tertutup | 3.589 | 3.456 | 264 | 34,22 mm |

Modifier Cloth dan Collision digunakan pada proses drape sementara. Solidify
1,4 mm diterapkan ke geometri; Armature dipertahankan untuk animasi. Material
`Ihram_White_Cotton_Terry` dan `Ihram_Woven_Selvedge` menggunakan roughness 0,94,
sheen 0,25, dan normal map tenunan. Tidak mengandalkan Subdivision Surface.

Mask kulit dibedakan untuk kedua susunan rida agar bagian tubuh yang tertutup
tidak menembus kain saat animasi. Bahu kanan hanya muncul pada varian terbuka.
UV/material kulit asli dipakai kembali pada torso dan lengan yang terlihat;
model sumber dan rig asli dipertahankan. Cache aset pria diperbarui agar aplikasi
memuat hasil baru.

## Pemeriksaan

- Tampak depan, samping, belakang, dan tiga perempat diperiksa pada kedua varian
  di Blender MCP. Screenshot browser mencakup close-up bahu, dada, pinggang,
  serta gerakan berjalan dan kedua fase langkah berlari: 15 gambar per varian.
- Pemeriksaan setiap varian melewati 27 sampel pose dari klip idle/walk/run,
  normalisasi bobot, posisi hasil deformasi yang finite, serta batas regangan
  edge. Durasi klip sumber dipertahankan; mesh sudah terikat ke rig dan bisa
  memakai ketiga animasi tersebut.
- `npm run test:characters` lulus: pilihan pakaian, warna kulit, animasi,
  perpindahan ritual, serta visibilitas mask kulit kedua susunan ihram.
- `npm run test:wardrobe` lulus: keenam GLB pakaian dapat dimuat, bobot rig valid,
  dan animasi idle/walk/run tidak menghasilkan koordinat invalid.
- Pratinjau menu aplikasi diperiksa melalui `tools/review-wardrobe.cjs`.
- SHA-256 gamis mandiri dan seluruh aset perempuan tidak berubah. Signature
  vertex/bobot gamis di proyek Blender juga identik sebelum dan sesudah revisi.

Tes aplikasi dijalankan dengan `BASE_URL=http://127.0.0.1:5117`.
Bukti numerik berada di `artifacts/male-ihram/cloth-report.json`,
`mesh-audit.json`, `preserved-assets.json`, `preserved-gamis.json`, dan
`man-ihram[-covered]-review/runtime-review.json`.

Pratinjau:
[depan](../../artifacts/male-ihram/man-ihram-review/front.png),
[belakang](../../artifacts/male-ihram/man-ihram-review/back.png),
[bahu](../../artifacts/male-ihram/man-ihram-review/shoulder.png),
[kedua bahu tertutup](../../artifacts/male-ihram/man-ihram-covered-review/front.png),
[menu aplikasi](../../artifacts/wardrobe-man-ihram-Diam.png).

## Batasan yang masih ada

Pada pose diam, siluet dan pertemuan tubuh/kain sudah diperiksa secara visual.
Audit titik terhadap normal permukaan tubuh tidak menemukan sampel masuk lebih
dari 3 mm, tetapi minimum rida terbuka masih sekitar -2,97 mm. Pemeriksaan ini
bukan bukti bebas interseksi seluruh triangle atau seluruh waktu animasi.
Lipatan dan pertemuan tepi kain masih dapat memperlihatkan jepitan/interseksi
kecil, khususnya saat lari.

Gerakan aplikasi memakai skinning skeleton, sehingga ayunan lengan/kaki yang
lebar masih menghasilkan kain lebih kaku, lipatan tajam, dan bagian punggung
mengembang dibandingkan kain nyata. Belum ada simulasi kain kontinu maupun
pengujian performa pada headset VR. Aset siap dipakai dengan rig dan klip yang
ada, tetapi realisme gerak lari belum setara simulasi kain penuh.
