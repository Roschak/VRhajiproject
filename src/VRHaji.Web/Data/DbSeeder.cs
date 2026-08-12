using System.Text.Json;
using VRHaji.Web.Models;

namespace VRHaji.Web.Data;

/// <summary>Static data store: 12 scene (termasuk Wukuf Arafah), checkpoint, dan konten edukasi sesuai dokumen proyek.</summary>
public static class DbSeeder
{
    private static string J(object o) => JsonSerializer.Serialize(o);

    public static List<SceneData> Scenes { get; } = [];
    public static List<CheckpointData> Checkpoints { get; } = [];

    static DbSeeder()
    {
        List<SceneData> scenes =
        [
            new()
            {
                Urutan = 1, Nama = "Berangkat dari Indonesia",
                Lokasi = "Bandara Internasional, Indonesia", Waktu = "Siang hari (10:00 WIB)",
                Deskripsi = "Simulasi proses keberangkatan jamaah dari bandara Indonesia: lobby, check-in, pemeriksaan dokumen, boarding, hingga di dalam pesawat.",
                ConfigJson = J(new { durasi = "15-20 menit", objective = "Selesaikan proses check-in, imigrasi, dan boarding" }),
                EdukasiJson = J(new EdukasiContent(
                    "Persiapan Keberangkatan",
                    ["Persiapan fisik: istirahat cukup, makan teratur, olahraga ringan.",
                     "Persiapan mental: niat ikhlas, sabar, dan tawakal kepada Allah.",
                     "Dokumen wajib: paspor, visa, tiket, dan kartu identitas — simpan di tas tangan.",
                     "Barang bawaan: pakaian ihram, perlengkapan ibadah, dan obat pribadi.",
                     "Datang ke bandara 3-4 jam sebelum jadwal keberangkatan."],
                    ["QS Ali Imran: 97 — \"Dan di antara kewajiban manusia kepada Allah adalah melaksanakan ibadah haji ke Baitullah.\"",
                     "QS Al-Hajj: 27 — \"Dan berserulah kepada manusia untuk mengerjakan haji.\"",
                     "HR Bukhari — \"Barangsiapa berhaji karena Allah dan tidak berbuat rafats dan fasuq, maka ia kembali seperti bayi yang baru lahir.\""],
                    ["Haji melatih ketaatan total kepada Allah.", "Proses panjang mengajarkan kesabaran.",
                     "Bertemu sesama muslim dari seluruh dunia.", "Meninggalkan kenyamanan demi ibadah."],
                    ["Rafats — berkata kotor.", "Fasuq — berbuat maksiat.", "Jidal — bertengkar tanpa manfaat."],
                    ["Siapkan dokumen di tas tangan, jangan di bagasi.", "Gunakan pakaian nyaman dan menutup aurat.",
                     "Bawa obat pribadi secukupnya.", "Perbanyak doa dan dzikir selama perjalanan."]))
            },
            new()
            {
                Urutan = 2, Nama = "Tiba di Madinah",
                Lokasi = "Bandara Madinah, Hotel, Masjid Nabawi", Waktu = "Sore hari (Golden Hour)",
                Deskripsi = "Kedatangan jamaah di Bandara Madinah, proses imigrasi, perjalanan ke hotel, dan kunjungan pertama ke Masjid Nabawi.",
                ConfigJson = J(new { durasi = "20-25 menit", objective = "Selesaikan imigrasi dan kunjungi Masjid Nabawi" }),
                EdukasiJson = J(new EdukasiContent(
                    "Madinah Al-Munawwarah",
                    ["Madinah adalah kota Nabi — tempat hijrah Rasulullah SAW dan lokasi Masjid Nabawi.",
                     "Sholat di Masjid Nabawi bernilai 1000 kali lipat dibanding masjid lain (kecuali Masjidil Haram).",
                     "Raudhah adalah taman surga, tempat mustajab untuk berdoa.",
                     "Adab masuk masjid: dahulukan kaki kanan dan membaca doa masuk masjid."],
                    ["HR Bukhari-Muslim — \"Satu sholat di masjidku ini lebih baik dari 1000 sholat di masjid lain, kecuali Masjidil Haram.\"",
                     "HR Bukhari — \"Antara rumahku dan mimbarku adalah taman (raudhah) dari taman-taman surga.\""],
                    ["Meneladani perjuangan hijrah Rasulullah.", "Menumbuhkan kecintaan kepada Nabi Muhammad SAW.",
                     "Merasakan ketenangan beribadah di kota suci."],
                    ["Tidak berdesak-desakan hingga menyakiti jamaah lain.", "Tidak berbicara keras di dalam masjid.",
                     "Tidak mengambil foto berlebihan hingga mengganggu ibadah."],
                    ["Simpan kartu hotel dan hafalkan nomor kamar.", "Gunakan alas kaki yang mudah dilepas.",
                     "Catat nomor telepon pembimbing.", "Perbanyak sholawat selama di Madinah."]))
            },
            new()
            {
                Urutan = 3, Nama = "Miqat dan Niat Umrah",
                Lokasi = "Miqat Dzul Hulaifah (Bir Ali)", Waktu = "Pagi hari",
                Deskripsi = "Scene inti pembelajaran: mandi sunnah, memakai kain ihram, sholat sunnah, niat Umrah di Miqat, dan membaca Talbiyah.",
                ConfigJson = J(new { durasi = "20-25 menit", objective = "Pakai ihram, niat Umrah, dan lantunkan Talbiyah" }),
                EdukasiJson = J(new EdukasiContent(
                    "Miqat, Ihram, dan Talbiyah",
                    ["Miqat adalah batas tempat/waktu dimulainya ibadah Haji atau Umrah.",
                     "Miqat Makani berjumlah 5 tempat; jamaah dari Madinah berihram di Dzul Hulaifah (Bir Ali).",
                     "Ihram laki-laki: 2 helai kain putih tanpa jahitan. Perempuan: pakaian menutup aurat tanpa penutup wajah dan sarung tangan.",
                     "Sebelum ihram disunnahkan mandi, memotong kuku, dan memakai wangi-wangian di badan (sebelum niat).",
                     "Niat Umrah: \"Labbaika 'umratan\" — aku penuhi panggilan-Mu untuk berumrah.",
                     "Talbiyah: \"Labbaik Allahumma labbaik, labbaika laa syariika laka labbaik, innal hamda wan ni'mata laka wal mulk, laa syariika lak.\""],
                    ["QS Al-Baqarah: 196 — \"Dan sempurnakanlah ibadah haji dan umrah karena Allah.\"",
                     "HR Bukhari-Muslim tentang penetapan miqat-miqat oleh Rasulullah SAW."],
                    ["Ihram melambangkan kesetaraan seluruh manusia di hadapan Allah.",
                     "Meninggalkan pakaian dunia, memasuki kondisi suci ibadah.",
                     "Talbiyah adalah jawaban atas panggilan Allah."],
                    ["Memakai pakaian berjahit (laki-laki).", "Memakai wewangian setelah niat ihram.",
                     "Memotong rambut atau kuku.", "Berburu binatang.", "Menikah atau melamar.", "Bertengkar (jidal)."],
                    ["Hafalkan bacaan talbiyah sebelum berangkat.", "Gunakan sabuk ihram untuk menyimpan dokumen.",
                     "Jaga kain ihram tetap menutup aurat saat beraktivitas.", "Perbanyak talbiyah sepanjang perjalanan ke Makkah."]))
            },
            new()
            {
                Urutan = 4, Nama = "Masuk Masjidil Haram",
                Lokasi = "Masjidil Haram, Makkah", Waktu = "Menjelang senja",
                Deskripsi = "Pengalaman pertama memasuki Masjidil Haram: adab masuk masjid, doa, dan melihat Ka'bah untuk pertama kalinya.",
                ConfigJson = J(new { durasi = "15 menit", objective = "Masuk masjid dengan adab dan lihat Ka'bah" }),
                EdukasiJson = J(new EdukasiContent(
                    "Adab Memasuki Masjidil Haram",
                    ["Masjidil Haram di Makkah adalah masjid paling suci umat Islam, kiblat seluruh dunia.",
                     "Masuk dengan kaki kanan sambil membaca doa masuk masjid.",
                     "Saat pertama melihat Ka'bah, angkat tangan dan berdoa — waktu mustajab.",
                     "Sholat di Masjidil Haram bernilai 100.000 kali lipat.",
                     "Hajar Aswad adalah batu dari surga yang diletakkan di sudut Ka'bah."],
                    ["QS Al-Baqarah: 144 — \"Maka palingkanlah wajahmu ke arah Masjidil Haram.\"",
                     "HR Ahmad — \"Sholat di Masjidil Haram lebih utama 100.000 kali dibanding sholat di masjid lain.\""],
                    ["Menghadirkan rasa takjub akan kebesaran Allah.", "Persatuan umat dalam satu kiblat.",
                     "Momen spiritual melihat Baitullah pertama kali."],
                    ["Berdesakan menyakiti jamaah lain.", "Berbicara kotor di area masjid.", "Membuang sampah sembarangan."],
                    ["Masuk lewat pintu King Abdul Aziz atau Babussalam bila memungkinkan.",
                     "Ingat nomor pintu masuk agar tidak tersesat.", "Bawa kantong untuk alas kaki."]))
            },
            new()
            {
                Urutan = 5, Nama = "Tawaf Umrah",
                Lokasi = "Mataf, Masjidil Haram", Waktu = "Malam hari (lampu masjid)",
                Deskripsi = "Pelaksanaan Tawaf Umrah: 7 putaran mengelilingi Ka'bah berlawanan arah jarum jam, dimulai dari Hajar Aswad.",
                ConfigJson = J(new { durasi = "20 menit", objective = "Selesaikan 7 putaran tawaf" }),
                EdukasiJson = J(new EdukasiContent(
                    "Tata Cara Tawaf",
                    ["Tawaf adalah mengelilingi Ka'bah 7 putaran dengan Ka'bah di sisi kiri (berlawanan jarum jam).",
                     "Dimulai dan diakhiri di garis sejajar Hajar Aswad, sambil mengangkat tangan (istilam) dan bertakbir.",
                     "Syarat tawaf: suci dari hadas, menutup aurat, dan di dalam Masjidil Haram.",
                     "Setelah tawaf disunnahkan sholat 2 rakaat di belakang Maqam Ibrahim lalu minum air Zamzam.",
                     "Multazam (antara Hajar Aswad dan pintu Ka'bah) adalah tempat mustajab berdoa."],
                    ["QS Al-Hajj: 29 — \"Dan hendaklah mereka melakukan tawaf di sekeliling rumah tua itu (Baitullah).\"",
                     "HR Tirmidzi — \"Tawaf di Baitullah adalah sholat, hanya saja Allah membolehkan berbicara di dalamnya.\""],
                    ["Berputar mengelilingi Ka'bah melambangkan kehidupan yang berpusat pada Allah.",
                     "Kebersamaan jutaan jamaah dalam satu gerakan ibadah."],
                    ["Tawaf tanpa wudhu.", "Mendorong jamaah lain demi mencium Hajar Aswad.",
                     "Berjalan searah jarum jam (salah arah)."],
                    ["Bila tak bisa mencium Hajar Aswad, cukup isyarat tangan dari jauh.",
                     "Hitung putaran dengan penanda garis coklat di lantai.", "Jaga wudhu selama tawaf."]))
            },
            new()
            {
                Urutan = 6, Nama = "Sa'i Umrah",
                Lokasi = "Mas'a (Shafa - Marwah)", Waktu = "Malam hari (interior)",
                Deskripsi = "Sa'i: berjalan 7 perjalanan antara bukit Shafa dan Marwah, mengenang perjuangan Siti Hajar, ditutup Tahallul.",
                ConfigJson = J(new { durasi = "20 menit", objective = "Selesaikan 7 perjalanan Sa'i lalu Tahallul" }),
                EdukasiJson = J(new EdukasiContent(
                    "Sa'i dan Tahallul",
                    ["Sa'i adalah berjalan dari Shafa ke Marwah 7 kali perjalanan (Shafa→Marwah = 1).",
                     "Mengenang perjuangan Siti Hajar mencari air untuk Nabi Ismail hingga terpancar air Zamzam.",
                     "Di area lampu hijau, laki-laki disunnahkan berlari-lari kecil (raml).",
                     "Sa'i dimulai di Shafa sambil membaca \"Innash shafaa wal marwata min sya'aairillah\".",
                     "Setelah Sa'i, jamaah bertahallul: mencukur atau memotong rambut minimal 3 helai — Umrah selesai."],
                    ["QS Al-Baqarah: 158 — \"Sesungguhnya Shafa dan Marwah adalah sebagian dari syiar Allah.\""],
                    ["Meneladani ikhtiar dan tawakal Siti Hajar.", "Usaha keras diiringi keyakinan pada pertolongan Allah."],
                    ["Memulai Sa'i dari Marwah (urutan terbalik).", "Menganggap lari wajib di seluruh lintasan."],
                    ["Gunakan kursi roda/skuter bila fisik tidak kuat.", "Berdoalah di atas bukit Shafa dan Marwah menghadap Ka'bah.",
                     "Minum Zamzam sebelum memulai Sa'i."]))
            },
            new()
            {
                Urutan = 7, Nama = "Wukuf di Arafah",
                Lokasi = "Padang Arafah, Jabal Rahmah", Waktu = "Siang–senja (9 Dzulhijjah)",
                Deskripsi = "Puncak dan rukun terbesar haji: wukuf di Padang Arafah pada 9 Dzulhijjah — memperbanyak doa, dzikir, dan istighfar hingga terbenam matahari.",
                ConfigJson = J(new { durasi = "15-20 menit", objective = "Laksanakan wukuf: perbanyak doa hingga matahari terbenam" }),
                EdukasiJson = J(new EdukasiContent(
                    "Wukuf di Arafah — Rukun Terbesar Haji",
                    ["Wukuf di Arafah adalah rukun haji yang paling utama — tanpanya haji tidak sah.",
                     "Rasulullah SAW bersabda: \"Al-hajju Arafah\" — haji itu (wukufnya di) Arafah (HR Tirmidzi, Abu Dawud, dll).",
                     "Waktu wukuf: sejak tergelincir matahari (zawal) 9 Dzulhijjah hingga terbit fajar 10 Dzulhijjah.",
                     "Di Masjid Namirah dilaksanakan khutbah Arafah dan sholat Dzuhur–Ashar dijama' taqdim serta diqashar.",
                     "Jabal Rahmah adalah bukit tempat pertemuan Nabi Adam dan Hawa; jamaah memperbanyak doa di sekitarnya.",
                     "Hari Arafah adalah waktu doa paling mustajab; disunnahkan memperbanyak istighfar dan tahlil menghadap kiblat."],
                    ["HR Tirmidzi — \"Al-hajju Arafah, barangsiapa mendapati (wukuf) malam Arafah sebelum terbit fajar maka ia telah mendapati haji.\"",
                     "HR Muslim — \"Tidak ada hari yang lebih banyak Allah membebaskan hamba dari neraka selain hari Arafah.\"",
                     "QS Al-Baqarah: 198 — \"Maka apabila kamu bertolak dari Arafah, berdzikirlah kepada Allah di Masy'aril Haram.\""],
                    ["Merasakan puncak kepasrahan total kepada Allah.", "Kebersamaan jutaan jamaah dalam satu padang, satu doa.",
                     "Mengenang padang Mahsyar di hari kiamat.", "Ampunan dan pembebasan dari api neraka."],
                    ["Meninggalkan Arafah sebelum matahari terbenam (bagi yang wukuf siang) tanpa udzur.",
                     "Menyia-nyiakan waktu wukuf dengan hal sia-sia, bukan doa dan dzikir."],
                    ["Perbanyak doa untuk diri, keluarga, dan seluruh umat.", "Jaga kondisi fisik: cukup minum, hindari terik langsung.",
                     "Hadirkan kekhusyukan — inilah inti perjalanan haji.", "Menghadap kiblat saat berdoa, bukan menghadap Jabal Rahmah."]))
            },
            new()
            {
                Urutan = 8, Nama = "Mabit di Muzdalifah",
                Lokasi = "Muzdalifah", Waktu = "Malam hari (9 Dzulhijjah malam)",
                Deskripsi = "Bermalam (mabit) di Muzdalifah setelah wukuf, mengumpulkan batu kerikil untuk melontar jumrah di Mina.",
                ConfigJson = J(new { durasi = "15 menit", objective = "Kumpulkan 7 batu kerikil (dianjurkan 70)" }),
                EdukasiJson = J(new EdukasiContent(
                    "Mabit di Muzdalifah",
                    ["Mabit di Muzdalifah hukumnya Wajib Haji — bermalam setelah wukuf di Arafah hingga lewat tengah malam.",
                     "Di Muzdalifah jamaah sholat Maghrib dan Isya dijama' serta memperbanyak dzikir dan doa.",
                     "Jamaah mengumpulkan batu kerikil sebesar biji kurma untuk melontar jumrah: minimal 7 butir untuk Jumrah Aqabah, dianjurkan 70 butir untuk seluruh hari tasyrik.",
                     "Menjelang fajar jamaah bergerak menuju Mina."],
                    ["QS Al-Baqarah: 198 — \"Maka berdzikirlah kepada Allah di Masy'aril Haram (Muzdalifah).\""],
                    ["Malam perenungan di bawah langit terbuka, kesederhanaan total.",
                     "Persiapan fisik dan spiritual sebelum melawan simbol setan."],
                    ["Meninggalkan Muzdalifah sebelum waktu yang dibolehkan tanpa udzur.",
                     "Mengambil batu besar yang membahayakan."],
                    ["Pilih batu seukuran biji kurma/kacang tanah.", "Simpan batu dalam kantong kecil.",
                     "Manfaatkan waktu untuk istirahat, perjalanan esok berat."]))
            },
            new()
            {
                Urutan = 9, Nama = "Mina — Jumrah Aqabah",
                Lokasi = "Jamarat, Mina", Waktu = "Pagi 10 Dzulhijjah",
                Deskripsi = "Melontar 7 batu ke Jumrah Aqabah, menyembelih hadyu (dam), dan Tahallul Awal.",
                ConfigJson = J(new { durasi = "20 menit", objective = "Lontar 7 batu, lalu Tahallul Awal" }),
                EdukasiJson = J(new EdukasiContent(
                    "Jumrah Aqabah dan Tahallul Awal",
                    ["Pada 10 Dzulhijjah jamaah melontar Jumrah Aqabah 7 kali sambil membaca \"Bismillahi Allahu Akbar\".",
                     "Melontar jumrah adalah simbol perlawanan terhadap godaan setan, meneladani Nabi Ibrahim AS.",
                     "Setelah melontar, jamaah menyembelih hadyu (bagi haji tamattu'/qiran) dan bertahallul awal (mencukur/memotong rambut minimal 3 helai).",
                     "Setelah Tahallul Awal, sebagian besar larangan ihram gugur — boleh memakai pakaian biasa — kecuali hubungan suami istri."],
                    ["HR Muslim — Rasulullah melontar Jumrah Aqabah 7 kali, bertakbir pada setiap lontaran."],
                    ["Komitmen melawan bisikan setan dalam kehidupan.", "Keteladanan pengorbanan Nabi Ibrahim dan Ismail."],
                    ["Melontar dengan batu besar atau sandal (tidak sah dan berbahaya).",
                     "Berdesakan di area jamarat pada jam padat."],
                    ["Pilih waktu longgar (dhuha akhir atau sore).", "Cukup 7 batu yang masuk ke kolam jamarat.",
                     "Jaga barang bawaan di keramaian."]))
            },
            new()
            {
                Urutan = 10, Nama = "Tawaf Ifadah dan Sa'i Haji",
                Lokasi = "Masjidil Haram, Makkah", Waktu = "Siang hari",
                Deskripsi = "Rukun Haji: Tawaf Ifadah 7 putaran dan Sa'i Haji 7 perjalanan, mencapai Tahallul Tsani.",
                ConfigJson = J(new { durasi = "20 menit", objective = "Selesaikan Tawaf Ifadah dan Sa'i Haji" }),
                EdukasiJson = J(new EdukasiContent(
                    "Tawaf Ifadah — Rukun Haji",
                    ["Tawaf Ifadah (disebut juga Tawaf Ziarah/Rukun) adalah rukun haji — haji tidak sah tanpanya.",
                     "Dilaksanakan setelah kembali dari Mina, tata caranya sama dengan tawaf umrah: 7 putaran dari Hajar Aswad.",
                     "Karena sudah Tahallul Awal, jamaah boleh memakai pakaian biasa.",
                     "Setelah Tawaf Ifadah dan Sa'i Haji, jamaah mencapai Tahallul Tsani — seluruh larangan ihram gugur.",
                     "Rukun Haji ada 4: Ihram, Wukuf di Arafah, Tawaf Ifadah, dan Sa'i (ditambah tertib menurut sebagian ulama)."],
                    ["QS Al-Hajj: 29 — \"Kemudian hendaklah mereka menghilangkan kotoran mereka, menyempurnakan nazar-nazar mereka, dan melakukan tawaf di sekeliling rumah tua itu.\""],
                    ["Puncak penyempurnaan rukun haji.", "Kembali mengelilingi Baitullah dalam keadaan lebih suci."],
                    ["Menunda tawaf ifadah tanpa udzur hingga keluar Makkah.", "Meninggalkan sa'i karena mengira sudah cukup sa'i umrah (bagi tamattu')."],
                    ["Boleh digabung pelaksanaannya dengan hari tasyrik.", "Manfaatkan pakaian bebas untuk kenyamanan."]))
            },
            new()
            {
                Urutan = 11, Nama = "Mabit di Mina & Tiga Jumrah",
                Lokasi = "Perkemahan Mina & Jamarat", Waktu = "Hari Tasyrik (11-13 Dzulhijjah)",
                Deskripsi = "Mabit di tenda Mina dan melontar tiga jumrah (Ula, Wustha, Aqabah) berurutan, 21 batu per hari.",
                ConfigJson = J(new { durasi = "20 menit", objective = "Lontar Ula, Wustha, Aqabah — 7 batu masing-masing" }),
                EdukasiJson = J(new EdukasiContent(
                    "Hari Tasyrik di Mina",
                    ["Hari Tasyrik adalah 11, 12, 13 Dzulhijjah — jamaah mabit di Mina dan melontar tiga jumrah setiap hari.",
                     "Urutan melontar wajib: Ula → Wustha → Aqabah, masing-masing 7 batu (total 21 batu per hari).",
                     "Setelah melontar Jumrah Ula dan Wustha disunnahkan berdiri berdoa menghadap kiblat; setelah Aqabah tidak berdoa.",
                     "Nafar Awal: meninggalkan Mina tanggal 12 sebelum maghrib. Nafar Tsani: hingga 13 Dzulhijjah (lebih utama)."],
                    ["HR Bukhari — Rasulullah berdoa panjang setelah Jumrah Ula dan Wustha, dan tidak berdoa setelah Aqabah."],
                    ["Konsistensi ibadah selama beberapa hari melatih istiqamah.",
                     "Kebersamaan di tenda mengajarkan kesederhanaan dan ukhuwah."],
                    ["Melontar sebelum waktunya (sebelum zawal pada hari tasyrik menurut jumhur).",
                     "Mewakilkan lontaran tanpa udzur syar'i."],
                    ["Hafalkan urutan: Ula (dekat Masjid Khaif) → Wustha → Aqabah.",
                     "Bawa persediaan air saat ke jamarat.", "Kenali jalur tenda maktab Anda."]))
            },
            new()
            {
                Urutan = 12, Nama = "Tawaf Wada'",
                Lokasi = "Mataf, Masjidil Haram", Waktu = "Menjelang subuh (biru fajar)",
                Deskripsi = "Tawaf perpisahan 7 putaran sebelum meninggalkan Makkah — penutup seluruh rangkaian ibadah haji.",
                ConfigJson = J(new { durasi = "15 menit", objective = "Selesaikan 7 putaran Tawaf Wada'" }),
                EdukasiJson = J(new EdukasiContent(
                    "Tawaf Wada' — Perpisahan dengan Baitullah",
                    ["Tawaf Wada' hukumnya Wajib Haji, dilakukan saat akan meninggalkan Makkah.",
                     "Setelah Tawaf Wada' jamaah tidak boleh menetap lama di Makkah — langsung melanjutkan perjalanan pulang.",
                     "Wanita haid gugur kewajiban Tawaf Wada'.",
                     "Inilah momen perpisahan dengan Baitullah — berdoa agar dapat kembali dan menjadi haji mabrur.",
                     "Haji mabrur tidak ada balasan baginya kecuali surga."],
                    ["HR Bukhari-Muslim — \"Janganlah seseorang meninggalkan Makkah sebelum melakukan tawaf terakhir di Baitullah.\"",
                     "HR Bukhari — \"Haji mabrur tidak ada balasan baginya kecuali surga.\""],
                    ["Rasa syukur atas kesempurnaan ibadah.", "Tekad membawa nilai haji dalam kehidupan sehari-hari."],
                    ["Menetap kembali di Makkah setelah tawaf wada' tanpa udzur.", "Berbelanja lama setelah tawaf wada'."],
                    ["Lakukan tawaf wada' sedekat mungkin dengan jadwal kepulangan.",
                     "Perbanyak doa di putaran terakhir.", "Jaga kekhusyukan hingga akhir."]))
            }
        ];

        Scenes.AddRange(scenes);
        
        var byUrutan = Scenes.ToDictionary(s => s.Urutan, s => s.Urutan);
        foreach (var s in Scenes) s.Id = s.Urutan;

        static CheckpointData Cp(int sceneId, int urutan, string nama, int minBenar, params CheckpointQuestion[] qs) => new()
        {
            SceneId = sceneId, Urutan = urutan, Nama = nama, MinBenar = minBenar,
            QuestionsJson = JsonSerializer.Serialize(qs)
        };

        List<CheckpointData> cps =
        [
            // Scene 01
            Cp(byUrutan[1], 1, "Dokumen dan Barang", 3,
                new("Dokumen apa yang WAJIB dibawa saat berangkat?", ["Paspor, visa, dan tiket", "Hanya KTP", "Kartu keluarga", "Buku tabungan"], 0),
                new("Berapa jam sebaiknya datang ke bandara sebelum keberangkatan?", ["30 menit", "1 jam", "3-4 jam", "10 jam"], 2),
                new("Di mana sebaiknya menyimpan dokumen penting?", ["Di bagasi terdaftar", "Di tas tangan", "Dititipkan teman", "Di kantong celana"], 1),
                new("Apa yang dilakukan jika bagasi melebihi batas?", ["Memaksa petugas", "Membayar berapapun", "Mengurangi barang bawaan", "Meninggalkan koper"], 2)),
            Cp(byUrutan[1], 2, "Adab dan Persiapan", 3,
                new("Apa niat utama berangkat haji/umrah?", ["Berwisata", "Ibadah karena Allah", "Berdagang", "Mencari gelar"], 1),
                new("Doa apa yang dibaca saat naik kendaraan?", ["Subhanalladzi sakhkhara lana hadza", "Doa makan", "Doa masuk rumah", "Doa bercermin"], 0),
                new("Sikap yang baik selama perjalanan adalah?", ["Mengeluh", "Sabar dan bersyukur", "Banyak tidur saja", "Marah bila antri"], 1),
                new("Yang termasuk persiapan fisik adalah?", ["Begadang", "Istirahat cukup dan olahraga", "Diet ketat", "Minum kopi banyak"], 1)),
            // Scene 02
            Cp(byUrutan[2], 1, "Kedatangan dan Imigrasi", 3,
                new("Madinah juga dikenal dengan sebutan?", ["Madinah Al-Munawwarah", "Kota Seribu Menara", "Darussalam", "Al-Quds"], 0),
                new("Dokumen apa yang diperlukan saat imigrasi?", ["Paspor dan visa", "SIM", "Kartu pelajar", "Akta kelahiran"], 0),
                new("Transportasi dari bandara ke hotel biasanya?", ["Jalan kaki", "Bus antar jemput", "Kereta cepat", "Perahu"], 1),
                new("Bahasa yang digunakan petugas imigrasi umumnya?", ["Arab dan Inggris", "Jawa", "Mandarin", "Belanda"], 0)),
            Cp(byUrutan[2], 2, "Masjid Nabawi dan Adab", 3,
                new("Masjid Nabawi didirikan oleh?", ["Nabi Muhammad SAW", "Khalifah Umar", "Sultan Utsmani", "Raja Saudi"], 0),
                new("Sholat di Masjid Nabawi pahalanya?", ["10 kali lipat", "100 kali lipat", "1000 kali lipat", "Sama saja"], 2),
                new("Tempat mustajab berdoa di Masjid Nabawi disebut?", ["Multazam", "Raudhah", "Hijr Ismail", "Mas'a"], 1),
                new("Adab masuk masjid adalah?", ["Kaki kiri dulu", "Mendahulukan kaki kanan dan membaca doa", "Berlari masuk", "Langsung duduk"], 1)),
            // Scene 03
            Cp(byUrutan[3], 1, "Ihram", 4,
                new("Apa yang dimaksud dengan Miqat?", ["Batas memulai ibadah Haji/Umrah", "Nama masjid", "Jenis pakaian", "Bukit di Makkah"], 0),
                new("Berapa helai kain ihram untuk laki-laki?", ["1 helai", "2 helai", "3 helai", "4 helai"], 1),
                new("Mana yang DILARANG saat ihram?", ["Minum air", "Memakai wewangian", "Berdzikir", "Berjalan kaki"], 1),
                new("Apa yang dilakukan sebelum memakai ihram?", ["Mandi sunnah", "Tidur", "Makan besar", "Belanja"], 0),
                new("Sholat apa yang dianjurkan setelah memakai ihram?", ["Sholat sunnah 2 rakaat", "Sholat 100 rakaat", "Tidak ada", "Sholat jenazah"], 0)),
            Cp(byUrutan[3], 2, "Niat dan Talbiyah", 4,
                new("Di mana niat Umrah dimulai?", ["Di hotel", "Di Miqat", "Di pesawat", "Di Ka'bah"], 1),
                new("Bunyi talbiyah yang benar adalah?", ["Labbaik Allahumma labbaik...", "Alhamdulillah...", "Astaghfirullah...", "Bismillah..."], 0),
                new("Niat Umrah dibaca dalam hati atau lisan?", ["Hanya hati", "Hanya lisan", "Keduanya (hati dan lisan)", "Ditulis"], 2),
                new("Apa yang dimaksud Miqat Makani?", ["Batas waktu", "Batas tempat", "Batas usia", "Batas biaya"], 1),
                new("Berapa jumlah Miqat Makani?", ["3 tempat", "4 tempat", "5 tempat", "7 tempat"], 2)),
            // Scene 04
            Cp(byUrutan[4], 1, "Masjidil Haram dan Adab", 4,
                new("Di kota manakah Masjidil Haram berada?", ["Madinah", "Mekkah", "Jeddah", "Thaif"], 1),
                new("Apa yang pertama dilihat setelah memasuki Masjidil Haram?", ["Ka'bah", "Hotel", "Menara jam", "Pasar"], 0),
                new("Doa masuk masjid dibaca ketika?", ["Saat masuk dengan kaki kanan", "Saat keluar", "Saat duduk", "Saat wudhu"], 0),
                new("Berapa pahala sholat di Masjidil Haram?", ["1000 kali", "10.000 kali", "100.000 kali lipat", "Sama saja"], 2),
                new("Batu Hajar Aswad berasal dari?", ["Gunung Uhud", "Surga", "Sungai Nil", "Madinah"], 1)),
            // Scene 05
            Cp(byUrutan[5], 1, "Tawaf", 4,
                new("Tawaf dilakukan sebanyak berapa putaran?", ["3 putaran", "5 putaran", "7 putaran", "9 putaran"], 2),
                new("Tawaf dimulai dari?", ["Hajar Aswad", "Maqam Ibrahim", "Bukit Shafa", "Pintu masjid"], 0),
                new("Arah tawaf yang benar adalah?", ["Searah jarum jam", "Berlawanan jarum jam (Ka'bah di kiri)", "Bebas", "Zigzag"], 1),
                new("Sholat sunnah setelah tawaf dilakukan di?", ["Maqam Ibrahim", "Hotel", "Bukit Marwah", "Mina"], 0),
                new("Syarat sah tawaf adalah?", ["Suci dari hadas", "Membawa payung", "Berlari", "Bersuara keras"], 0)),
            // Scene 06
            Cp(byUrutan[6], 1, "Sa'i", 4,
                new("Sa'i dilakukan sebanyak berapa perjalanan?", ["3 perjalanan", "5 perjalanan", "7 perjalanan", "10 perjalanan"], 2),
                new("Sa'i dimulai dari?", ["Bukit Marwah", "Bukit Shafa", "Ka'bah", "Mina"], 1),
                new("Ibu yang kisahnya diabadikan dalam Sa'i adalah?", ["Siti Aisyah", "Siti Hajar", "Siti Maryam", "Siti Khadijah"], 1),
                new("Air yang memancar atas pertolongan Allah untuk Siti Hajar adalah?", ["Air Zamzam", "Air hujan", "Air sungai", "Air laut"], 0),
                new("Setelah Sa'i selesai, apa yang dilakukan?", ["Tahallul (potong rambut)", "Tidur", "Langsung pulang", "Wukuf"], 0)),
            // Scene 07 — Wukuf di Arafah
            Cp(byUrutan[7], 1, "Wukuf di Arafah", 3,
                new("Apa rukun haji yang paling utama?", ["Wukuf di Arafah", "Tawaf Wada'", "Melontar jumrah", "Mabit di Mina"], 0),
                new("Sabda Nabi tentang inti haji berbunyi?", ["\"Al-hajju Arafah\"", "\"Ash-shalaatu 'imaadud diin\"", "\"Innamal a'maalu binniyyaat\"", "\"Ath-thuhuuru syathrul iimaan\""], 0),
                new("Kapan waktu wukuf di Arafah?", ["Sejak zawal 9 Dzulhijjah hingga fajar 10 Dzulhijjah", "Sepanjang Ramadhan", "Malam 1 Syawal", "Setiap Jumat"], 0),
                new("Di masjid manakah khutbah dan sholat jama' saat Arafah?", ["Masjid Namirah", "Masjid Nabawi", "Masjidil Aqsa", "Masjid Quba"], 0)),
            // Scene 08 — Muzdalifah
            Cp(byUrutan[8], 1, "Pengumpulan Batu", 3,
                new("Berapa minimal batu yang harus dikumpulkan?", ["3 butir", "7 butir", "21 butir", "100 butir"], 1),
                new("Berapa jumlah batu yang dianjurkan untuk seluruh hari?", ["10 butir", "40 butir", "70 butir", "700 butir"], 2),
                new("Ukuran batu yang ideal sebesar?", ["Bola tenis", "Biji kurma", "Kepalan tangan", "Butir pasir"], 1),
                new("Batu ini digunakan untuk apa?", ["Melontar Jumrah", "Oleh-oleh", "Membangun tenda", "Menimbang bagasi"], 0)),
            Cp(byUrutan[8], 2, "Mabit di Muzdalifah", 4,
                new("Apa hukum Mabit di Muzdalifah?", ["Sunnah", "Mubah", "Wajib Haji", "Makruh"], 2),
                new("Sholat apa yang dilakukan di Muzdalifah?", ["Maghrib dan Isya dijama'", "Subuh saja", "Dhuha", "Tarawih"], 0),
                new("Sampai kapan Mabit di Muzdalifah?", ["Hingga sebelum fajar/subuh", "1 jam saja", "Seminggu", "Sampai siang"], 0),
                new("Setelah Muzdalifah, jamaah menuju?", ["Madinah", "Mina", "Jeddah", "Arafah"], 1),
                new("Dzikir di Muzdalifah disebut dalam surat?", ["QS Al-Baqarah: 198", "QS Yasin: 1", "QS Al-Ikhlas: 2", "QS An-Nas: 3"], 0)),
            // Scene 09 — Mina: Jumrah Aqabah
            Cp(byUrutan[9], 1, "Melontar Jumrah", 3,
                new("Berapa kali melontar Jumrah Aqabah?", ["3 kali", "7 kali", "10 kali", "21 kali"], 1),
                new("Bacaan saat melontar adalah?", ["Bismillahi Allahu Akbar", "Alhamdulillah", "Doa makan", "Salam"], 0),
                new("Makna melontar Jumrah adalah?", ["Olahraga", "Melawan godaan setan", "Tradisi lokal", "Permainan"], 1),
                new("Jumrah Aqabah melambangkan?", ["Godaan setan yang besar", "Bukit batu biasa", "Pintu masjid", "Batas kota"], 0)),
            Cp(byUrutan[9], 2, "Tahallul Awal", 4,
                new("Apa itu Tahallul Awal?", ["Mencukur/memotong rambut", "Mandi besar", "Berpuasa", "Membayar zakat"], 0),
                new("Minimal rambut yang dipotong?", ["1 helai", "3 helai", "10 helai", "Semua rambut wajib"], 1),
                new("Larangan yang MASIH berlaku setelah Tahallul Awal?", ["Memakai baju", "Berhubungan suami istri", "Memakai parfum", "Memotong kuku"], 1),
                new("Aktivitas setelah melontar Jumrah Aqabah adalah?", ["Tahallul", "Wukuf", "Sa'i", "Pulang"], 0),
                new("Setelah Tahallul Awal, jamaah boleh memakai?", ["Pakaian biasa", "Hanya ihram", "Jas hujan", "Seragam"], 0)),
            // Scene 10 — Tawaf Ifadah & Sa'i Haji
            Cp(byUrutan[10], 1, "Tawaf Ifadah", 3,
                new("Tawaf Ifadah disebut juga?", ["Tawaf Ziarah / Tawaf Rukun", "Tawaf Sunnah", "Tawaf Qudum", "Tawaf Wada'"], 0),
                new("Apa hukum Tawaf Ifadah?", ["Sunnah", "Rukun Haji", "Mubah", "Makruh"], 1),
                new("Tawaf Ifadah dilaksanakan setelah?", ["Kembali dari Mina", "Tiba di Jeddah", "Sebelum ihram", "Setelah pulang"], 0),
                new("Perbedaan Tawaf Ifadah dan Tawaf Umrah?", ["Tawaf Ifadah adalah rukun Haji", "Jumlah putarannya beda", "Arahnya beda", "Tempatnya beda"], 0)),
            Cp(byUrutan[10], 2, "Sa'i dan Tahallul Tsani", 3,
                new("Sa'i Haji dilaksanakan?", ["Setelah Tawaf Ifadah", "Sebelum wukuf", "Di Mina", "Di Muzdalifah"], 0),
                new("Tahallul Tsani menggugurkan?", ["Seluruh larangan ihram", "Sebagian larangan", "Tidak ada", "Kewajiban sholat"], 0),
                new("Setelah Tahallul Tsani, apa yang menjadi halal kembali?", ["Berhubungan suami istri", "Mencuri", "Berjudi", "Riba"], 0),
                new("Rukun Haji ada berapa?", ["2", "3", "4 (Ihram, Wukuf, Tawaf, Sa'i)", "10"], 2)),
            // Scene 11 — Mabit Mina & Tiga Jumrah
            Cp(byUrutan[11], 1, "Hari Tasyrik", 4,
                new("Hari Tasyrik tanggal berapa?", ["8, 9, 10 Dzulhijjah", "11, 12, 13 Dzulhijjah", "1, 2, 3 Syawal", "15, 16, 17 Ramadhan"], 1),
                new("Urutan melontar 3 Jumrah?", ["Aqabah → Wustha → Ula", "Ula → Wustha → Aqabah", "Bebas", "Wustha → Ula → Aqabah"], 1),
                new("Total batu per hari?", ["7 butir", "14 butir", "21 butir", "70 butir"], 2),
                new("Apakah berdoa setelah Jumrah Aqabah?", ["Ya, wajib", "Tidak", "Hanya hari pertama", "Hanya bila hujan"], 1),
                new("Nafar Awal keluar dari Mina pada?", ["10 Dzulhijjah", "11 Dzulhijjah", "12 Dzulhijjah", "14 Dzulhijjah"], 2)),
            // Scene 12 — Tawaf Wada'
            Cp(byUrutan[12], 1, "Tawaf Wada'", 4,
                new("Apa hukum Tawaf Wada'?", ["Sunnah", "Wajib Haji", "Mubah", "Rukun Umrah"], 1),
                new("Kapan Tawaf Wada' dilakukan?", ["Saat tiba di Makkah", "Saat akan meninggalkan Makkah", "Di Mina", "Setelah wukuf"], 1),
                new("Berapa putaran Tawaf Wada'?", ["3 putaran", "5 putaran", "7 putaran", "9 putaran"], 2),
                new("Larangan setelah Tawaf Wada'?", ["Tidak boleh menetap di Makkah", "Tidak boleh makan", "Tidak boleh tidur", "Tidak boleh naik pesawat"], 0),
                new("Haji mabrur balasannya adalah?", ["Harta", "Surga", "Gelar", "Piagam"], 1))
        ];

        Checkpoints.AddRange(cps);
    }
}
