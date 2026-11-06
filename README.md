# Slido Training - Real-time Audience Interaction Platform

Aplikasi interaksi pelatihan (*training*) dan *meeting* interaktif real-time seperti Slido, dirancang untuk memudahkan partisipasi peserta tanpa instalasi aplikasi (*zero-login* via scan QR code atau tautan langsung).

---

## 🚀 Fitur Utama yang Sudah Diimplementasikan

### 1. Peserta Training (Mobile-First / Zero-Login) - `/[code]`
- **Akses Cepat**: Cukup buka tautan atau scan QR Code (contoh: `http://localhost:3000/TRAIN26`).
- **Zero Login**: Peserta tidak perlu membuat akun atau install aplikasi.
- **Identitas Fleksibel**: Peserta bisa memilih tampil dengan nama atau **Anonim** (bisa diganti kapan saja).
- **Audience Q&A**:
  - Kirim pertanyaan dengan batas karakter.
  - Upvote pertanyaan secara real-time.
  - Sortir pertanyaan: *Terpopuler (Upvotes)* atau *Terbaru*.
  - Indikator khusus jika pertanyaan sedang dibahas di layar proyektor.
- **Live Polling**:
  - Pilihan Ganda (*Multiple Choice*) dengan persentase suara langsung.
  - *Word Cloud* dinamis (input kata kunci).
  - *Rating* skala 1-5 bintang pemahaman materi.
  - Sinkronisasi otomatis saat trainer mengganti polling.

### 2. Layar Proyektor / Stage View - `/event/[code]/present`
- Dioptimalkan untuk resolusi 16:9 / Fullscreen di proyektor, Smart TV, atau Zoom screen sharing.
- Menampilkan QR Code dan kode event di pojok kanan atas secara konstan.
- **Mode Spotlight / Highlight**: Saat trainer menyorot pertanyaan, panggung otomatis menampilkan pertanyaan tersebut dalam tipografi besar dan jelas.
- **Grafik Polling Real-time**: Animasi transisi bar persentase dan Word Cloud yang dinamis seiring suara masuk.

### 3. Panel Kontrol & Moderasi Trainer - `/event/[code]/moderate`
- **Moderasi Pertanyaan**:
  - Saklar moderasi aktif/non-aktif.
  - Filter: *Semua*, *Perlu Review (Pending)*, *Tampil*, dan *Selesai Terjawab*.
  - Aksi 1-klik: **Sorot ke Layar (Highlight)**, **Setujui**, **Tolak**, **Tandai Terjawab**, dan **Hapus**.
- **Kontrol Live Polling**:
  - Pembuat polling baru (Pilihan Ganda, Word Cloud, Rating).
  - Tombol **Luncurkan ke Peserta** (1-klik langsung mengalihkan layar peserta & proyektor).
  - Saklar tampilkan/sembunyikan hasil ke peserta.
- **Pengaturan & Unduh QR Code**:
  - Unduh gambar QR Code (PNG) untuk ditempel di slide materi presentasi / PPT.

### 4. Dashboard Trainer - `/dashboard`
- Kelola semua sesi training.
- Buat sesi training baru dengan kode kustom (misal: `#LEAD2026`).
- Pintasan langsung ke Layar Proyektor, Panel Kontrol, dan Tampilan Peserta.

---

## 🛠️ Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js (v18+)

### Langkah Menjalankan:
```bash
# 1. Pastikan dependensi terpasang
npm install

# 2. Sinkronisasi database SQLite lokal
npm run db:push

# 3. Seed data contoh (Opsional, untuk mencoba demo event #TRAIN26)
node prisma/seed.js

# 4. Jalankan server (Next.js + WebSocket Socket.io)
npm run dev
```

Buka di browser:
- **Halaman Utama**: [http://localhost:3000](http://localhost:3000)
- **Sesi Demo Peserta**: [http://localhost:3000/TRAIN26](http://localhost:3000/TRAIN26)
- **Layar Proyektor Demo**: [http://localhost:3000/event/TRAIN26/present](http://localhost:3000/event/TRAIN26/present)
- **Panel Trainer Demo**: [http://localhost:3000/event/TRAIN26/moderate](http://localhost:3000/event/TRAIN26/moderate)
- **Dashboard Trainer**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🌐 Panduan Deployment ke Cloud / VPS

Aplikasi ini sudah *production-ready* dan dapat dideploy ke VPS Ubuntu / Debian / Cloud mana pun menggunakan Node.js, PM2, atau Docker:

### Opsi A: Deployment dengan PM2 & Nginx (VPS Ubuntu)

```bash
# 1. Di server VPS Anda, clone repository
git clone <url-repo> /var/www/slido-app
cd /var/www/slido-app

# 2. Install dependensi & build
npm install
npx prisma db push
npm run build

# 3. Jalankan aplikasi di background dengan PM2
npm install -g pm2
pm2 start server.js --name "slido-training"
pm2 save
pm2 startup
```

### Konfigurasi Nginx Reverse Proxy (dengan WebSocket Support)
```nginx
server {
    listen 80;
    server_name training.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Opsi B: Deployment dengan Docker & Docker Compose
Cukup jalankan:
```bash
docker compose up -d --build
```
Aplikasi akan langsung aktif di port `3000`.
