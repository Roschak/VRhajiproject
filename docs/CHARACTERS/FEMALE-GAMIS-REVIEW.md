# Revisi gamis perempuan berdasarkan referensi

Panduan `CHARACTERS.md` dan `Gamis wanita.png` dibaca sebelum pemodelan. Versi
terbaru dibuat oleh `tools/tailor_female_gamis.py`, menggantikan hasil awal
`tools/refine_female_gamis.py` yang terlalu lurus, berlengan pendek, dan memakai
hijab yang menggumpal.

## Bentuk dan konstruksi

Pola bahu, lubang lengan, badan, dan rok tersambung sebagai satu permukaan.
Bentuk bawah melebar bertahap; lipatan panjang mempunyai jarak dan kedalaman
berbeda. Lengan memiliki kelonggaran, kerutan menjelang pergelangan, dan manset.
Pola disesuaikan dengan mesh dan tulang `source/rocketbox-woman.glb`.

Hijab pendamping gamis dibuat sebagai satu permukaan dari bukaan wajah sampai
bahu. Runtime memilih `Hijab_Gamis_*` hanya untuk gamis. Hijab tunik dan khimar
abaya lama tetap tersimpan. Lapisan putih di bawah rok memakai geometri tungkai
asli supaya pergelangan tidak tampak terputus pada langkah lebar.

Body mask, rig, dan pakaian lain dalam Blender dipertahankan; tidak ada pemotongan
kulit tambahan. Signature mesh/bobot dan hash outfit pembanding berada di
`artifacts/female-gamis-v2/preserved-meshes.json` dan `preserved-assets.json`.

## Simulasi dan material

Simulasi kain Blender benar-benar dijalankan: gamis 36 frame dan hijab 28 frame.
Perpindahan maksimum/rata-rata masing-masing 0,19678/0,04075 m dan
0,11766/0,01769 m. Hasilnya dirapikan untuk mempertahankan kelonggaran pola.
Hijab disimulasikan dalam pose berdiri terhadap badan dan pakaian; collider
kepala dirapikan agar tonjolan rambut sumber tidak tercetak pada kain.

Material putih gading memakai roughness 0,78, sheen 0,26, dan normal tenunan
halus. Tebal gamis 0,9 mm; hijab 0,7 mm. Subdivision, pengurangan mesh, dan
Solidify diterapkan sebelum ekspor; modifier Armature tetap ada.
Gamis akhir: 29.512 vertex dan 37.258 face. Hijab: 9.408 vertex dan 9.408 face.
Audit kedua shell menemukan nol edge non-manifold dan nol vertex lepas.

## Berkas dan pemeriksaan

- Proyek: `artifacts/female-gamis-v2/female-gamis-v2.blend`.
- Runtime: `wwwroot/assets/characters/woman.glb` dan `outfits/woman-gamis.glb`.
- Pratinjau: `artifacts/female-gamis-v2/woman-gamis-review/`.
- Rekaman simulasi/topologi: `cloth-report.json`, `mesh-audit.json`.

`node tools/review-male-gamis.cjs female-gamis-v2/woman-gamis` lulus: 27 pose
idle/walk/run, bobot ternormalisasi, deformasi finite, serta tiga klip asli.
Hasil GLB juga ditinjau dari empat arah melalui Blender MCP. Berkas Blender
cadangan dan laporan versi sebelumnya ada di `artifacts/female-gamis-v2/before`.

Animasi runtime memakai tulang, bukan simulasi kain setiap frame. Langkah lari
lebar masih dapat menghasilkan lipatan tajam dan pertemuan kain di bahu;
pemeriksaan ini tidak menjamin bebas collision sepanjang semua klip. Bentuk
mendekati referensi dengan proporsi karakter asli, bukan salinan identik foto.
Performa pada headset VR belum diukur.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/tailor_female_gamis.py
node tools/review-male-gamis.cjs female-gamis-v2/woman-gamis
```
