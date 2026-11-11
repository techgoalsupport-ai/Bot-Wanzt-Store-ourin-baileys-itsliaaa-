# Jadwal & Perencanaan Proyek (schedule.md)

Dokumen ini mencatat rencana kerja, roadmap fitur, target tonggak pencapaian (*milestones*), dan penjadwalan integrasi sistem untuk proyek **WhatsApp Bot Store Manager & Dashboard**.

---

## 🗺️ Roadmap & Rencana Pengembangan

### 1. Rencana Integrasi Payment Gateway SairiPedia & Xaviera (Privacy-First Flow)
- **Status Rencana**: Selesai Diimplementasikan (Completed) - Form API Sairi aktif di Tab Connection & Alur Transaksi Privacy-First berjalan otomatis.
- **Alur Transaksi yang Direncanakan (User Requirement)**:
  1. **Trigger Pembelian di Grup**: Pembeli melakukan interaksi pemesanan melalui grup WhatsApp (`@g.us`).
  2. **Kirim Carousel Varian**: Bot merespon di grup dengan menampilkan kartu horizontal carousel varian produk yang dipilih.
  3. **Pemilihan Varian & Klik Order**: Pembeli memilih varian dan menekan tombol Order pada kartu varian.
  4. **Pre-check Saldo Utama Xaviera**: Bot memeriksa apakah saldo akun utama di API Xaviera mencukupi untuk memproses varian tersebut ke supplier.
  5. **Pengiriman Invoice QRIS ke Chat Pribadi (DM)**:
     - Jika saldo Xaviera cukup, bot membuat invoice QRIS via SairiPedia API (`/api/invoice`).
     - Bot mengirimkan invoice lengkap (gambar QRIS, Invoice ID, Amount, Fee, Total, dan Waktu Kedaluwarsa) **secara pribadi (DM/PM) ke nomor pembeli**, BUKAN di grup.
     - Di grup, bot hanya mengirimkan notifikasi singkat bahwa invoice telah dikirim ke chat pribadi pembeli.
  6. **Pembayaran oleh Pembeli**: Pembeli melakukan scan dan pembayaran QRIS.
  7. **Validasi & Polling Pembayaran**: Bot melakukan validasi status pembayaran ke API SairiPedia (`/api/invoice/status`) tiap 4 detik.
  8. **Request Pemesanan ke Xaviera**: Setelah pembayaran lunas (`paid`), bot memproses order ke supplier.
  9. **Pengiriman Detail Produk Sensitif via DM**: Bot mengirimkan output produk (seperti akun APK Premium: email, password, profil, panduan) **secara ketat melalui chat pribadi pembeli** agar kredensial rahasia tidak bocor ke publik grup.

### 3. Rencana Arsitektur Headless Backend (Pure Node.js Bot Tanpa Dashboard)
- **Status Rencana**: Tahap Diskusi / Rencana Masa Depan (Rencana Awal).
- **Latar Belakang & Analisis**:
  - Pengguna merencanakan opsi mengubah bot menjadi murni backend (*headless*) tanpa dashboard web GUI React.
  - **Kelayakan Teknis**: **100% Sangat Bisa & Sangat Layak**. Semua fungsi bot WhatsApp (koneksi Baileys, scan QR/pairing code via terminal CLI, penerimaan pesan/event listener, pengiriman kartu Carousel/Native Flow buttons, auto order ke supplier Xaviera, polling/webhook payment gateway LunasQRIS/Sairi, dan pengiriman kredensial akun via DM) dieksekusi 100% oleh runtime Node.js di server. Frontend React/Vite selama ini hanyalah lapisan visual (UI) untuk monitoring dan konfigurasi.
  - **Keuntungan Headless**:
    - Konsumsi RAM dan CPU di VPS jauh lebih hemat (tidak perlu menjalankan Vite build/dev server web).
    - Proses deployment lebih ringkas (cukup dijalankan dengan `pm2 start index.js`).
    - Stabilitas lebih tinggi karena tidak ada risiko desinkronisasi antara state React dan memori backend.
- **Rekomendasi Peletakan API Key & Secret Key**:
  1. **Kredensial Sensitif & Rahasia (`.env`)**:
     - Tempat: File `.env` di root folder (dibaca menggunakan modul bawaan Node.js `process.env` atau `dotenv`).
     - Komponen:
       - `LUNASQRIS_API_KEY=pk_live_...`
       - `LUNASQRIS_SECRET_KEY=sk_live_...`
       - `XAVIERA_API_KEY=...`
       - `XAVIERA_SECRET_KEY=...`
       - `BOT_PHONE_NUMBER=628...`
       - `PORT=3000` (untuk webhook receiver jika menggunakan webhook)
     - Alasan: File `.env` dimasukkan ke `.gitignore` agar tidak pernah ter-push ke GitHub publik, aman dari kebocoran kredensial, dan menjadi standar industri di lingkungan VPS/server production.
  2. **Konfigurasi Operasional Toko (`config.json` atau `data/settings.json`)**:
     - Komponen: Margin keuntungan (markup persen/nominal), teks template pesan, daftar ID grup yang diizinkan (whitelist), auto-reply switcher, durasi timeout invoice QRIS.
     - Alasan: Bisa diedit sewaktu-waktu atau diperbarui via perintah chat bot WhatsApp (misal perintah admin: `!setmargin 10%`) tanpa harus me-restart proses bot di VPS (*hot-reloading*).

### 4. Rencana & Panduan Deployment VPS (IP: 139.59.97.50)
- **Status Rencana**: Tahap Perencanaan & Panduan Deployment Siap Pakai.
- **Tujuan**: Memasang dan menjalankan WhatsApp Bot Store & Dashboard Wanzt Store secara persisten 24/7 di VPS Ubuntu/Debian pengguna (`139.59.97.50`).
- **Arsitektur Produksi di VPS**:
  1. **Runtime Node.js 20 LTS**: Menjalankan engine Baileys, Express/Vite middleware, dan handler LunasQRIS/Xaviera.
  2. **Process Manager (PM2)**: Menjaga bot tetap aktif 24 jam non-stop, otomatis restart jika terjadi crash, dan otomatis aktif kembali saat VPS reboot (`pm2 startup`).
  3. **Web Server & Reverse Proxy (Nginx)**: Meneruskan lalu lintas HTTP/HTTPS dari IP atau custom domain ke port 3000, serta menangani WebSocket upgrade.
  4. **Keamanan & SSL (Let's Encrypt / Certbot)**: Mengamankan endpoint webhook LunasQRIS (`https://domain.com/api/lunasqris/webhook`) dengan sertifikat SSL gratis.
  5. **Firewall (UFW)**: Mengamankan port server (hanya membuka SSH 22, HTTP 80, HTTPS 443, dan port 3000).
- **Alasan Teknis AI Tidak Masuk SSH Langsung**:
  - Lingkungan cloud sandbox AI Studio tidak memiliki terminal SSH interaktif keluar (*outbound interactive TTY*) untuk mengontrol server privat pihak ketiga.
  - Sesuai standar keamanan industri (*DevOps Best Practice*), hak akses root dan SSH ke server produksi wajib dikontrol secara mandiri oleh pemilik server melalui terminal pribadi (PuTTY / Termius / PowerShell / Terminal Mac-Linux) guna mencegah risiko *accidental lockout* atau kebocoran akses.
  - Untuk mempermudah pengguna, disediakan **Skrip Otomasi 1-Baris (`deploy-vps.sh`)** dan panduan langkah demi langkah yang tinggal di-*copy-paste*.

---

## 📅 Log Perencanaan Diskusi
Setiap ada ide rencana baru dari hasil diskusi atau instruksi pengguna, daftarkan ke tabel perencanaan di bawah ini:

| Tanggal | Topik Perencanaan | Rincian Rencana | Target Penyelesaian | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-10-23 | Integrasi Payment Gateway QRIS | Menerapkan integrasi pembayaran otomatis via SairiPedia API | Tahap Diskusi | Selesai |
| 2026-10-23 | Alur Transaksi Privasi Grup ke DM | Alur beli di grup -> invoice QRIS ke DM -> cek saldo Xaviera -> order Xaviera -> kredensial rahasia dikirim via DM | Perencanaan Alur | Selesai |
| 2026-10-24 | Form API Sairi di Tab Connection | Menambahkan form input API Key & Base URL Sairi pada Tab Connection bersama API Xaviera | Implementasi | Selesai |
| 2026-10-24 | Restorasi Tampilan & Data Tab Produk | Menyesuaikan tabel Tab Produk 100% presisi dengan tangkapan layar asli & unrolling varian API | Tahap 1 | Selesai |
| 2026-10-23 | Standarisasi File Dokumentasi | Menerapkan 4 pilar file `idea.md`, `progress.md`, `langkah_implementasi.md`, `schedule.md` | Selesai | Aktif |
| 2026-10-26 | Studi & Rencana Migrasi ke LunasQRIS | Mempelajari dokumentasi resmi LunasQRIS API (lunasqris.com/docs), komparasi dengan Sairi, dan perumusan arsitektur implementasi | Tahap Diskusi & Review | Selesai |
| 2026-10-26 | Konsep Headless Backend & Struktur Key | Evaluasi arsitektur headless (tanpa dashboard), verifikasi fitur Carousel & alur bot tetap jalan, rekomendasi struktur `.env` dan `config.json` | Tahap Diskusi & Review | Selesai Dicatat |
| 2026-10-26 | Implementasi Penuh LunasQRIS | Migrasi penuh payment gateway dari Sairi ke LunasQRIS (Dual-Key Auth, Dynamic QRIS + Kode Unik, Polling & Webhook HMAC-SHA256, Tab Connection UI) | Implementasi | Selesai Diimplementasikan |
| 2026-10-26 | Deployment ke VPS 139.59.97.50 | Panduan remote SSH, skrip otomasi `deploy-vps.sh`, instalasi Node.js 20, PM2, konfigurasi Nginx reverse proxy, dan setup webhook domain | Panduan & Skrip | Siap Diterapkan |


| 2026-10-27 | Command Invoice Dinamis & Tombol Interaktif | Menambahkan command Invoice pada Tab Command, template teks invoice kustom, dukungan placeholder ({storeName}, {ownerNumber}, {category}, {varian}, {price}, {produkName}, {adminNumber}, {webLink}, {orderId}, {total}, {unikCode}), tombol Quick Reply vCard (Admin/fallback Owner), dan tombol CTA URL Web Checkout | Tahap Implementasi | Selesai Diimplementasikan |
| 2026-10-27 | Migrasi Database ke SQLite (`better-sqlite3`) | Menggantikan file JSON lokal dengan SQLite database (`database/bot.db`) untuk transaksi & konfigurasi, mendukung ACID, zero-config untuk skrip siap jual, bebas biaya pihak ketiga | Roadmap Masa Depan | Terjadwal (Scheduled) |
| 2026-10-27 | Halaman Login Aman & Lock Wajib Store Info | Pembuatan sistem otentikasi login berbasis server (zero inspect leak), hashing aman, proteksi lock bot tanpa store info, dan pop-up modal wajib isi store info (non-dismissible) | Tahap Diskusi & Review | Menunggu Konfirmasi Eksekusi |

### 5. Rencana Command Invoice Dinamis & Pesan Interaktif Bot
- **Status Rencana**: Selesai Diimplementasikan (Completed).
- **Latar Belakang**: Memungkinkan pemilik toko mengatur sendiri teks invoice tagihan pembayaran QRIS melalui dashboard di Tab Command opsi "Invoice", tanpa perlu mengubah kode sumber.
- **Rincian Komponen**:
  1. **Opsi Command**: Menambahkan `'Invoice'` pada dropdown pilih command di Tab Command (`Menu`, `List`, `Carousel`, `Invoice`).
  2. **Template Teks & Footer**: Mengatur teks pesan invoice dengan tombol sisipkan placeholder dinamis dan form teks footer.
  3. **Placeholder Toko & Produk**: `{storeName}`, `{ownerNumber}`, `{category}`, `{varian}`, `{price}`, `{produkName}`, `{adminNumber}`, `{webLink}`.
  4. **Placeholder Transaksi Spesifik**:
     - `{orderId}`: ID pesanan unik (misal: `ORD-M5X91A-8821`).
     - `{total}`: Total pembayaran lunas presisi (harga jual + kode unik).
     - `{unikCode}`: Nominal kode unik / fee gateway.
  5. **Dua Tombol Interaktif Pesan Invoice**:
     - **Tombol 1 (Quick Reply - Hubungi Admin)**: Mengirimkan vCard kontak WhatsApp nomor admin toko. Jika form nomor admin kosong, otomatis fallback mengirimkan vCard nomor owner toko.
     - **Tombol 2 (CTA URL - Web Checkout)**: Tombol link langsung mengarahkan pembeli ke URL pembayaran web checkout LunasQRIS (`payment_url`).

### 6. Rencana Migrasi Database ke SQLite (`better-sqlite3`)
- **Status Rencana**: Terjadwal (Scheduled) - Tidak dieksekusi sekarang sesuai arahan pengguna.
- **Latar Belakang & Tujuan**:
  - Menggantikan sistem penyimpanan flat-file JSON lokal (`database/*.json`) dengan database relasional SQLite file tunggal (`database/bot.db`).
  - Menyiapkan arsitektur database yang tangguh, aman, dan *zero-configuration* untuk produk script bot yang siap dijual ke publik.
- **Keunggulan untuk Script yang Dijual**:
  1. **Zero-Configuration (Plug & Play)**: Pembeli script tidak perlu install service database eksternal (MySQL/Postgres) di VPS. Cukup jalankan bot, file database `.db` akan terbuat secara otomatis.
  2. **Bebas Ketergantungan Cloud & Biaya Bulanan**: Menghindari Firebase/Supabase yang merepotkan pembeli script (harus daftar akun, pasang API keys, dan risiko biaya kuota).
  3. **Keamanan Transaksi Bersamaan (ACID & WAL Mode)**: Mencegah risiko file corrupt saat banyak pesanan masuk di detik yang sama melalui mekanisme transaksi database yang solid.
  4. **Kemudahan Backup & Migrasi**: Pembeli script cukup mencadangkan satu file `bot.db` untuk menyimpan seluruh riwayat transaksi dan pengaturan toko.
  5. **Query Cepat & Fleksibel**: Mendukung query SQL lengkap untuk pagination riwayat transaksi, pencarian, dan rekap keuangan bulanan.
- **Rencana Skema Tabel**:
  - `transactions`: ID transaksi, order_id, customer_number, customer_name, product_name, variant_name, nominal, fee_gateway, total, payment_url, status (`pending`, `paid`, `cancel`), created_at, updated_at.
  - `store_config`: Pengaturan profil toko (nama store, owner, admin, web link).
  - `command_templates`: Template teks & footer dinamis untuk menu, list, carousel, dan invoice.
  - `api_config`: Kredensial API LunasQRIS dan Xaviera.

---

## 🚀 Roadmap Resmi Selanjutnya (Kesepakatan Produk)

Berikut adalah urutan roadmap bertahap yang telah disepakati untuk pengembangan selanjutnya:

### 1. Tahap 1 (Fokus Besok): Pengaturan Harga, Diskon & Kode Promo
- **Fitur Pengaturan Margin/Markup Harga Jual:** Pengaturan margin laba fleksibel (persentase atau nominal rupiah) per kategori atau per produk.
- **Sistem Diskon:** Diskon global atau khusus produk tertentu (dalam bentuk Rupiah `Rp` atau Persentase `%`).
- **Sistem Kode Promo / Kupon:** Pembuatan kode voucher (misal: `HEMAT10`, `DISKONMERDEKA`), kuota penggunaan, potongan harga, dan validasi otomatis saat pembeli memasukkan kode di chat WhatsApp.

### 2. Tahap 2: Rombak Total Tampilan Dashboard (Anti AI-Slop & Desain Modern)
- **Tujuan:** Desain ulang antarmuka dashboard agar tampil sangat premium, profesional, elegan, dan bersih dari kesan "AI Slop".
- **Prinsip Utama:** Menjaga 100% fungsionalitas yang ada tanpa menghilangkan satu pun fitur (koneksi WhatsApp, pairing code, grup whitelist, tab produk, SMM, Top Up, dan LunasQRIS).
- **Peningkatan:** Tipografi tegas, kontras warna yang nyaman di mata, transisi mikro yang halus, dan tata letak informasi yang lebih ergonomis.

### 3. Tahap 0: Migrasi Database ke SQLite & Pembersihan Workspace [SELESAI (COMPLETED)]
- **Status:** Selesai Diimplementasikan (100% Berhasil)
- **Implementasi:**
  - Database file tunggal di `database/bot.db` dengan mode WAL (*Write-Ahead Logging*).
  - Skema tabel relasional: `auth`, `store_info`, `api_config`, `commands_config`, `group_whitelist`, `transactions`.
  - Auto-migrasi otomatis dari file JSON lama tanpa kehilangan data sepeserpun.
  - Seluruh service backend (`authManager`, `configManager`, `groupService`, `transactionManager`) terhubung murni ke SQLite.
  - Pembersihan file usang di root folder: menghapus duplikat file `DESIGN (2).md`, `PROGRESS.md`, `Promt.md`, `commands_config.json`, dan folder duplikat `/server`. Seluruh dokumentasi terpusat di `/brain/`.

### 4. Tahap Selanjutnya 1: Pengaturan Harga Produk (Markup Rp & %), Diskon & Kode Promo
- **Fitur "Set Harga Produk" (SELESAI / COMPLETED):**
  - Panel form "Set Harga Produk" berada di posisi paling atas tab Produk.
  - Form input angka nominal/persentase dengan tombol toggle di samping kolom untuk berganti mode antara `Rp` dan `%`.
  - Logika perhitungan dinamis:
    - Mode `Rp`: Harga Jual = Harga Asli + Angka (misal: Rp 10.000 + 100 = Rp 10.100).
    - Mode `%`: Harga Jual = Harga Asli + (Harga Asli * Angka / 100) (misal: Rp 10.000 + 10% = Rp 11.000).
  - Terintegrasi penuh ke database SQLite (`bot.db` tabel `pricing_config`) dan sinkron ke bot WhatsApp (pesan carousel & checkout invoice QRIS).
  - Tampilan tabel produk otomatis menampilkan Harga Asli modal supplier, Harga Jual terhitung, dan badge margin laba.
- **Sistem Diskon (Next Sub-step):** Diskon global atau khusus produk tertentu (dalam bentuk Rupiah `Rp` atau Persentase `%`).
- **Sistem Kode Promo / Kupon (Next Sub-step):** Pembuatan kode voucher (misal: `HEMAT10`, `DISKONMERDEKA`), kuota penggunaan, potongan harga, dan validasi otomatis saat pembeli memasukkan kode di chat WhatsApp.

### 5. Tahap Selanjutnya 2: Rombak Total Tampilan Dashboard (Anti AI-Slop & Desain Modern)
- **Tujuan:** Desain ulang antarmuka dashboard agar tampil sangat premium, profesional, elegan, dan bersih dari kesan "AI Slop".
- **Prinsip Utama:** Menjaga 100% fungsionalitas yang ada tanpa menghilangkan satu pun fitur.

### 6. Tahap Selanjutnya 3: Auto-Order Layanan SMM & Top Up Game
- **Tujuan:** Mengembangkan alur order otomatis untuk kategori SMM (Followers, Likes, Views) dan Top Up Game langsung ke supplier Xaviera Store via WhatsApp, melengkapi fitur APK Premium yang sudah aktif saat ini.

### 7. Tahap Selanjutnya 4: "Fitur Apartemen" (Multi-Tenant & Master Admin Dashboard)
- **Dashboard Master / Super Admin (`/dashboard/adminutama`):**
  - Panel kontrol khusus pemilik (Owner).
  - Manajemen akun penyewa: Buat akun baru, atur durasi sewa, perpanjang masa sewa, dan tombol suspend/hapus akun.
- **Penyewa (Tenant) Dashboard:**
  - Login mandiri untuk tiap penyewa bot.
  - Setiap penyewa mendapatkan bot WhatsApp mereka sendiri (*multi-session Baileys*).

### 8. Tahap Selanjutnya 5: Fitur AI (Smart Customer Support & Auto-Reply)
- **Tujuan:** Mengintegrasikan `@google/genai` untuk asisten CS cerdas yang memahami pertanyaan pembeli santai di WhatsApp dan otomatis merekomendasikan produk relevan.




---

[2.0] - PERBAIKAN FORMATTING PESAN BOT WHATSAPP (VCARD, COMMAND LIST, DAN CAROUSEL)

- Tanggal: 2026-11-01 18:55
- Status: Completed

Tujuan:
Menyelesaikan 3 permasalahan teknis terkait formatting respon bot WhatsApp:
1. Normalisasi otomatis nomor telepon admin/owner (+62) pada vCard.
2. Penyesuaian output teks command List agar 100% menghormati template kustom pengguna tanpa teks hardcode atau pemaksaan daftar produk.
3. Penyesuaian header kartu Carousel agar nama varian dan kategori tidak muncul mendahului template teks pengguna.

Rencana:
1. Menyiapkan catatan implementasi lengkap di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Membuat fungsi pembantu normalisasi nomor telepon Indonesia di backend.
3. Memperbaiki penyusunan vCard di `/backend/messages/adminContactMessage.ts` untuk owner, admin, dan invoice admin.
4. Memperbaiki logika `listMessage.ts` agar tidak memaksakan `{daftarProduk}`, teks instruksi, dan title hardcode.
5. Memperbaiki `cardHeader` di `/backend/messages/carouselMessage.ts` agar `title` dan `subtitle` tidak menimpa bagian atas template teks pengguna.
6. Menguji kompilasi dengan `compile_applet` dan mencatat hasil di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Seluruh respon bot WhatsApp tampil rapi, konsisten, dan 100% sesuai dengan konfigurasi yang diatur pengguna di dashboard.

---

[3.0] - PEMBERSIHAN FILE DATABASE JSON USANG PASCA MIGRASI SQLITE

- Tanggal: 2026-11-01 19:16
- Status: Completed

Tujuan:
Menghapus seluruh file database `.json` usang pada folder `/database/` dan `/backend/database/` yang sudah tidak lagi digunakan setelah migrasi penuh ke SQLite (`bot.db`).

Rencana:
1. Menyiapkan catatan implementasi teknis di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Menghapus file JSON usang di `/database/` (`api_config.json`, `command_carousel.json`, `command_invoice.json`, `command_list.json`, `command_menu.json`, `groups_config.json`, `store_info.json`, `transactions.json`).
3. Menghapus file JSON usang di `/backend/database/` (`api_config.json`, `auth.json`, `command_carousel.json`, `command_invoice.json`, `command_list.json`, `command_menu.json`, `groups_config.json`, `store_info.json`, `transactions.json`).
4. Memastikan file aktif tetap utuh: `/backend/database/sqlite.ts` dan `/database/bot.db` (beserta WAL file).
5. Membersihkan unused export konstanta `CONFIG_FILE` di `backend/types/bot.types.ts` dan import di `backend/config/configManager.ts`.
6. Melakukan verifikasi kompilasi dan linting (`compile_applet` dan `lint_applet`).
7. Mencatat hasil akhir di `brain/PROGRESS.md` dan memperbarui status rencana.

Hasil yang Diharapkan:
Folder database rapi dan bersih dari artefak legacy tanpa mempengaruhi integritas data dan fungsionalitas aplikasi.

---

[4.0] - PERANCANGAN ALUR CHECKOUT BOT DENGAN DUKUNGAN KODE PROMO

- Tanggal: 2026-11-01 21:45
- Status: Planned (Disepakati & Disimpan)

Tujuan:
Menerapkan alur checkout interaktif berbasis sesi di Chat Pribadi (DM) WhatsApp agar pelanggan dapat memanfaatkan kupon diskon/kode promo sebelum invoice QRIS diterbitkan, tanpa menghambat pembeli yang ingin langsung membayar dengan harga normal.

Rencana yang Disepakati (Opsi 1):
1. **Trigger Order**: Pelanggan menekan tombol `Order` pada kartu Carousel di Grup atau DM.
2. **Notifikasi Grup**: Jika order dipicu di grup, bot merespon dengan pemberitahuan singkat bahwa konfirmasi pesanan telah dikirim ke DM pelanggan (menjaga privasi).
3. **Pesan Ringkasan di DM**: Bot mengirimkan rincian pesanan (Nama Produk, Varian, Harga Normal) disertai 2 Tombol Interaktif Native Flow:
   - Tombol 1: `[🎟️ Pakai Kode Promo]`
   - Tombol 2: `[⚡ Lanjut Bayar (Normal)]`
4. **Sesi Input Kode Promo**:
   - Jika pembeli memilih `[🎟️ Pakai Kode Promo]`, bot membuka sesi tunggu selama **1 menit 30 detik (90 detik)**.
   - Pembeli mengetik kode promo di DM.
   - Bot memvalidasi kode promo menggunakan `validateAndApplyPromo()` di SQLite (memeriksa masa aktif, kuota, kesesuaian varian, minimal transaksi, dan proteksi margin agar tidak memotong modal dasar supplier).
   - Jika valid: Bot menampilkan rincian potongan diskon lalu membuat invoice QRIS LunasQRIS dengan nominal hemat.
   - Jika tidak valid / timeout: Bot memberi pesan penjelasan dan opsi coba lagi atau lanjut bayar normal.
5. **Bayar Langsung**:
   - Jika pembeli memilih `[⚡ Lanjut Bayar (Normal)]` atau sesi timeout, bot langsung menerbitkan invoice QRIS harga normal.

Hasil yang Diharapkan:
Alur checkout berjalan interaktif, fleksibel, ramah pengguna, aman dari segi privasi kode kupon di grup, dan siap dieksekusi kapan pun pengguna menginstruksikan.

---

[5.0] - PERSIAPAN & IMPLEMENTASI FITUR APARTEMEN (MULTI-TENANT & PORTAL MASTER ADMIN)

- Tanggal: 2026-11-01 19:39
- Status: In Progress

Tujuan:
Mempersiapkan dan mengimplementasikan arsitektur "Fitur Apartemen" (Multi-Tenant & Master Admin Dashboard) agar platform bot WhatsApp dapat menyewakan unit-unit bot ke berbagai pemilik toko/penyewa secara terisolasi, terukur, dan aman.

Rencana:
1. Skema Database SQLite untuk Apartemen:
   - Tabel `tenants`: Menyimpan identitas unit, nama toko, username, hash password, salt, no WA penyewa, paket langganan, durasi hari, tanggal mulai, tanggal kedaluwarsa, status (`active`, `expired`, `suspended`), dan kuota grup.
   - Tabel `master_admin`: Kredensial akun Super Admin pengelola apartemen dengan salt & hash PBKDF2 aman.
   - Migrasi dan inisialisasi unit awal (Unit 101 - Wanzt Store) agar kompatibel dengan data yang ada.
2. Backend Apartemen (Service & API Routes):
   - `backend/services/apartmentManager.ts`: Mengelola validasi status sewa (auto-expire check), CRUD unit tenant, perpanjangan masa sewa, suspensi, dan autentikasi master admin.
   - `backend/routes/apartmentRoutes.ts`: Endpoint terproteksi untuk master admin login, ambil daftar unit, tambah unit baru, perpanjang masa sewa, toggle suspend, reset password, dan statistik.
   - Sambungkan route ke `backend/app.ts` (`/api/apartment/*`).
3. Frontend Master Admin Dashboard ("Portal Apartemen / Kelola Gedung"):
   - Komponen `src/components/apartment/MasterAdminApartmentPanel.tsx` dan `src/components/apartment/MasterAdminLoginModal.tsx`.
   - Akses mudah via URL `/adminutama` atau tombol "Portal Apartemen" pada navbar/login page.
   - Desain UI Anti-AI Slop:
     - 4 Kartu Metrik Apartemen: Total Unit, Unit Aktif, Unit Kedaluwarsa, Unit Suspended.
     - Tabel daftar unit apartemen dengan rincian: No Unit, Nama Toko/Penyewa, Username, Kontak WhatsApp, Paket, Masa Berlaku, Sisa Hari, dan Status.
     - Modal Tambah Unit Apartemen Baru dengan pilihan durasi (30, 60, 90, 365 hari atau custom).
     - Modal Perpanjang Masa Sewa (+7 hari, +30 hari, +90 hari, +1 tahun).
     - Tombol Aksi Cepat: Suspend/Aktifkan, Reset Password, Hapus Unit.
4. Tenant Banner & Layar Masa Sewa:
   - Banner indikator status masa sewa pada header dashboard penyewa (menampilkan sisa hari sewa).
   - Layar kunci ramah jika status sewa expired atau suspended, memandu penyewa menghubungi Admin Utama.
5. Verifikasi:
   - Uji kompilasi dengan `compile_applet`.
   - Uji linting dengan `lint_applet`.
   - Dokumentasi lengkap di `brain/LANGKAH_IMPLEMENTASI.md` dan `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Platform memiliki sistem manajemen multi-tenant apartemen yang siap pakai, aman, dan mudah dikelola langsung oleh Master Admin tanpa perlu menyentuh database manual.

---

[6.0] - IMPLEMENTASI TAHAP 4: ARSITEKTUR MONOREPO, MULTI-DOMAIN, DAN DATABASE-PER-TENANT

- Tanggal: 2026-11-01 23:48
- Status: Planned

Tujuan:
Menerapkan arsitektur lengkap Tahap 4 (Fitur Apartemen Multi-Tenant) sesuai hasil kesepakatan:
1. Pemisahan folder: `admin-frontend/` & `admin-backend/` (untuk Master Admin) terpisah dari `frontend/` & `backend/` (untuk Toko Pengguna).
2. Routing multi-domain: `admin.wanma2.my.id` ➔ `admin-frontend/`, `dashboard.wanma2.my.id` ➔ `frontend/` (didukung di development mode via path `/admin` dan deteksi hostname).
3. Database-per-Tenant: `database/master.db` (Master DB) + `database/tenants/{tenant_id}.db` (Tenant DBs).
4. Multi-Session Baileys Bot Manager: Setiap tenant memiliki sesi bot independen di `auth_info_baileys/tenant_{tenant_id}/`.
5. Fitur Lengkap Master Admin: CRUD tenant, perpanjang sewa, suspend/activate, impersonation (1-klik buka toko tenant), kontrol restart/reset bot, dan statistik platform.

Rencana:
1. Menyiapkan database `database/master.db` dan `admin-backend/database/masterSqlite.ts`.
2. Menyiapkan database dinamis per-tenant di `backend/database/tenantDbManager.ts`.
3. Menyiapkan service dan router Master Admin di `admin-backend/`.
4. Mengembangkan multi-session Baileys manager di `backend/services/multiBotManager.ts`.
5. Membangun UI Dashboard Master Admin di `admin-frontend/` (React + Tailwind + Lucide).
6. Mengonfigurasi `server.ts` untuk melayani dua aplikasi (admin & tenant) berdasarkan hostname / path `/admin`.
7. Menguji kompilasi dan linting, serta mencatat kemajuan di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Sistem multi-tenant apartemen beroperasi penuh dengan isolasi database, sesi bot, dan antarmuka mandiri.

---

[7.0] - PERBAIKAN TOMBOL AKSI MANAJEMEN TENANT DI DASHBOARD ADMIN (MODAL KONFIRMASI IN-APP)

- Tanggal: 2026-11-02 02:49
- Status: Completed

Tujuan:
Memperbaiki tombol aksi pada tabel tenant Master Admin (`button:nth-of-type(4)` / tombol Hapus Tenant dan tombol Suspend/Aktifkan) agar dapat diklik dan berfungsi 100% tanpa terhambat oleh kebijakan blokir `window.confirm()` di browser sandbox iframe.

Rencana:
1. Menyiapkan dokumentasi langkah implementasi di `brain/LANGKAH_IMPLEMENTASI.md` (entri [8.0]).
2. Menghapus pemanggilan `window.confirm(...)` pada `handleDeleteTenant` dan `handleToggleStatus` di `admin-frontend/src/App.tsx`.
3. Menambahkan state modal konfirmasi hapus `tenantToDelete: Tenant | null` dan modal konfirmasi toggle status `tenantToToggleStatus: Tenant | null`.
4. Merancang komponen Modal Konfirmasi Hapus Tenant yang aman, informatif, dan responsif dengan peringatan penghapusan database dan sesi WhatsApp.
5. Memastikan semua tombol aksi pada tabel memiliki `type="button"`, `cursor-pointer`, dan visual feedback klik yang jelas.
6. Menguji kompilasi dan linting (`compile_applet`, `lint_applet`), lalu mencatat penyelesaian di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Seluruh tombol aksi manajemen (termasuk tombol Hapus ke-4) dapat diklik secara responsif, memunculkan modal dialog konfirmasi in-app yang elegan, dan menjalankan proses penghapusan/perubahan status dengan lancar.

---

[8.0] - PERBAIKAN ISOLASI DASHBOARD MULTI-TENANT (CLEAN REMOUNT PER-TENANT & SYNC KONTEKS SESI)

- Tanggal: 2026-11-02 03:26
- Status: Completed

Tujuan:
Memastikan setiap pengguna/tenant (misal `berkah_erot` / Berkah Store) yang login ke dashboard bot langsung diarahkan ke dashboard mandiri miliknya (profil toko Mak Erot, data bot terpisah, transaksi terpisah, kupon terpisah) tanpa tercampur atau tertimpa data toko default Wanzt Store.

Rencana:
1. Memperbarui `frontend/src/hooks/useAuth.ts` agar menyimpan dan menyelaraskan `tenantId` pada tipe `UserSession`, state pengguna, dan `localStorage`.
2. Memisahkan antarmuka dashboard toko utama ke komponen mandiri `frontend/src/components/dashboard/TenantDashboard.tsx`.
3. Memperbarui `frontend/src/App.tsx`:
   - `App` hanya menangani status sesi otentikasi.
   - Saat `!isAuthenticated`, hanya menampilkan `LoginPage`. Hook toko tidak dieksekusi prematur saat berada di layar login.
   - Saat `isAuthenticated`, merender `<TenantDashboard key={auth.user?.tenantId} auth={auth} />`.
   - Menggunakan prop `key={tenantId}` untuk menjamin penghancuran (*unmount*) total instance lama dan pemuatan (*mount*) instan data baru yang 100% murni milik tenant yang login.
4. Memastikan sinkronisasi API `/api/bot/status` dan interseptor header `x-tenant-id` serta cookie `tenant_id` mengalir mulus ke backend.
5. Memverifikasi dengan `compile_applet` dan `lint_applet`.
6. Mencatat hasil penyelesaian di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Saat login dengan `berkah_erot`, dashboard 100% menampilkan data Berkah Store (Mak Erot). Begitu pula jika login dengan `admin` / `wanzt`, dashboard menampilkan Wanzt Store. Masing-masing tenant dapat login bersamaan di perangkat berbeda dan bot tetap tersambung 24/7 di server meskipun user logout dari web.

---

[9.0] - PENGHAPUSAN SISTEM TIER/PAKET DAN PENYERAGAMAN SEMUA BOT BERBASIS MASA SEWA

- Tanggal: 2026-11-02 04:15
- Status: Completed

Tujuan:
Menghilangkan sistem tier/paket langganan (seperti Basic, Pro, Enterprise) pada arsitektur multi-tenant, dan menyeragamkan seluruh fitur serta kapabilitas bot agar 100% sama rata dan adil. Peringkat (ranking) atau klasifikasi bot murni ditentukan berdasarkan masa sewa (durasi aktif dan sisa hari sewa).

Rencana:
1. Menyusun dokumentasi rencana implementasi teknis di `brain/LANGKAH_IMPLEMENTASI.md` (entri [12.0]).
2. Mencatat wawasan arsitektur kesetaraan fitur multi-tenant di `brain/IDEA.md` (entri [10.0]).
3. Memperbarui antarmuka Master Admin di `admin-frontend/src/App.tsx`:
   - Menghapus opsi dropdown pilihan paket (`newPackage` & `<select>`) pada Modal Tambah Unit Toko Baru.
   - Menghapus kolom "Paket" pada tabel apartemen toko.
   - Mengganti dan memperkaya kolom tabel dengan informasi Masa Sewa & Peringkat Durasi Sewa (sisa hari sewa, tanggal kedaluwarsa, dan indikator status aktif).
   - Menambahkan pengurutan (sorting) peringkat bot berdasarkan sisa masa sewa (terpanjang ke terpendek atau terdekat ke kedaluwarsa) agar pengelola dapat melihat ranking masa sewa secara transparan dan adil.
4. Memperbarui backend di `admin-backend/services/tenantManager.ts` dan `admin-backend/routes/adminRoutes.ts`:
   - Menyeragamkan nilai default `package_name` menjadi 'Akses Penuh' untuk seluruh tenant tanpa pembedaan fitur.
   - Menyeragamkan kuota grup (`max_groups`) ke batas yang setara untuk seluruh tenant.
   - Menyediakan urutan peringkat berdasarkan masa sewa (`expires_at DESC` / `days_remaining`).
5. Memperbarui konfigurasi default Base URL Xaviera di `backend/config/configManager.ts` menjadi domain resmi aktif `https://xavierastore.com/api/v1` dan menyelaraskan ke database tenant.
6. Menjalankan pengujian dan kompilasi (`lint_applet`, `compile_applet`).
7. Mencatat hasil penyelesaian di `brain/PROGRESS.md` dan memperbarui status rencana.

Hasil yang Diharapkan:
Seluruh unit bot memiliki hak akses dan fitur yang 100% setara tanpa diskriminasi tier/paket. Peringkat bot di dashboard murni mencerminkan durasi dan keaktifan masa sewa secara adil.

---

[10.0] - PERENCANAAN SISTEM PENYIMPANAN MEDIA TERISOLASI DAN FITUR UPLOAD FOTO MULTI-TENANT

- Tanggal: 2026-11-03 08:25
- Status: Completed

Tujuan:
Merancang dan merencanakan solusi menyeluruh agar setiap tenant dapat mengunggah dan memilih foto kustom mereka sendiri (untuk command Menu dan Carousel) secara mandiri dari dashboard, tanpa perlu hardcode di server, dan dengan isolasi ketat sehingga foto milik Tenant A tidak dapat dilihat atau diakses oleh Tenant B.

Rencana:
1. Analisis dan Konfirmasi Arsitektur dengan Pengguna:
   - Mempresentasikan analisis akar masalah saat ini (folder statis bersama `/frontend/src/media/picture`).
   - Menyampaikan usulan solusi direktori terisolasi `storage/tenants/<tenantId>/media/` di server lokal.
   - Menjelaskan rancangan API upload, list, view, dan delete yang terlindungi autentikasi konteks tenant.
   - Menjelaskan integrasi bot WhatsApp agar membaca foto dari folder tenant aktif dengan fallback ke default.
   - Menjelaskan rancangan UI upload dan galeri foto di dashboard Command Tab.
   - Menunggu persetujuan pengguna sebelum melakukan perubahan kode.

2. Tahap Implementasi Teknis (Setelah Pengguna Menyetujui):
   - Langkah 1: Persiapan direktori penyimpanan server `storage/tenants/<tenantId>/media/` dan aset bersama `storage/shared/default_media/`.
   - Langkah 2: Pembaruan `backend/routes/mediaRoutes.ts` dengan upload handler (multer/stream), sanitasi path keamanan, dan scoping berdasarkan `getActiveTenantId()`.
   - Langkah 3: Penyesuaian `menuMessage.ts`, `carouselMessage.ts`, dan `botManager.ts` agar mengambil media dari storage tenant yang sesuai.
   - Langkah 4: Pembuatan komponen Upload Media & Selector di `frontend/src/components/dashboard/tabs/CommandTab.tsx`.
   - Langkah 5: Pengujian isolasi foto antar-tenant (verifikasi bahwa Tenant A tidak melihat foto Tenant B) dan verifikasi bot WhatsApp.

Hasil yang Diharapkan:
Setiap tenant memiliki ruang penyimpanan foto terisolasi 100%, dapat dengan mudah mengunggah foto promosi melalui dashboard web, dan foto tersebut otomatis digunakan saat bot WhatsApp mereka merespons pesan Menu dan Carousel tanpa saling tumpang tindih antar penyewa.

---

[11.0] - DESAIN DAN IMPLEMENTASI TABEL DAFTAR PENYEWA BARU PADA DASHBOARD MASTER ADMIN

- Tanggal: 2026-11-03 08:42
- Status: Completed

Tujuan:
Merespons permintaan pembaruan tabel penyewa pada dashboard Master Admin (`/master` / `admin-frontend/`) dengan susunan 13 kolom informasi dan aksi lengkap (Status Akun, ID Bot, Toko, Owner, No WhatsApp, Username, Masa Sewa, Tanggal Expired, Status Bot Baileys Online/Offline, Tombol Perpanjang Sewa, Toggle Switch Suspend, Tombol Reset Password, dan Tombol Hapus Tenant).

Rencana:
1. Tahap Konfirmasi Pemahaman (Saat Ini):
   - Menjelaskan seluruh pemahaman struktur tabel, fungsi setiap kolom, cara kerja toggle suspend, indikator status bot WhatsApp, serta tombol-tombol aksi kepada pengguna.
   - Menunggu persetujuan pengguna sebelum melakukan perubahan kode.

2. Tahap Implementasi Teknis (Setelah Disetujui Pengguna):
   - Langkah 1: Mendokumentasikan rencana teknis di `brain/LANGKAH_IMPLEMENTASI.md` ([29.0]).
   - Langkah 2: Menyesuaikan backend `admin-backend/services/tenantManager.ts` dan `admin-backend/routes/adminRoutes.ts` agar menyertakan status koneksi real-time bot Baileys (`bot_status: 'online' | 'offline'`) untuk setiap tenant, serta endpoint reset password dan update status.
   - Langkah 3: Merombak antarmuka tabel di `admin-frontend/src/App.tsx` sesuai spesifikasi 13 kolom:
     * Status Akun: Badge warna (Aktif = Hijau, Suspend = Oranye, Expired = Merah).
     * ID Bot: Format kode monospace seperti `t_berkahstore_450`.
     * Toko: Nama toko penyewa.
     * Owner: Nama pemilik toko.
     * No. WhatsApp: Nomor kontak dengan tautan langsung / format rapi.
     * Username: Username login dashboard toko.
     * Masa Sewa: Durasi masa sewa aktif (contoh: "360 Hari").
     * Expired: Format tanggal jatuh tempo Indonesia (contoh: "28 Oktober 2026").
     * Status Bot: Indikator Online (hijau dengan dot berkedip) jika socket Baileys terhubung, atau Offline (abu-abu).
     * Perpanjang: Tombol membuka modal perpanjangan masa sewa bot (+hari).
     * Suspend: Toggle switch (On = Suspend aktif, Off = Normal).
     * Reset: Tombol modal reset password akun tenant.
     * Hapus: Tombol modal konfirmasi hapus tenant beserta database & sesinya.
   - Langkah 4: Menguji build frontend dan backend (`compile_applet` dan `lint_applet`).
   - Langkah 5: Mencatat hasil akhir di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Tabel daftar penyewa di Dashboard Master Admin tampil modern, rapi, responsif, dan menyajikan kendali lengkap atas seluruh unit bot apartemen sesuai kebutuhan pengguna.

---

[12.0] - PENEGAKAN SUSPEND AKUN TENANT: PEMUTUSAN KONEKSI BOT WHATSAPP & MODAL PEMBERITAHUAN NON-DISMISSIBLE

- Tanggal: 2026-11-03 16:50
- Status: Completed


Tujuan:
Menerapkan sistem penegakan suspensi (akun dibekukan) secara menyeluruh:
1. Ketika akun tenant disuspend oleh Master Admin di dashboard admin:
   - Jika bot WhatsApp tenant sedang terhubung (Baileys socket online), server secara otomatis langsung memutus/mematikan koneksi bot (`forceDisconnect`), sehingga bot tidak dapat menerima atau merespon pesan WhatsApp sama sekali.
2. Ketika penyewa (tenant) yang berstatus suspended melakukan login ke dashboard bot:
   - Tenant tetap berhasil login dan masuk ke dashboard bot miliknya terlebih dahulu.
   - Sesaat setelah masuk, sistem langsung menampilkan popup modal peringatan bahwa akun toko telah ditangguhkan (suspended) oleh Master Admin.
   - Popup modal tersebut bersifat terkunci permanen (non-dismissible): tidak memiliki tombol close (X), tidak dapat ditutup dengan klik backdrop, dan tidak dapat ditutup dengan tombol Escape keyboard.
   - Di dalam modal tersedia 2 tombol aksi:
     * Tombol 1: "Hubungi Master Admin" yang mengarahkan langsung ke WhatsApp `https://wa.me/6285712439395`.
     * Tombol 2: "Keluar / Logout" untuk keluar dari dashboard toko.
3. Menyiapkan konfigurasi terpusat untuk nomor WhatsApp Master Admin agar mudah diganti sewaktu-waktu di kemudian hari.

Rencana:
1. Menyusun catatan teknis di `brain/LANGKAH_IMPLEMENTASI.md` (entri [31.0]).
2. Menyimpan konfigurasi nomor WhatsApp Master Admin di file konfigurasi bersama (`constants/adminConfig.ts`).
3. Menambahkan method pemutus koneksi bot (`forceDisconnect()`) di `backend/botManager.ts`.
4. Memperbarui `admin-backend/services/tenantManager.ts` pada `setStatus` agar saat status `suspended`, bot WhatsApp tenant langsung dimatikan paksa.
5. Memperbarui `backend/routes/authRoutes.ts` dan `backend/services/authManager.ts` agar mengizinkan login akun suspended namun menyertakan flag `accountStatus: 'suspended'` pada sesi dan endpoint `/api/auth/store-status`.
6. Membuat komponen `SuspendedAccountModal.tsx` di `frontend/src/components/modals/SuspendedAccountModal.tsx`.
7. Menghubungkan modal tersebut ke `frontend/src/components/dashboard/TenantDashboard.tsx`.
8. Menguji kompilasi dan linting (`compile_applet`, `lint_applet`).
9. Mencatat hasil akhir di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Akun yang disuspend tidak dapat menjalankan bot WhatsApp sama sekali, dan dashboard terkunci total dengan popup modal non-dismissible yang mengarahkan penyewa ke nomor WhatsApp Master Admin (+6285712439395).

---

[13.0] - PEMBUATAN AKUN TENANT INSTAN OTOMATIS & TOMBOL TUTUP SEMENTARA POPUP SUSPEND

- Tanggal: 2026-11-03 17:05
- Status: Completed


Tujuan:
1. Menyederhanakan pembuatan akun tenant baru di Dashboard Master Admin sehingga admin tidak wajib mengisi data Nama Store, Nama Owner, No WhatsApp Owner, Username, maupun Password:
   - Sistem otomatis membuatkan ID Unit, Username acak terstruktur (misal: `tenant_8421` atau `toko_5823`), dan Password acak yang rapi.
   - Kolom Nama Store, Nama Owner, dan No. WhatsApp dikosongkan di awal (atau admin bisa opsi isi cepat jika mau, namun tidak wajib).
   - Setelah akun terbuat, tampilkan modal sukses berisi Username & Password yang digenerate dengan tombol salin (copy kredensial).
   - Saat tenant login pertama kali dengan username & password tersebut, dashboard toko otomatis menampilkan popup modal wajib isi Store Info (`MandatoryStoreSetupModal`) untuk melengkapi Nama Toko, Nama Owner, dan Nomor WhatsApp.
2. Menambahkan tombol "Tutup Sementara" atau tautan akses darurat pada Popup Modal Suspend (`SuspendedAccountModal`) agar admin/pengguna tetap dapat menutup modal sementara waktu untuk bernavigasi ke portal Master Admin atau keperluan darurat lainnya.

Rencana:
1. Catat rincian implementasi teknis di `brain/LANGKAH_IMPLEMENTASI.md` (entri [32.0]).
2. Perbarui backend pembuatan tenant di `admin-backend/services/tenantManager.ts` & `admin-backend/routes/adminRoutes.ts` agar mendukung auto-generation username dan password acak terstruktur, serta mengizinkan field store_name, owner_name, owner_phone kosong di awal.
3. Perbarui modal "Tambah Unit Apartemen Toko" di `admin-frontend/src/App.tsx` dengan mode otomatis 1-klik / form sederhana hanya memilih durasi masa sewa, dan dialog sukses kredensial baru dengan tombol salin.
4. Perbarui `frontend/src/components/modals/SuspendedAccountModal.tsx` dengan menambahkan tombol "Tutup Sementara" (minimize / dismiss temporary) dan tombol pintas langsung ke Portal Master Admin (`/admin/`).
5. Uji build dan linting (`compile_applet` dan `lint_applet`).
6. Catat hasil akhir di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Admin dapat membuat akun unit toko baru dalam 1-klik tanpa repot memikirkan username, password, dan nama toko. Penyewa melengkapi profil toko secara mandiri saat login. Modal suspend dapat ditutup sementara jika admin ingin berpindah ke dashboard master.

---

[14.0] - IMPLEMENTASI HALAMAN KUSTOMISASI USERNAME & PASSWORD TENANT DARI FOTO PROFIL SIDEBAR

- Tanggal: 2026-11-03 20:39
- Status: Planned

Tujuan:
Menyediakan fitur mandiri bagi tenant untuk mengubah username dan password toko mereka sendiri dari dalam dashboard, dengan titik masuk (entry point) berupa klik pada foto/kartu profil di bagian bawah sidebar.

Rencana:
1. Merancang Endpoint Backend Baru di `/backend/routes/authRoutes.ts` & `/backend/services/authManager.ts`:
   - Endpoint `POST /api/auth/profile/update-username`:
     * Memvalidasi format username baru (minimal 3 karakter, alfanumerik/underscore).
     * Memeriksa apakah username sudah dipakai oleh tenant lain (harus unik).
     * Mengupdate username di `database/master.db` (tabel `tenants`) dan database tenant aktif (`bot.db`).
     * Memperbarui username di objek sesi aktif (`activeSessions`).
   - Endpoint `POST /api/auth/profile/update-password`:
     * Menerima 3 input: `currentPassword`, `newPassword`, dan `confirmPassword`.
     * Memvalidasi kesamaan `newPassword` dan `confirmPassword`.
     * Memverifikasi kebenaran `currentPassword` terhadap hash password yang aktif saat ini. Jika salah, kirim respon error 400 "Password saat ini tidak valid!".
     * Jika valid, hash `newPassword` baru dan simpan ke `master.db` serta database tenant aktif.
2. Penyesuaian Antarmuka Frontend:
   - Menambahkan tab baru `'Akun'` atau `'Keamanan Akun'` pada `TabContentRenderer.tsx` dan `dashboard.types.ts`.
   - Mengubah area foto profil dan teks admin di footer `DesktopSidebar.tsx` menjadi elemen interaktif (tombol klik dengan hover state, efek tactile, dan tooltip petunjuk "Klik untuk ubah kredensial akun").
   - Ketika diklik, state `selectedTab` berpindah ke tab `'Akun'`.
   - Membuat komponen halaman `TabAccountSecurity.tsx`:
     * Kartu 1: Form Ubah Username dengan preview username aktif dan tombol "Simpan Username".
     * Kartu 2: Form Ubah Password dengan 3 form input (Password Saat Ini, Password Baru, Konfirmasi Password Baru) disertai toggle intip password (ikon mata) dan tombol "Ubah Password".
3. Validasi & Pengujian:
   - Tes verifikasi jika password saat ini salah.
   - Tes verifikasi jika konfirmasi password baru tidak cocok.
   - Tes perubahan username ke username unik dan penolakan jika duplikat.
   - Pengujian kompilasi (`compile_applet`, `lint_applet`).

Hasil yang Diharapkan:
Tenant dapat dengan mudah dan aman mengkustomisasi username dan password toko mereka sendiri langsung melalui klik foto profil di sidebar bawah.

---

[15.0] - OPTIMASI MOBILE UX/UI DASHBOARD BOT (FASE 1: PERBAIKAN HORIZONTAL SCROLL SUB-TAB RESPON BOT & FILTER TRANSAKSI)

- Tanggal: 2026-11-04 16:20
- Status: Completed

Tujuan:
Merespons feedback dan keluhan pengguna mengenai antarmuka mobile dashboard bot yang berantakan, khususnya:
1. Memperbaiki sub-tab "Respon Bot" pada `TabCommand.tsx` agar tidak lagi jebol menembus tepi kanan kartu kontainer di layar ponsel.
2. Memperbaiki tombol filter status pada `TabTransaksi.tsx` agar teks judul (`Semua`, `Paid`, `Pending`, `Cancel`) tidak lagi terpotong elipsis (`Sem...`, `P...`, `Pendi...`, `Can...`) di ukuran mobile.

Rencana:
1. Perbaikan `frontend/src/components/tabs/TabCommand.tsx`:
   - Mengubah kontainer segmented tab bar dari `inline-flex` statis menjadi kontainer responsif `w-full overflow-x-auto scrollbar-none flex items-center gap-1.5 p-1`.
   - Mengatur setiap tombol tab dengan `shrink-0 whitespace-nowrap` dan padding ergonomis agar tidak pernah terpotong atau menembus batas kartu.
   - Menambahkan efek visual feedback saat disentuh (`active:scale-[0.97] transition-all`).
2. Perbaikan `frontend/src/components/tabs/TabTransaksi.tsx`:
   - Mengubah kontainer filter pills dari yang sebelumnya memaksakan 4 tombol mengecil dalam 1 baris (`w-full` dengan `truncate`) menjadi horizontal scrollable pill bar (`overflow-x-auto scrollbar-none flex items-center gap-2`).
   - Menghapus pemaksaan elipsis pada teks label dan memasang `shrink-0 whitespace-nowrap` agar teks dan angka badge selalu terbaca utuh (`Semua`, `Paid`, `Pending`, `Cancel`).
   - Menambahkan feedback tactile pada pill tab saat ditekan.
3. Menjalankan pengujian build frontend (`compile_applet` dan `lint_applet`).
4. Mencatat hasil penyelesaian di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Seluruh tab navigasi dan filter pada dashboard bot tampil rapi, terbaca utuh tanpa elipsis yang membingungkan, dapat digeser horizontal dengan nyaman, dan tidak ada elemen yang keluar dari kartu kontainer.





---

[16.0] - OPTIMASI MOBILE UX/UI DASHBOARD BOT (FASE 2: REDESAIN DAN PENINGKATAN KETERBACAAN LIVE TERMINAL)

- Tanggal: 2026-11-04 16:28
- Status: Completed

Tujuan:
Merespons feedback dan masalah pada screenshot 3 di mana tampilan log terminal pada ukuran mobile terasa sangat sempit, teks header bertumpuk atau terpotong, instruksi empty state kurang sesuai dengan posisi mobile ("di sebelah kiri"), serta ukuran tinggi terminal yang terlalu kaku dan memakan ruang layar ponsel secara berlebihan.

Rencana:
1. Menata ulang header LiveTerminal agar responsif di layar mobile:
   - Tombol mac-style dots tetap rapi dan tidak berhimpitan.
   - Judul stream rapi dengan ikon Terminal.
   - Indikator status socket WebSocket Active dibuat ringkas di mobile (misal badge "WS Active" dengan pulsing dot hijau/biru) dan tampil lengkap di desktop tanpa wrap teks yang berantakan.
2. Menyesuaikan tinggi kontainer terminal agar proporsional di mobile:
   - Mengubah h-[520px] kaku menjadi tinggi dinamis h-[340px] sm:h-[400px] md:h-[480px].
3. Memperbaiki teks panduan empty state:
   - Mengganti teks kaku "Masukkan nomor target di sebelah kiri" menjadi panduan yang akurat di semua ukuran layar: "Masukkan nomor target pada form pairing lalu klik 'Minta Kode Pairing'".
4. Meningkatkan keterbacaan baris log:
   - Mengganti break-all menjadi break-words agar pemenggalan kata tidak merusak makna kalimat log.
   - Mengatur timestamp log menjadi lebih ramping text-[10px] di mobile.
   - Menambahkan highlight kode pairing yang kontras dan mudah disalin jika ada event kode pairing di log.
   - Menambahkan auto-scroll otomatis ke baris log terbaru.
5. Menambahkan fitur salin log pada footer:
   - Menyediakan tombol "Salin Log" yang menyalin seluruh teks log ke clipboard.
   - Menyelaraskan status footer dengan status koneksi bot real-time.
6. Menguji kompilasi dan linting (compile_applet, lint_applet).

Hasil yang Diharapkan:
Tampilan LiveTerminal pada layar mobile tampil sangat rapi, bersih, mudah dibaca, proporsional, dan informatif tanpa teks yang bertumpuk atau instruksi yang membingungkan.
---

[17.0] - OPTIMASI MOBILE UX/UI DASHBOARD BOT (FASE 3: PENYESUAIAN UKURAN TOMBOL, PADDING ERGONOMIS, DAN ANIMASI MIKRO)

- Tanggal: 2026-11-04 16:35
- Status: Completed

Tujuan:
Merespons feedback pengguna bahwa pada tampilan mobile ukuran beberapa tombol masih terlalu besar sehingga layar terasa sesak dan sempit, serta kurangnya animasi mikro sentuhan membuat antarmuka terasa kaku dan membosankan.

Rencana:
1. Mengoptimalkan kepadatan visual (density) dan padding pada layar mobile:
   - Pada TenantDashboard: menyesuaikan padding kontainer utama dari p-4 menjadi p-3 sm:p-5 md:p-8 agar menghemat ruang horizontal ponsel.
   - Pada TabConnectionDedicated: menyesuaikan padding kartu status, kartu form pairing, dan kartu instruksi dari p-5/p-6 menjadi p-4 sm:p-5 md:p-6.
2. Menyelaraskan ukuran tombol-tombol utama agar ergonomis dan tidak terlalu besar di mobile:
   - Tombol Minta Kode Pairing: menggunakan ukuran teks dan padding responsif yang pas di ponsel dengan animasi tekan tactile active:scale-[0.98].
   - Tombol kontrol bot (Reset Sesi, Putuskan): dibuat responsif dan fleksibel dengan efek active:scale-95.
   - Tombol Salin Kode Pairing: diberi animasi sentuhan active:scale-95 dengan visual feedback yang mulus.
3. Menambahkan animasi mikro (micro-interactions) pada tombol Simpan dan interaksi formulir di TabCommand:
   - Menambahkan efek active:scale-[0.98] transition-all pada seluruh tombol Simpan (Simpan Menu, Simpan List, Simpan Carousel, Simpan Invoice, Simpan Konfirmasi).
   - Memastikan tombol Upload Foto dan thumbnail gallery picker memiliki feedback klik yang responsif.
4. Memverifikasi seluruh perubahan dengan compile_applet dan lint_applet.

Hasil yang Diharapkan:
Antarmuka dashboard toko di layar ponsel terasa jauh lebih lega, luas, modern, tidak kaku, dengan respon animasi sentuh (tactile feedback) yang menyenangkan bagi pengguna.
---

[18.0] - FITUR PENGIRIMAN PESAN MASTER ADMIN KE OWNER TENANT (MESSAGE MASTER ADMIN TO TENANT OWNER)

- Tanggal: 2026-11-04 23:20
- Status: Completed

Tujuan:
Memungkinkan Super Admin mengirimkan pesan resmi secara langsung dari tabel dashboard Master Admin ke nomor WhatsApp pribadi pemilik toko (owner tenant), di mana pesan dikirimkan otomatis oleh bot WhatsApp milik tenant tersebut.

Rencana:
1. Menambahkan tombol aksi "Kirim Pesan" pada baris data tabel penyewa di admin-frontend (App.tsx).
2. Membangun komponen modal dialog in-app untuk penulisan pesan:
   - Menampilkan identitas penerima: Nama Toko, Nama Owner, dan Nomor WhatsApp target (+628...).
   - Textarea input pesan pengumuman/informasi admin dengan counter karakter.
   - Tombol "Batal" dan "Kirim Pesan" dengan animasi loading.
3. Membangun endpoint backend POST /api/admin/tenants/:id/send-message di admin-backend/routes/adminRoutes.ts:
   - Mengambil instance bot Baileys milik tenant terkait via getBotManager(tenantId).
   - Memvalidasi status koneksi bot tenant (harus connected).
   - Mengeksekusi pengiriman pesan WhatsApp ke nomor owner_phone tenant.
   - Mengembalikan pesan respon sukses atau pesan peringatan jika bot sedang offline.
4. Menambahkan log pencatatan pengiriman pesan pada sistem log aktivitas admin.
5. Menguji fungsionalitas pengiriman pesan dan verifikasi kompilasi.

Hasil yang Diharapkan:
Super Admin dapat dengan mudah menghubungi owner toko langsung ke WhatsApp mereka dari dashboard master, menggunakan nomor bot toko masing-masing penyewa tanpa perlu membuka WhatsApp manual.

---

[19.0] - SISTEM MANAJEMEN DAN KATALOG TEMPLATE MESSAGE (DASHBOARD MASTER & RESPON BOT)

- Tanggal: 2026-11-09 14:14
- Status: Completed

Tujuan:
Menerapkan sistem manajemen template message dua arah:
1. Sisi Dashboard Master Admin: Halaman baru 'Template Message' untuk menambah, mengedit, menonaktifkan, atau menghapus template pesan respon bot secara dinamis.
2. Sisi Dashboard Bot: Tombol 'Pilih Template' di halaman Respon Bot yang memunculkan daftar template terisolasi per-kategori fungsi (Menu hanya untuk Menu, List untuk List, Carousel untuk Carousel, Invoice untuk Invoice, Konfirmasi untuk Konfirmasi) dan otomatis mengisi textarea ketika dipilih.

Rencana:
1. Tahap 1: Skema Database Pusat di `database/master.db`:
   - Tabel `message_templates`: `id`, `name`, `category` ('menu', 'list', 'carousel', 'invoice', 'confirmation'), `content`, `is_active` (1/0), `created_at`, `updated_at`.
   - Seeding template bawaan (default templates) untuk masing-masing kategori fungsi.
2. Tahap 2: Backend API Service (`admin-backend` dan `backend`):
   - Endpoint Master Admin: `GET /api/admin/templates`, `POST /api/admin/templates`, `PUT /api/admin/templates/:id`, `PATCH /api/admin/templates/:id/status`, `DELETE /api/admin/templates/:id`.
   - Endpoint Tenant: `GET /api/bot/templates?category=<category>` (hanya mengembalikan template berstatus aktif).
3. Tahap 3: Halaman 'Template Message' di Dashboard Master Admin (`admin-frontend`):
   - Menambahkan menu navigasi 'Template Message' di sidebar `AdminSidebar.tsx`.
   - Membuat halaman `TabTemplates.tsx` dengan filter kategori pill (Semua, Menu, List, Carousel, Invoice, Konfirmasi).
   - Menampilkan tabel / kartu template dengan status aktif/nonaktif, nama, kategori, preview teks, dan tombol aksi (Edit, Toggle Status, Hapus).
   - Modal popup 'Tambah / Edit Template' (Nama Template, Kategori Fungsi, Isi Pesan Textarea, Status).
   - Modal konfirmasi hapus template.
4. Tahap 4: Integrasi di Dashboard Bot Toko (`frontend`):
   - Di `TabCommand.tsx`, menambahkan tombol 'Pilih Template' pada masing-masing sub-tab (Menu, List, Carousel, Invoice, Konfirmasi).
   - Membuat komponen modal `TemplatePickerModal.tsx` yang secara otomatis memfilter hanya template yang kategorinya cocok dengan sub-tab yang aktif.
   - Mengisi otomatis form respon bot saat template dipilih, dengan dialog konfirmasi jika form sudah memiliki teks.
5. Tahap 5: Pengujian dan Verifikasi:
   - Uji pembuatan, pengeditan, penonaktifan, dan penghapusan template di Dashboard Master Admin.
   - Uji isolasi kategori: pastikan template menu tidak pernah muncul di sub-tab list atau invoice.
   - Uji kompilasi (`compile_applet`) dan linting (`lint_applet`).
   - Pencatatan di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Admin Utama memiliki kendali penuh atas template pesan bot, dan penyewa toko dapat dengan mudah memilih template yang sesuai dengan kategori respon bot tanpa salah kamar.

---

[20.0] - FITUR PERINGATAN OTOMATIS MASA SEWA KEDALUWARSA DENGAN TOMBOL NATIVE CTA_URL (EXPIRED WARNING)

- Tanggal: 2026-11-04 18:45
- Status: Completed

Tujuan:
Membangun sistem peringatan dini otomatis yang memberitahu owner tenant bahwa masa sewa bot akan segera berakhir, dikirimkan secara bertahap langsung ke WhatsApp pribadi owner dengan pesan interaktif menggunakan tombol native bertipe cta_url untuk perpanjangan sewa ke Master Admin.

Rencana:
1. Menentukan 4 tahapan jadwal pengiriman peringatan sebelum kedaluwarsa:
   - Tahap 1: 3 Hari sebelum masa sewa habis (H-3).
   - Tahap 2: 1 Hari / 24 Jam sebelum masa sewa habis (H-1).
   - Tahap 3: 5 Jam sebelum masa sewa habis (H-5 Jam).
   - Tahap 4: 1 Jam sebelum masa sewa habis (H-1 Jam).
2. Menambahkan kolom pelacak flag notifikasi pada skema master.db (tabel tenants):
   - Kolom: warned_3d, warned_1d, warned_5h, warned_1h (integer/boolean default 0) untuk mencegah pengiriman pesan berulang (anti-spam).
   - Reset flag otomatis jika masa sewa diperpanjang oleh admin.
3. Membangun cron scheduler service di backend (backend/services/expiryWarningService.ts):
   - Berjalan berkala setiap 5 menit memeriksa sisa waktu aktif tenant.
   - Menghitung selisih waktu antara waktu saat ini dan expires_at.
4. Mengonstruksi pesan peringatan interaktif Baileys WhatsApp:
   - Memuat informasi: Nama Toko, ID Bot, Waktu tepat kedaluwarsa, dan pesan pengingat yang sopan namun jelas.
   - Menggunakan tombol interaktif WhatsApp Native Flow bertipe cta_url (bukan link teks mentah) dengan label tombol seperti "Perpanjang Masa Sewa" atau "Hubungi Master Admin" yang membuka https://wa.me/6285712439395.
5. Mengalirkan pesan melalui instance socket bot milik tenant tersebut ke nomor owner_phone.
6. Menguji simulasi pengiriman pada berbagai interval waktu sewa.

Hasil yang Diharapkan:
Owner toko mendapatkan notifikasi tepat waktu sebelum bot mereka kedaluwarsa, pesan tampak sangat profesional dengan tombol interaktif cta_url, dan risiko bot terhenti tanpa sepengetahuan owner dapat dihindari.

---

[21.0] - FITUR NOTIFIKASI TRANSAKSI PENJUALAN REAL-TIME VIA TELEGRAM BOT (PURCHASE NOTICE)

- Tanggal: 2026-11-04 18:45
- Status: Planned

Tujuan:
Menyediakan integrasi notifikasi real-time ke akun atau grup Telegram milik owner toko setiap kali ada transaksi penjualan, sehingga owner dan tim dapat memantau pesanan masuk secara instan tanpa mengganggu obrolan di WhatsApp.

Rencana:
1. Menyiapkan konfigurasi Telegram pada database tenant dan endpoint profil toko:
   - Kolom telegram_bot_token dan telegram_chat_id pada tabel config atau profil toko.
   - Endpoint untuk menyimpan dan menguji token Telegram (POST /api/bot/test-telegram).
2. Membangun antarmuka pengaturan Telegram di dashboard toko:
   - Input Token Bot Telegram dan Chat ID Telegram (pribadi atau grup).
   - Panduan ringkas cara membuat bot via @BotFather dan cara mengetahui Chat ID.
   - Tombol "Tes Kirim Notifikasi" dengan indikator status koneksi Telegram.
3. Membangun modul service Telegram di backend (backend/services/telegramNotifier.ts):
   - Fungsi helper pengiriman pesan HTTP via Telegram Bot API (https://api.telegram.org/bot<token>/sendMessage).
   - Format pesan rapi berbasis Markdown atau HTML dengan emoji status dan rincian transaksi.
4. Menghubungkan trigger notifikasi pada siklus transaksi toko:
   - Notifikasi Invoice Dibuat: Mengirimkan info pesanan baru yang sedang menunggu pembayaran QRIS.
   - Notifikasi Pembayaran Berhasil (Paid): Mengirimkan info pesanan lunas berisi Nama Produk, Varian, Nominal, Order ID, Nomor Pembeli, dan estimasi laba margin toko.
   - Notifikasi Pembatalan/Expired: Mengirimkan info jika pesanan tidak dibayar tepat waktu.
5. Menguji pengiriman notifikasi transaksi ke akun dan grup Telegram.

Hasil yang Diharapkan:
Owner toko memiliki saluran notifikasi penjualan otomatis di Telegram yang cepat, stabil, gratis, dan dapat dibagikan ke tim toko dengan mudah.

---

[22.0] - PENEGAKAN SUSPENSI REAL-TIME TANPA REFRESH DAN BLOKIR TOTAL REQUEST PAIRING BOT

- Tanggal: 2026-11-04 21:12
- Status: Completed

Tujuan:
1. Memastikan popup banned (SuspendedAccountModal) langsung muncul secara otomatis di layar dashboard tenant saat Master Admin men-suspend akun, tanpa mengharuskan tenant me-refresh halaman web.
2. Memastikan seluruh upaya penghubungan bot WhatsApp (baik melalui tombol UI maupun tembakan langsung ke API backend /api/bot/start dan /api/bot/reset) diblokir secara total dengan HTTP status 403 Forbidden ketika akun dalam keadaan ditangguhkan (suspended).

Rencana:
1. Backend Status Synchronization (/api/bot/status):
   - Sertakan status akun tenant (accountStatus) dari master.db dalam respon /api/bot/status.
2. Server-Side Hard Guard pada Endpoint Bot (/backend/routes/botRoutes.ts & /backend/botManager.ts):
   - Pada POST /api/bot/start: Periksa status tenant di master.db. Jika !== 'active', tolak langsung dengan status 403 Forbidden.
   - Pada POST /api/bot/reset: Tolak jika status akun bukan 'active'.
   - Di botManager.start(): Tambahkan pengecekan lapis kedua agar socket Baileys tidak pernah diinisialisasi jika akun disuspend.
   - Di TenantManager.setStatus('suspended'): Putuskan socket Baileys dan bersihkan file kredensial sesi aktif untuk mencegah reconnect di background.
3. Frontend Real-Time Reaction:
   - Di useBotConnection.ts: Tangkap accountStatus dari respon polling /api/bot/status. Teruskan atau sinkronkan ke TenantDashboard.
   - Di TenantDashboard.tsx: Saat accountStatus berubah menjadi 'suspended', buka SuspendedAccountModal seketika (reset isSuspendModalDismissed jika baru saja dibanned).
   - Di TabConnectionDedicated.tsx: Nonaktifkan form input nomor dan tombol Minta Kode Pairing jika akun suspended, dengan pesan peringatan yang tegas.
4. Pengujian & Verifikasi:
   - Tes perubahan status suspend di Master Admin: pastikan dashboard tenant langsung memunculkan popup banned dalam 1.5 detik tanpa refresh.
   - Tes tembak API POST /api/bot/start dengan curl/fetch: pastikan mengembalikan 403 Forbidden dan tidak ada socket WhatsApp yang dibuat.

Hasil yang Diharapkan:
Sistem multi-tenant memiliki pertahanan anti-bypass 100%: popup banned muncul seketika secara real-time, dan tidak ada cara bagi tenant untuk menyambungkan bot WhatsApp selama akun berstatus suspended.

---

[23.0] - REFACTORING ARSITEKTUR MODULAR PENUH ADMIN-FRONTEND DAN ADMIN-BACKEND

- Tanggal: 2026-11-06 22:50
- Status: Completed

Tujuan:
Memecah seluruh kode monolitik pada dashboard Master Admin (admin-frontend yang berukuran >1.700 baris di App.tsx serta admin-backend pada adminRoutes.ts dan tenantManager.ts) ke dalam komponen, modul rute, dan layanan bisnis yang terisolasi, rapi, dan mudah dikembangkan di masa mendatang, selaras dengan standar arsitektur pada frontend dan backend dashboard bot.

Rencana:
1. Tahap 1: Modularisasi Arsitektur admin-backend:
   - Buat tipe data terpusat di admin-backend/types/admin.types.ts.
   - Buat fungsi utilitas di admin-backend/utils/phoneUtils.ts dan generatorUtils.ts.
   - Pecah layanan bisnis di admin-backend/services/ (adminAuthService.ts, tenantService.ts, tenantStatusService.ts, adminMessagingService.ts) dengan tetap menjaga kompatibilitas ekspor di tenantManager.ts.
   - Pecah rute API Express di admin-backend/routes/ (authAdminRoutes.ts, statsRoutes.ts, tenantRoutes.ts, messageRoutes.ts, impersonateRoutes.ts) dan agregasikan di adminRoutes.ts.
2. Tahap 2: Modularisasi Arsitektur admin-frontend:
   - Buat tipe data terpusat di admin-frontend/src/types/admin.types.ts.
   - Buat fungsi utilitas format telepon di admin-frontend/src/utils/phoneHelper.ts.
   - Buat komponen layout navbar di admin-frontend/src/components/layout/AdminHeader.tsx.
   - Buat kartu metrik di admin-frontend/src/components/dashboard/StatCards.tsx.
   - Buat kontrol pencarian & filter di admin-frontend/src/components/dashboard/TableControls.tsx.
   - Buat baris dan kontainer tabel penyewa 14 kolom di admin-frontend/src/components/dashboard/TenantTableRow.tsx dan TenantTable.tsx.
   - Buat modul modal terpisah di admin-frontend/src/components/modals/ (AddTenantModal.tsx, ExtendTenantModal.tsx, ResetPasswordModal.tsx, SendMessageModal.tsx, DeleteTenantModal.tsx, ToggleSuspendModal.tsx).
   - Rampingkan admin-frontend/src/App.tsx menjadi file orkestrator ringkas (~120-150 baris).
3. Tahap 3: Verifikasi dan Pengujian:
   - Jalankan compile_applet dan lint_applet untuk memastikan nol error kompilasi dan tipe data.
   - Verifikasi fungsionalitas seluruh fitur Master Admin.
4. Tahap 4: Dokumentasi:
   - Catat proses dan hasil di brain/LANGKAH_IMPLEMENTASI.md dan brain/PROGRESS.md.

Hasil yang Diharapkan:
Seluruh codebase admin-frontend dan admin-backend terstruktur rapi, modular, mudah dibaca, mudah dirawat, dan siap untuk ekspansi fitur selanjutnya tanpa file monolitik.

---

[24.0] - DESAIN ULANG DASHBOARD MASTER: PENYELARASAN TEMA CLEAN LIGHT DAN PEMBUATAN NAVBAR SIDEBAR

- Tanggal: 2026-11-06 23:20
- Status: Completed

Tujuan:
Menyelaraskan tampilan antarmuka visual Dashboard Master Admin (admin-frontend) agar 100% menggunakan bahasa desain, color palette resmi, dan komponen visual yang sama dengan Dashboard Bot (frontend), serta menambahkan layout Navbar Sidebar responsif untuk mendukung ekspansi fitur baru di masa depan.

Rencana:
1. Menyiapkan catatan implementasi teknis lengkap di brain/LANGKAH_IMPLEMENTASI.md (entri [42.0]).
2. Membuat komponen AdminSidebar.tsx di admin-frontend/src/components/layout/AdminSidebar.tsx:
   - Identitas logo Wanzt Apartemen dengan ikon Building2 berlatar biru #0084D1.
   - Navigasi tab: Daftar Unit Bot, Statistik Platform, Pesan Siaran, dan Pengaturan Master.
   - Indikator aktif bergaris vertikal kiri #0084D1 dan background tint #0084D1/10 (identik dengan DesktopSidebar bot).
   - Profil Super Admin di bagian bawah sidebar dengan badge status Akses Penuh dan tombol pintas Buka Web Toko.
   - Dukungan drawer responsif di mobile dengan backdrop dan tombol tutup.
3. Menyelaraskan AdminHeader.tsx:
   - Mengubah dari navbar fixed gelap menjadi Topbar Workspace terang (bg-white/80 border-b border-slate-200/80 backdrop-blur-md).
   - Menambahkan tombol hamburger mobile untuk membuka sidebar.
   - Menampilkan judul tab aktif dan tombol aksi Buka Web Toko serta Muat Ulang Data.
4. Menyelaraskan Komponen Dashboard ke Clean Light Theme:
   - StatCards.tsx: Kartu metrik berlatar putih bersih (bg-white border-slate-200/90 rounded-2xl shadow-xs), angka kontras gelap (text-slate-900), dan ikon berwarna lembut.
   - TableControls.tsx: Filter status pill (bg-[#0084D1] text-white saat aktif, bg-slate-100 text-slate-600 saat inaktif), kolom search dan select sort bg-white border-slate-300 text-slate-800.
   - TenantTableRow.tsx & TenantTable.tsx: Header thead bg-slate-50 text-slate-600, baris tr hover:bg-slate-50/70 border-slate-100, badge status aktif/suspend/expired yang jelas dan kontras tinggi.
5. Menyelaraskan Seluruh Modal di admin-frontend/src/components/modals/:
   - Mengubah latar modal dari slate-900 gelap menjadi bg-white border-slate-200 rounded-2xl shadow-2xl.
   - Menyesuaikan form input ke bg-slate-50 border-slate-300 text-slate-900.
   - Menyelaraskan tombol aksi utama dengan warna brand #0084D1 (hover #0073B7).
6. Mengintegrasikan Layout di admin-frontend/src/App.tsx:
   - Membungkus halaman dengan struktur dua kolom (AdminSidebar + Main Workspace).
   - Menghubungkan state selectedNavTab dan mobile sidebar toggle.
7. Memverifikasi dengan compile_applet dan lint_applet serta memastikan nol em-dash.
8. Mencatat penyelesaian di brain/PROGRESS.md.

Hasil yang Diharapkan:
Dashboard Master Admin memiliki tampilan profesional, modern, bersih (clean light theme #0084D1), memiliki navbar sidebar yang nyaman digunakan di desktop maupun mobile, dan selaras sempurna dengan Dashboard Bot.

---

[25.0] - PEMINDAHAN TITIK AKSES DASHBOARD MASTER: PENGHAPUSAN DARI DASHBOARD BOT DAN POPUP BANNED, PENEMPATAN DI HALAMAN LOGIN

- Tanggal: 2026-11-06 23:48
- Status: Completed

Tujuan:
Merespons instruksi pengguna untuk menyederhanakan dan mengamankan titik masuk (entry point) ke Dashboard Master Admin:
1. Menghapus tombol akses ke Dashboard Master yang sebelumnya ada di dalam dashboard bot (DesktopTopNav.tsx dan Navbar.tsx) agar pengguna/penyewa biasa tidak melihat tombol admin gedung saat sedang mengoperasikan toko.
2. Menghapus tombol akses Dashboard Master dari popup akun ditangguhkan (SuspendedAccountModal.tsx).
3. Menempatkan tombol akses resmi ke Dashboard Master pada menu/halaman login (LoginPage.tsx) agar pemilik/master admin dapat langsung masuk ke portal admin dengan cepat dan mudah sebelum login toko.

Rencana:
1. Mencatat rencana implementasi teknis di brain/LANGKAH_IMPLEMENTASI.md (entri [43.0]).
2. Menghapus tombol Master Apartemen dari DesktopTopNav.tsx dan membersihkan impor Building2 yang tidak digunakan.
3. Menghapus tombol Master dari Navbar.tsx dan membersihkan impor Building2 yang tidak digunakan.
4. Menghapus tombol Dashboard Master dari SuspendedAccountModal.tsx dan merapikan tata letak tombol aksi modal.
5. Menambahkan tombol akses resmi "Masuk ke Dashboard Master Admin" di LoginPage.tsx dengan ikon Building2, desain bersih, dan tautan langsung ke /admin/.
6. Menjalankan verifikasi kompilasi dan linting (compile_applet dan lint_applet).
7. Mencatat penyelesaian di brain/PROGRESS.md dan memperbarui status rencana.

Hasil yang Diharapkan:
Dashboard bot bersih dari tombol master admin saat sedang digunakan oleh tenant toko maupun saat akun suspended, dan tombol dashboard master tersedia strategis di halaman login.

---

[26.0] - PERANCANGAN DAN PENGEMBANGAN REST API KOLABORATOR (PARTNER / RESELLER API) UNTUK PENJUALAN SEWA BOT OTOMATIS

- Tanggal: 2026-11-07 05:46
- Status: Planned

Tujuan:
Membuka kanal integrasi bagi mitra kolaborasi/reseller agar dapat menjual jasa sewa bot WhatsApp secara otomatis melalui antarmuka REST API publik berotentikasi, di mana server secara instan membuat akun unit bot baru dan mengembalikan kredensial (ID tenant, username, password, dan masa aktif sewa) langsung ke sistem kolaborator.

Rencana:
1. Tahap 1: Perancangan Skema Database Kemitraan (database/master.db):
   - Tabel `collaborator_api_keys`: id, name, api_key_hash, prefix_key, status (active/suspended), quota_or_balance, created_at, webhook_url.
   - Tabel `collaborator_logs`: id, collaborator_id, tenant_id, duration_days, timestamp, request_ip.
2. Tahap 2: Middleware Keamanan & Autentikasi API Key:
   - Header autentikasi `x-api-key` atau `Bearer <token>` dengan verifikasi cepat dan aman.
   - Fitur rate limiting untuk mencegah serangan brute force / spam pembuatan akun.
3. Tahap 3: Pembuatan Endpoint REST API Publik Mitra:
   - `POST /api/v1/partner/tenants/create`: Menerima parameter durasi hari sewa, nama toko (opsional), nama owner (opsional), no wa owner (opsional).
   - Memanggil `TenantService.createTenant()` yang telah memiliki kemampuan auto-generate ID bot, username terstruktur, dan password acak.
   - Mengembalikan respon JSON terstruktur berisi: status, tenant_id, username, password, days_active, expires_at, login_url, dan pesan panduan.
   - Endpoint pendukung: `GET /api/v1/partner/tenants/:id` (cek status masa aktif tenant) dan `POST /api/v1/partner/tenants/:id/extend` (perpanjang masa sewa oleh reseller).
4. Tahap 4: Antarmuka Manajemen Kolaborator di Dashboard Master Admin (admin-frontend):
   - Menu kelola API Key Kolaborator di tab Pengaturan Master / Tab Kemitraan: Generate API Key baru, pantau unit yang dibuat oleh masing-masing kolaborator, dan status kemitraan.
5. Tahap 5: Dokumentasi Integrasi Resmi untuk Kolaborator:
   - Format contoh request (cURL, NodeJS/Axios, PHP/cURL, Python) dan format respon JSON sukses/gagal.
6. Tahap 6: Pengujian dan Verifikasi:
   - Uji coba pembuatan akun via request API eksternal (Postman/curl).
   - Verifikasi isolasi database tenant yang terbentuk dan kesiapan login di dashboard bot.

Hasil yang Diharapkan:
Kolaborator atau reseller dapat mengintegrasikan penjualan sewa bot ke sistem kasir/website mereka sendiri secara otomatis 24/7 tanpa perlu intervensi manual dari Master Admin.

---

[27.0] - SISTEM TOKEN LISENSI VOUCHER PERPANJANGAN MASA SEWA BOT DAN HALAMAN REDEEM TENANT

- Tanggal: 2026-11-07 05:59
- Status: Planned

Tujuan:
Menerapkan sistem perpanjangan masa sewa bot mandiri berbasis kode token sekali pakai (single-use voucher):
1. Admin dan Mitra Kolaborator dapat membuat kode unik acak dengan input durasi hari sewa (misal 30 hari).
2. Kode token bersifat universal (dapat dipakai oleh tenant bot mana pun) namun hanya dapat digunakan 1 kali saja.
3. Tenant memiliki halaman sederhana di dashboard bot untuk memasukkan kode token dan seketika memperpanjang masa aktif bot tanpa perlu konfirmasi manual.

Rencana:
1. Tahap 1: Skema Database Token di `database/master.db`:
   - Tabel `extension_tokens`: `id`, `token_code` (unique, misal `EXT-7A9B-X12K`), `duration_days`, `status` ('available', 'used', 'revoked'), `created_by` ('admin', 'partner_api'), `used_by_tenant_id`, `used_at`, `created_at`.
2. Tahap 2: Backend Service Token Manager:
   - Fungsi generate kode acak alfanumerik terstruktur dan aman (`generatorUtils.ts`).
   - Fungsi verifikasi dan redeem token: Menambahkan sisa hari ke masa aktif tenant aktif (`expires_at`), mengubah status token menjadi 'used', serta memulihkan status akun ke 'active' jika sebelumnya expired/suspended.
3. Tahap 3: API Endpoint Master Admin & Partner:
   - `POST /api/admin/tokens/create`: Pembuatan token via Dashboard Master (durasi hari & jumlah token yang ingin digenerate).
   - `GET /api/admin/tokens`: Daftar riwayat seluruh token (tersedia, terpakai, expired).
   - `POST /api/v1/partner/tokens/create`: Pembuatan token otomatis via API untuk mitra kolaborator tunggal.
4. Tahap 4: API Endpoint Tenant & Halaman Redeem di Dashboard Bot:
   - `POST /api/tenant/redeem-token`: Endpoint penukaran token bagi tenant yang sedang login.
   - Halaman/Tab baru di Dashboard Bot ('Perpanjang Masa Aktif' / 'Masa Sewa'):
     * Kartu informasi masa aktif saat ini (sisa hari & tanggal kedaluwarsa).
     * Satu kolom input teks 'Kode Token Perpanjangan' dan tombol aksi 'Gunakan Token'.
     * Feedback pesan sukses instan dan animasi perpanjangan masa sewa.
5. Tahap 5: Pengujian dan Verifikasi:
   - Uji pembuatan token di Master Admin dan via API.
   - Uji penukaran kode token oleh akun tenant: pastikan sisa hari bertambah dengan benar.
   - Uji penggunaan ulang token yang sama: pastikan sistem menolak dengan pesan 'Token sudah pernah digunakan'.

Hasil yang Diharapkan:
Tenant dapat membeli token dari mitra kolaborator dan memperpanjang masa sewa bot secara mandiri 24/7 dengan mudah dan aman.

---

[28.0] - REFAKTORISASI DAN PENAMBAHAN 4 SUB-KATEGORI TEMPLATE PESAN PADA KONFIRMASI CHECKOUT BOT

- Tanggal: 2026-11-09 15:59
- Status: Completed

Tujuan:
Menyediakan template pesan mandiri dan terisolasi untuk 4 jenis respon bot di sub-tab Konfirmasi:
1. Ringkasan Pesan Order (`confirm_summary`)
2. Permintaan Input Kode Promo (`confirm_promo_input`)
3. Pesan Jika Kode Promo Valid (`confirm_promo_valid`)
4. Pesan Jika Kode Promo Invalid (`confirm_promo_invalid`)
Serta menambahkan tombol 'Pilih Template' di masing-masing form tersebut dan memperbarui filter & form di Dashboard Master Admin.

Rencana:
1. Tahap 1: Pembaharuan Database & Tipe Data:
   - Skema dan migrasi data SQLite di `masterSqlite.ts`: migrasikan 'confirmation' ke 'confirm_summary', dan seed template bawaan untuk `confirm_promo_input`, `confirm_promo_valid`, dan `confirm_promo_invalid`.
   - Update definisi tipe `TemplateCategory` pada `admin-frontend/src/types/admin.types.ts`.
2. Tahap 2: Pembaharuan Dashboard Master Admin (`admin-frontend`):
   - Update filter tab dan visual badges di `TabTemplates.tsx` untuk mendukung 4 sub-kategori konfirmasi.
   - Update dropdown kategori dan tag chips placeholder di `AddEditTemplateModal.tsx`.
3. Tahap 3: Pembaharuan Dashboard Bot Toko (`frontend`):
   - Pasang tombol 'Pilih Template' pada form 2 (Permintaan Input Promo), form 3 (Promo Valid), dan form 4 (Promo Invalid) di `TabCommand.tsx`.
   - Update `TemplatePickerModal.tsx` untuk pemetaan label kategori dan tag placeholder yang tepat.
4. Tahap 4: Verifikasi & Dokumentasi:
   - Jalankan `compile_applet` dan `lint_applet`.
   - Pastikan ketiadaan karakter em-dash (-) dan en-dash (-).
   - Perbarui catatan implementasi dan progress di `brain/`.

Hasil yang Diharapkan:
Seluruh 4 bagian respon bot konfirmasi memiliki template resmi terisolasi masing-masing dan Master Admin dapat mengelolanya secara leluasa.

---

[29.0] - IMPLEMENTASI PENGATURAN MASA SEWA FLEKSIBEL (MENIT, JAM, HARI, MINGGU, BULAN)

- Tanggal: 2026-11-09 21:15
- Status: Completed

Tujuan:
Meningkatkan fleksibilitas penetapan masa aktif tenant di Dashboard Master Admin agar dapat diatur dalam berbagai satuan waktu (Menit, Jam, Hari, Minggu, Bulan) guna mendukung berbagai skenario penyewaan (trial singkat hingga langganan jangka panjang).

Rencana:
1. Tahap 1: Pembaharuan Skema Tipe Data & Backend:
   - Update interface `CreateTenantInput` di `admin-backend/types/admin.types.ts`.
   - Modifikasi `TenantService.createTenant` dan `TenantService.extendDuration` untuk mendukung parameter `amount` dan `unit`.
   - Implementasi logika kalkulasi tanggal kedaluwarsa yang akurat untuk setiap satuan waktu.
2. Tahap 2: Pembaharuan Dashboard Master Admin (admin-frontend):
   - Redesain bagian pemilihan durasi pada `AddTenantModal.tsx` dan `ExtendTenantModal.tsx`.
   - Tambahkan input angka dan dropdown satuan waktu.
   - Tambahkan fitur pratinjau (preview) tanggal kedaluwarsa secara real-time sebelum data dikirim.
3. Tahap 3: Verifikasi & Dokumentasi:
   - Jalankan `compile_applet` dan `lint_applet`.
   - Verifikasi ketepatan perhitungan waktu di database master.
   - Catat hasil di `PROGRESS.md`.

Hasil yang Diharapkan:
Admin dapat menetapkan masa aktif tenant dengan sangat presisi (misal: 15 menit atau 1 bulan) langsung dari antarmuka Dashboard Master.

---

[30.0] - KUSTOMISASI LENGKAP RESPON BOT: TEMPLATE MASTER & BOT DASHBOARD, KATEGORI BARU, DAN PLACEHOLDER DINAMIS

- Tanggal: 2026-11-10 12:56
- Status: Completed

Tujuan:
Menerapkan kustomisasi penuh pada seluruh respon bot yang sebelumnya masih hardcoded di backend, menyediakan template siap pakai yang dapat diedit di Dashboard Master dan Dashboard Bot, mengatur kategori pesan secara terisolasi (anti-campur), dan melengkapi dukungan variabel placeholder dinamis beserta penjelasannya.

Rencana:
1. Tahap 1: Pembaharuan Skema Tipe Data & Placeholder Helper:
   - Perluas interface `CommandsConfig` di `backend/types/bot.types.ts` dan `frontend/src/types/dashboard.types.ts`.
   - Perbarui `backend/services/placeholderHelper.ts` untuk menangani placeholder baru: `{customerName}`, `{senderName}`, `{customerNumber}`, `{senderNumber}`, `{errorMessage}`, `{reason}`, `{remainingTime}`, `{sisaWaktu}`, `{expiryDate}`, `{waktuKedaluwarsa}`, `{tenantId}`.
2. Tahap 2: Pembaharuan Database Master & Backend Template:
   - Perluas union `TemplateCategory` pada `admin-backend/types/admin.types.ts`, `admin-backend/services/templateService.ts`, dan `admin-frontend/src/types/admin.types.ts`.
   - Seed default templates di `admin-backend/database/masterSqlite.ts` untuk 11 kategori baru.
   - Perbarui `backend/config/configManager.ts` untuk memuat dan menyimpan konfigurasi respon bot baru ke SQLite per-tenant.
3. Tahap 3: Penggantian Pesan Hardcoded di Bot Handlers:
   - `backend/handlers/messageDispatcher.ts`: Notifikasi pembayaran sukses DM & Grup, pembayaran expired, error gateway QRIS, notif grup redirect DM, stok habis, sesi checkout expired, pembatalan promo.
   - `backend/messages/carouselMessage.ts`: Pesan stok habis seluruh varian.
   - `backend/messages/adminContactMessage.ts`: Pesan status kontak owner dan admin belum disetel.
   - `backend/services/expiryWarningService.ts`: Pesan pengingat masa sewa kedaluwarsa ke owner tenant.
4. Tahap 4: Pembaharuan Antarmuka Dashboard Master Admin (`admin-frontend`):
   - Tambahkan filter pills dan badge warna untuk kategori-kategori baru di `TabTemplates.tsx`.
   - Tambahkan opsi kategori baru, deskripsi fungsi, dan chip placeholder di `AddEditTemplateModal.tsx`.
5. Tahap 5: Pembaharuan Antarmuka Dashboard Bot Tenant (`frontend`):
   - Perbarui `useStoreConfig.ts` untuk state, initial load, dan sync server konfigurasi baru.
   - Perbarui `TemplatePickerModal.tsx` agar mendukung kategori-kategori baru.
   - Tambahkan sub-tabs terorganisir di `TabCommand.tsx` ('Transaksi', 'Notifikasi', 'Kontak') dengan tombol 'Pilih Template', chip tag placeholder, dan tombol Simpan.
6. Tahap 6: Verifikasi & Dokumentasi:
   - Jalankan `compile_applet` dan `lint_applet`.
   - Pastikan bebas em-dash (-) dan en-dash (-).
   - Catat hasil implementasi di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Seluruh respon pesan bot dapat dikustomisasi 100% oleh masing-masing tenant, Master Admin dapat menyediakan template bawaan berkualitas tinggi untuk tiap kategori, dan setiap pesan kaya akan placeholder dinamis yang akurat.
