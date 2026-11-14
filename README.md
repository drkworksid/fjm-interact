# FJM InterAct - Real-time Audience Interaction Platform

**FJM InterAct** adalah platform interaksi pelatihan (*training*), rapat (*meeting*), dan seminar interaktif real-time milik **PT Fiqry Jaya Manunggal (FJM)**. Dirancang untuk memudahkan partisipasi peserta tanpa instalasi aplikasi (*zero-login* via scan QR code atau tautan langsung).

---

## 🚀 Fitur Utama FJM InterAct

### 1. Peserta Training (Mobile-First / Zero-Login) - `/[code]`
- **Akses Cepat & Zero Login**: Cukup buka tautan atau scan QR Code (contoh: `https://interact.buildshare.id/TRAIN26`). Tanpa download aplikasi atau registrasi akun.
- **Default Tab = Live Polling**: Saat peserta pertama kali membuka sesi, tab yang langsung terbuka adalah **Live Polling**, memudahkan peserta langsung berpartisipasi pada aktivitas interaktif.
- **Identitas Fleksibel**: Peserta bisa memilih tampil dengan nama atau **Anonim** (bisa diganti kapan saja).
- **Banner Pengumuman Real-time**: Notifikasi pengumuman dari trainer (banner amber dengan icon 📢) tampil langsung seketika di atas layar peserta.
- **Audience Q&A**:
  - Kirim pertanyaan dengan kategori topik (`Umum`, `Materi`, `Teknis`, `Manajemen`).
  - Upvote pertanyaan secara real-time; pertanyaan terpopuler otomatis naik ke atas.
  - Indikator khusus jika pertanyaan sedang disorot di panggung proyektor.
- **Interaksi Lengkap (Live Polling & Multi-Interaksi)**:
  1. **Pilihan Ganda (*Multiple Choice*)**: Dengan opsi lampiran gambar soal dan grafik persentase.
  2. **Kuis Interaktif (*Live Quiz*)**: Panggung kuis 3-tahap lengkap dengan podium juara 1, 2, 3 dan efek konfeti.
  3. **Word Cloud**: Input kata kunci dinamis.
  4. **Rating Skala 1–5**: Evaluasi cepat bintang pemahaman materi.
  5. **Teks Terbuka (*Open Text*)**: Jawaban esai/paragraf bebas dengan dukungan enter multi-baris.
  6. **Ide (*Ideas / Curah Gagasan*)**: Kirim ide inovasi, upvote gagasan sesama peserta, dan kategori topik.
  7. **Polling Peringkat (*Ranking Poll*)**: Urutkan prioritas pilihan via drag & drop atau tombol panah naik/turun.
  8. **Survei Multi-Pertanyaan (*Survey*)**: Kuesioner beruntun dengan progress bar, validasi wajib, dan autosave draft di peramban.

### 2. Layar Proyektor / Stage View - `/event/[code]/present`
- **Dioptimalkan untuk Resolusi 16:9 / Fullscreen** di proyektor panggung, Smart TV, atau Zoom screen sharing.
- **Analitik Visual Langsung untuk Survei**:
  - **Mode Sorotan Slide (*Spotlight Mode*)**: Fokus 1 pertanyaan per slide dengan navigasi panah keyboard `←` / `→`.
  - **Mode Rekap Semua (*All-in-One Grid Mode*)**: Seluruh analitik pertanyaan tampil dalam satu layar.
  - Grafik batang horizontal persentase pemilih, rata-rata skor bintang, dan dinding kutipan saran (*Feedback Wall*).
- **Panggung Kuis & Podium Juara**: Tampilan pertanyaan kuis, kunci jawaban, dan podium 3 besar juara.
- **Dukungan Embed Slide Presentasi**:
  - Siap di-embed langsung ke dalam slide **Microsoft PowerPoint** (via Add-in *Web Viewer*), Google Slides, atau Canva.
  - Deteksi embed otomatis: footer dan panel navigasi disederhanakan agar 100% bersih seperti slide presentasi bawaan.
- **Floating Navigation Bar Responsif**: Kontrol alur polling, prev/next, sembunyikan hasil, kunci polling, dan toggle Q&A langsung dari layar panggung.

### 3. Panel Kontrol & Moderasi Trainer - `/event/[code]/moderate`
- **Keamanan PIN Per Sesi**: Dilindungi 6 digit PIN khusus trainer sesi atau Master Admin PIN.
- **Tata Letak Mobile Fit-to-Screen**: Tampilan 100% pas dan proporsional di layar ponsel tanpa terpotong.
- **Moderasi Pertanyaan & Ide**:
  - Saklar moderasi aktif/non-aktif.
  - Moderasi ide: setujui (*publish*), tolak (*reject*), sematkan (*pin* teratas), edit, atau hapus.
- **Siarkan Pengumuman (Broadcast Announcement)**: 1-klik untuk menyiarkan pesan penting langsung ke seluruh HP peserta secara instan.
- **Dashboard Analitik Lengkap**:
  - Dashboard Polling Reguler.
  - Dashboard Ide Peserta.
  - Dashboard Polling Peringkat (Positional Average Scoring & Distribusi Peringkat).
  - Dashboard Survei (Completion Rate, rata-rata waktu pengerjaan, rekapitulasi jawaban).
- **Ekspor Data & Laporan**: Unduh rekapitulasi Q&A, Polling, Ide, Ranking, dan Survei ke format **Excel (.xlsx) / CSV**.

### 4. Dashboard Trainer & Admin - `/dashboard`
- **Dilindungi Master Admin PIN**: Kunci pengaman 6 angka (bawaan: `262626`).
- Kelola semua sesi training PT Fiqry Jaya Manunggal.
- Buat sesi training baru dengan penentuan PIN khusus trainer sesi tersebut.
- Kartu sesi menampilkan nomor PIN sesi dengan ikon gembok.
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

# 3. Jalankan server
npm run dev
# Atau cukup klik dua kali start-dev.bat di Windows
```

Buka di browser:
- **Halaman Utama FJM InterAct**: [http://localhost:3000](http://localhost:3000)
- **Dashboard Trainer FJM**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🧪 Pengujian Otomatis
```bash
# Menjalankan unit & integration test untuk fitur Ide, Ranking Poll, dan Survei
npx --yes tsx tests/interactions.test.ts
```

---

## 🌐 Deployment Cloud
- **Domain Kustom**: [https://interact.buildshare.id](https://interact.buildshare.id) (Cloudflare DNS + SSL + Vercel Production)
- **Hosting**: Vercel Serverless ([https://fjm-interact.vercel.app](https://fjm-interact.vercel.app))
- **Database**: Neon Serverless PostgreSQL (AWS Singapore)
- **Header Keamanan**: CSP `frame-ancestors *` untuk dukungan embedding di slide PowerPoint, Canva, & LMS.
