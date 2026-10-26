# Revisi abaya dan khimar perempuan

Panduan `CHARACTERS.md` dan foto lokal `Khimar wanita.png` dibaca sebelum
pemodelan. Foto menunjukkan abaya putih longgar dengan lengan mengerut pada
manset kecil, serta khimar yang menyambung dari bukaan wajah hingga pinggul.
Ujung depan dan belakang lebih panjang daripada sisi dekat lengan.

## Konstruksi dan fitting

Abaya dibuat ulang dengan pola bahu, lubang lengan, lengan, dan badan tersambung.
Bagian pinggang diberi kelonggaran dan rok lebih lurus daripada gamis. Kerutan
pergelangan, lipatan panjang, dan tepi bawah dibentuk pada mesh. Khimar lama
yang menggumpal diganti satu permukaan dari bukaan wajah sampai ujung bawah.
Bentuk mengikuti proporsi karakter asli; bukan salinan identik model dalam foto.

Fitting menggunakan geometri dan tulang `source/rocketbox-woman.glb` yang
sebenarnya. Collision memakai badan, abaya, dan proxy kepala halus agar tonjolan
rambut sumber tidak membentuk benjolan pada kain. Source body, body mask,
rig, gamis terbaru, tunik, dan pakaian pria dipertahankan. Signature pembanding
ada di `preserved-meshes.json`; hash outfit lain ada di `preserved-assets.json`.

Koleksi terpisah: `HAJJ_FEMALE_ABAYA` dan `HAJJ_FEMALE_KHIMAR`.
Abaya dan khimar tetap dapat diedit. Lapisan putih pada tungkai menggunakan
permukaan kaki sumber untuk menyambung tampilan pergelangan ketika rok terangkat.

## Simulasi, material, dan rig

Simulasi kain Blender benar-benar dijalankan: 36 frame untuk abaya dan 36 frame
untuk khimar, lalu hasilnya dirapikan dengan mempertahankan kelonggaran pola.
Log perpindahan dan cache tersedia dalam `cloth-report.json`. Setelah simulasi,
jarak terhadap permukaan luar abaya dikoreksi dan lipatan dihaluskan. Bobot sisi
khimar mengikuti lengan yang menyangga kain; transisi bobot dihaluskan.

Material putih gading memakai roughness 0,78 dan sheen 0,26; khimar memakai
roughness 0,74 dan sheen 0,30. Normal tenunan dibuat halus. Ketebalan abaya
0,9 mm dan khimar 0,7 mm. Subdivision dan Decimate diterapkan pada abaya;
Solidify diterapkan pada kedua kain. Modifier Armature tetap terhubung ke rig asli.

Audit mesh: abaya 29.506 vertex / 37.956 face, khimar 9.408 vertex / 9.408 face.
Kedua shell memiliki nol edge non-manifold dan nol vertex lepas; bobot dinormalisasi
dengan maksimum empat pengaruh tulang per vertex. Detail ada di `mesh-audit.json`.

## Hasil dan pemeriksaan

- Blender: `artifacts/female-abaya-khimar/female-abaya-khimar.blend`.
- Runtime gabungan: `src/VRHaji.Web/wwwroot/assets/characters/woman.glb`.
- Outfit: `src/VRHaji.Web/wwwroot/assets/characters/outfits/woman-abaya-khimar.glb`.
- Screenshot: `artifacts/female-abaya-khimar/woman-abaya-khimar-review/`.
- Cadangan sebelum perubahan: `artifacts/female-abaya-khimar/before/`.

Hasil ditinjau lewat Blender MCP dari depan, samping, belakang, perspektif,
serta dekat bahu dan pertemuan kain. Preview terbaru dibuka dalam scene terpisah
agar pekerjaan yang sudah terbuka tetap tersimpan.

Pemeriksaan browser meliputi 27 pose idle/walk/run, bobot ternormalisasi,
deformasi finite, tiga klip sumber, dan 15 screenshot. Pengujian integrasi
`tests/character-browser.cjs` memeriksa pergantian outfit serta pemilihan hijab
gamis, hijab tunik, dan khimar tanpa lapisan kepala yang rangkap.
`tests/wardrobe-assets.cjs` memeriksa enam outfit, durasi animasi asli, dan gerak rig.

Tembusan besar pada bahu yang terlihat pada iterasi awal telah dikoreksi.
Animasi runtime tetap memakai tulang, bukan collision kain setiap frame:
pada lari lebar masih terlihat lipatan tajam di rok dan pertemuan tipis kain
di dekat siku/tepi khimar. Pemeriksaan ini tidak menjamin seluruh frame bebas
intersection. Mesh siap untuk animasi rig yang ada; gerak baru perlu ditinjau
kembali. Performa headset VR belum diukur.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/tailor_female_abaya.py
node tools/review-male-gamis.cjs female-abaya-khimar/woman-abaya-khimar
```
