# FJM InterAct - Real-time Audience Interaction Platform

**FJM InterAct** adalah platform interaksi pelatihan (*training*), rapat (*meeting*), dan seminar interaktif real-time milik **PT Fiqry Jaya Manunggal (FJM)**. Dirancang untuk memudahkan partisipasi peserta tanpa instalasi aplikasi (*zero-login* via scan QR code atau tautan langsung).

---

## 🚀 Fitur Utama FJM InterAct

### 1. Peserta Training (Mobile-First / Zero-Login) - `/[code]`
- **Akses Cepat & Zero Login**: Cukup buka tautan atau scan QR Code (contoh: `https://fjm-interact.vercel.app/TRAIN26`). Tanpa download aplikasi atau registrasi akun.
- **Identitas Fleksibel**: Peserta bisa memilih tampil dengan nama atau **Anonim** (bisa diganti kapan saja).
- **Banner Pengumuman Real-time**: Notifikasi pengumuman dari trainer (banner amber dengan icon 📢) tampil langsung seketika di atas layar peserta.
- **Audience Q&A**:
  - Kirim pertanyaan dengan kategori topik (`Umum`, `Materi`, `Teknis`, `Manajemen`).
  - Upvote pertanyaan secara real-time; pertanyaan terpopuler otomatis naik ke atas.
  - Indikator khusus jika pertanyaan sedang disorot di panggung proyektor.
- **Live Polling & Keadilan Respon (Anti-Biased Polling)**:
  - Pilihan Ganda (*Multiple Choice*) dengan opsi lampiran gambar soal.
  - *Word Cloud* dinamis (input kata kunci).
  - *Rating* skala 1-5 bintang pemahaman materi.
  - **Sembunyikan Skor Sebelum Jawab**: Skor dan persentase tidak ditampilkan sebelum peserta mengklik tombol **"Kirim Jawaban"**, mencegah bias suara mayoritas.
  - **Kunci Respon**: Jawaban dikunci permanen setelah dikirim.

### 2. Layar Proyektor / Stage View - `/event/[code]/present`
- Dioptimalkan untuk resolusi 16:9 / Fullscreen di proyektor, Smart TV, atau Zoom screen sharing.
- Menampilkan QR Code dan kode event di pojok kanan atas secara konstan.
- **Dukungan Embed Slide Presentasi**:
  - Siap di-embed langsung ke dalam slide **Microsoft PowerPoint** (via Add-in *Web Viewer*), Google Slides, atau Canva.
  - Deteksi embed otomatis: saat berada di dalam slide, tautan footer disembunyikan dan floating bar diminimalkan agar tampilan 100% bersih seperti slide presentasi bawaan.
- **Mode Spotlight / Highlight**: Saat trainer menyorot pertanyaan, panggung otomatis menampilkan pertanyaan tersebut dalam tipografi besar dan jelas.
- **Grafik Polling Real-time**: Animasi transisi bar persentase, Word Cloud, serta panggung kuis 3-tahap lengkap dengan **Podium Juara 1, 2, 3** dan efek konfeti selebrasi.
- **Floating Navigation Bar Responsif**: Kontrol alur polling, prev/next, sembunyikan hasil, kunci polling, dan toggle Q&A langsung dari layar panggung.

### 3. Panel Kontrol & Moderasi Trainer - `/event/[code]/moderate`
- **Keamanan PIN Per Sesi**: Dilindungi 6 digit PIN khusus trainer sesi atau Master Admin PIN.
- **Tata Letak Mobile Fit-to-Screen**: Tampilan 100% pas dan proporsional di layar ponsel tanpa terpotong atau bocor ke samping.
- **Moderasi Pertanyaan**:
  - Saklar moderasi aktif/non-aktif.
  - Filter 4 kolom: *Semua*, *Review*, *Tampil*, dan *Terjawab*.
  - Aksi 1-klik: **Sorot ke Layar (Highlight)**, **Setujui**, **Tolak**, **Tandai Terjawab**, dan **Hapus**.
- **Siarkan Pengumuman (Broadcast Announcement)**: 1-klik untuk menyiarkan pesan berjalan atau informasi penting langsung ke seluruh HP peserta secara instan.
- **Kontrol Live Polling & Gambar**:
  - Pembuat polling baru (Pilihan Ganda, Word Cloud, Rating, Kuis).
  - Fitur lampiran gambar soal (upload langsung dengan kompresi otomatis atau via URL).
  - Tombol **Luncurkan ke Peserta** (1-klik langsung mengalihkan layar peserta & proyektor).
  - Saklar tampilkan/sembunyikan hasil ke peserta.
- **Ekspor Data & Laporan**:
  - Unduh rekapitulasi Q&A beserta jumlah upvote ke format **Excel (.xlsx) / CSV**.
  - Unduh rekapitulasi hasil polling peserta ke format **Excel (.xlsx) / CSV**.
- **Pengaturan Sesi & PIN**:
  - Lihat dan ubah 6 digit PIN khusus sesi ini.
  - Unduh gambar QR Code (PNG) beresolusi tinggi.

### 4. Dashboard Trainer - `/dashboard`
- **Dilindungi Master Admin PIN**: Kunci pengaman 6 angka (bawaan: `262626`, dapat diubah di menu Pengaturan).
- Kelola semua sesi training PT Fiqry Jaya Manunggal.
- Buat sesi training baru dengan penentuan PIN khusus trainer sesi tersebut.
- Kartu sesi menampilkan nomor PIN sesi dengan ikon gembok untuk kemudahan pembagian ke trainer bertugas.
- Pintasan langsung ke Layar Proyektor, Panel Kontrol, dan Tampilan Peserta.

---

## 🛠️ Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js (v18+)

### Langkah Menjalankan:
```bash
# 1. Pastikan dependensi terpasang
npm install

# 2. Sinkronisasi database
npx prisma db push

# 3. Jalankan server (Next.js + WebSocket Socket.io)
npm run dev
# Atau cukup klik dua kali start-dev.bat di Windows
```

Buka di browser:
- **Halaman Utama FJM InterAct**: [http://localhost:3000](http://localhost:3000)
- **Dashboard Trainer FJM**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🌐 Deployment Cloud
- **Hosting**: Vercel Serverless ([https://fjm-interact.vercel.app](https://fjm-interact.vercel.app))
- **Database**: Neon Serverless PostgreSQL (AWS Singapore)
- **Header Keamanan**: CSP `frame-ancestors *` untuk dukungan embedding di slide PowerPoint, Canva, & LMS.
