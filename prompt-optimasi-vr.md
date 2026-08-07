# Prompt: Optimasi Pipeline Rendering VR Three.js untuk Semua Perangkat VR (WebXR)

Gunakan prompt di bawah ini apa adanya (single-shot). Ditujukan untuk diberikan ke AI coding assistant / LLM lain agar langsung menghasilkan implementasi lengkap tanpa perlu iterasi ulang.

---

## PROMPT

Optimalkan pipeline rendering VR Three.js kami agar berjalan stabil pada refresh rate native perangkat (misalnya 72/90/120 Hz) tanpa lag maupun frame drop, dan **harus kompatibel dengan semua perangkat VR berbasis WebXR** — bukan hanya satu headset tertentu (Meta Quest 2/3/Pro, Pico, HTC Vive, Valve Index, Windows Mixed Reality, dsb). Gunakan pendekatan optimasi bergaya "Minecraft" (chunk-based) dikombinasikan dengan Foveated Rendering yang adaptif. Implementasikan sebagai satu modul JavaScript (ES module) yang bisa langsung di-`import` dan diintegrasikan ke script Three.js client-side kami yang sudah ada, tanpa mengubah struktur scene yang ada secara drastis. Sertakan juga contoh file integrasi terpisah yang menunjukkan cara pakainya end-to-end.

### 0. Kompatibilitas lintas perangkat VR (WAJIB, prioritas utama)
- Jangan hardcode asumsi spesifik satu headset (misalnya resolusi panel, refresh rate, atau nama device tertentu). Semua nilai yang bergantung pada perangkat harus dideteksi secara dinamis lewat WebXR API saat runtime, contoh:
  - Baca refresh rate aktual lewat `renderer.xr.getSession().frameRate` bila tersedia (fallback ke asumsi aman seperti 72 Hz jika API tidak mendukung).
  - Gunakan `renderer.xr.getReferenceSpace()` dan event standar WebXR (`sessionstart`, `sessionend`, `inputsourceschange`) yang berlaku sama di semua browser/headset yang mendukung WebXR, bukan API proprietary khusus vendor.
- Untuk fitur yang tidak universal (misalnya `setFoveation`, yang saat ini didukung di beberapa runtime WebXR tapi tidak semua), WAJIB gunakan feature-detection eksplisit sebelum memanggilnya, dan modul harus tetap berjalan normal (degrade dengan aman, tanpa error) di perangkat yang tidak mendukung fitur tersebut.
- Sediakan satu titik konfigurasi (objek `CONFIG` atau sejenisnya) berisi nilai default yang aman secara umum untuk seluruh kelas perangkat VR (mobile standalone maupun PC-tethered), dan beri komentar bagian mana yang sebaiknya di-tuning per proyek/perangkat target jika dibutuhkan.
- Uji logic penting (culling, instancing, render loop) tidak boleh bergantung pada kemampuan GPU kelas tertentu saja — pastikan tetap berjalan (meski dengan kualitas visual lebih rendah) di GPU mobile standalone yang lebih lemah, dan otomatis bisa memanfaatkan headroom lebih di GPU PC-tethered yang lebih kuat, tanpa perlu mengubah kode.

Spesifikasi wajib:

### 1. Distance-based culling untuk chunk/objek
- Hitung jarak tiap chunk atau objek dari `camera.position` secara berkala (throttled — jangan tiap frame, gunakan interval waktu, misalnya setiap 200–300ms) agar tidak membebani CPU.
- Objek/chunk yang melewati radius ambang batas tertentu (jadikan konstanta yang mudah di-tuning) harus benar-benar dilepas dari scene graph via `scene.remove()` **dan** GPU memory-nya dibebaskan penuh lewat `geometry.dispose()`, `material.dispose()`, dan dispose semua texture yang menempel di material tersebut. Jangan hanya menyembunyikan dengan `visible = false`.
- Saat kamera kembali mendekat, chunk harus dibangun ulang (lazy factory pattern), bukan disimpan permanen di memori.

### 2. Occlusion culling
- Objek yang sepenuhnya tertutup oleh mesh lain (dinding, lantai, geometri statis lain) tidak boleh diteruskan ke draw call renderer.
- Gunakan dua lapis pengujian secara berurutan agar efisien di GPU mobile:
  1. Frustum culling (murah, dijalankan lebih dulu) — buang objek yang berada di luar frustum kamera.
  2. Raycast occlusion test (hanya untuk objek yang lolos uji frustum) — tembak ray dari kamera ke bounding sphere objek, tandai `visible = false` bila ada occluder solid statis yang menghalangi.
- Sediakan mekanisme untuk mendaftarkan daftar occluder (dinding/lantai) secara eksplisit dari luar modul.

### 3. Batching draw call dengan InstancedMesh
- Kelompokkan objek/block statis berulang (geometry & material identik) ke dalam `THREE.InstancedMesh` per tipe block, bukan mesh individual terpisah, agar drastis mengurangi jumlah draw call.
- Gunakan `StaticDrawUsage` untuk instance yang tidak berpindah posisi.
- Sertakan fungsi untuk menambah instance baru dan menghapus instance secara dinamis (removal harus O(1), misalnya dengan teknik swap-and-pop, bukan menggeser seluruh array).
- Batasi jumlah maksimum instance per pool dengan konstanta yang jelas agar tidak melebihi kapasitas VRAM perangkat kelas paling rendah yang ditarget (mobile standalone), sambil tetap bisa dinaikkan lewat konfigurasi untuk perangkat PC-tethered yang lebih kuat.

### 4. Foveated Rendering
- Aktifkan **fixed foveated rendering** bawaan WebXR/Three.js melalui `renderer.xr.setFoveation(value)`, dengan `value` berupa angka 0–1 (0 = tanpa foveation, 1 = foveation maksimum) yang dapat dikonfigurasi lewat konstanta.
- Terapkan setelah sesi XR aktif (setelah event `sessionstart` pada `renderer.xr`), karena `setFoveation` baru efektif ketika XR session sudah berjalan.
- Sediakan fallback aman: jika device/browser tidak mendukung `setFoveation` (misalnya properti tidak ada atau memicu exception), kode harus tetap berjalan normal tanpa melempar error — bungkus pemanggilan dalam try/catch atau feature-detection eksplisit.
- Jelaskan singkat di komentar kode: foveated rendering menurunkan resolusi render di tepi bidang pandang (peripheral) sambil mempertahankan resolusi penuh di titik fokus tengah, sehingga menghemat beban GPU tanpa terasa oleh pengguna karena keterbatasan penglihatan tepi mata manusia.

### 5. Render loop yang stabil di refresh rate native perangkat
- Gunakan `renderer.setAnimationLoop()` (bukan `requestAnimationFrame` manual di level window), karena ini adalah cara yang benar untuk WebXR di semua perangkat — loop disinkronkan langsung dengan device XR sehingga head-tracking VR tidak pernah terblokir oleh proses JavaScript lain di halaman, apa pun refresh rate atau vendor headset-nya.
- Urutan proses dalam satu frame harus jelas: update distance culling → update occlusion culling → render scene (render harus jadi langkah terakhir agar pose XR yang dipakai sefresh mungkin).
- Semua pekerjaan berat (culling, dispose, dsb.) harus tetap ringan/di-throttle agar tidak menyebabkan frame time melonjak dan memicu reprojection/judder di headset.

### Batasan kualitas output
- Kode harus siap pakai tanpa error saat langsung di-copy — pastikan seluruh import, sintaks, dan referensi API valid untuk Three.js versi terbaru yang stabil.
- Tidak boleh ada dependency eksternal selain `three` itu sendiri.
- Tambahkan komentar singkat di setiap bagian kode yang menjelaskan alasan teknis dari pendekatan yang dipakai (bukan sekadar apa yang dilakukan, tapi kenapa).
- Berikan juga daftar konstanta konfigurasi (radius culling, interval throttle, nilai foveation, kapasitas max instance) yang dikumpulkan di satu tempat agar mudah di-tuning tanpa menyentuh logic inti.

---

*Catatan: prompt ini dirancang untuk sekali jalan (single-shot) — cukup salin seluruh bagian PROMPT di atas dan tempel ke AI assistant pilihan Anda.*
