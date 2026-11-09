# Dokumentasi & Spesifikasi Integrasi API Payment Gateway SairiBot (SairiPedia)

Dokumen ini berisi rangkuman komprehensif hasil analisis dan pengujian langsung dari dokumentasi API Payment Gateway **SairiPedia** yang dapat diakses melalui [https://api.sairibot.my.id/docs](https://api.sairibot.my.id/docs).

---

## 1. Ringkasan Platform & Layanan

- **Nama Layanan**: SairiPedia API Payment Gateway
- **Base URL**: `https://api.sairibot.my.id`
- **Tipe Integrasi**: Lightweight REST API (berbasis HTTP `GET` query-driven)
- **Metode Pembayaran Utama**: **QRIS Dinamis (All Payment)**
  - Mendukung seluruh e-Wallet: GoPay, OVO, DANA, ShopeePay, LinkAja, AstraPay, dll.
  - Mendukung Seluruh Mobile Banking: BCA Mobile, Livin' by Mandiri, BRImo, BNI Mobile, Seabank, Bank Jago, dll.
- **Karakteristik & Keunggulan**:
  - **Aktivasi Instant**: Merchant dapat langsung menerima pembayaran QRIS tanpa verifikasi rumit berhari-hari.
  - **Arsitektur Minimalis**: Terdiri dari 3 endpoint utama yang simpel tanpa payload kompleks.
  - **Real-Time Settlement**: Pembayaran pelanggan langsung masuk ke saldo akun merchant secara otomatis.
  - **Instant Withdrawal**: Penarikan saldo dapat diproses dengan cepat melalui dashboard.

---

## 2. Autentikasi & Keamanan

### 2.1. Memperoleh API Key
1. Kunjungi [https://api.sairibot.my.id](https://api.sairibot.my.id) dan buat akun (atau login).
2. Masuk ke menu **Profil**.
3. Salin **API Key** unik akun Anda.

### 2.2. Cara Mengirimkan API Key
Backend SairiPedia mendukung autentikasi melalui dua metode:

1. **Query Parameter (Standar Resmi Dokumentasi)**:
   ```
   ?apikey=YOUR_API_KEY
   ```
2. **HTTP Header (Terverifikasi dari Pengujian Backend)**:
   ```http
   x-api-key: YOUR_API_KEY
   ```

### 2.3. Respon Error Terkait Autentikasi
| HTTP Status | Respon JSON | Keterangan |
| :--- | :--- | :--- |
| `401 Unauthorized` | `{"error": "API key diperlukan"}` | Parameter atau header `apikey` tidak disertakan dalam request. |
| `401 Unauthorized` | `{"error": "API key tidak valid"}` | `apikey` yang dikirimkan salah, tidak terdaftar, atau tidak aktif. |

> **⚠️ PENTING (Security Best Practice)**:
> Jangan pernah memanggil API SairiPedia langsung dari kode sisi klien (Frontend React/Vue/Aplikasi Mobile) menggunakan API Key Anda, karena kunci rahasia dapat dibaca oleh publik melalui inspect element/network tab. Selalu gunakan server backend sebagai proxy (Express/Node.js, Laravel, Go, dll.) dan simpan API Key di file `.env`.

---

## 3. Spesifikasi Lengkap Endpoint API

### 3.1. Cek Saldo Akun (Balance)
Digunakan untuk memeriksa saldo akun merchant secara *real-time* yang siap ditarik (withdraw).

- **Method**: `GET`
- **Endpoint**: `/api/balance`
- **URL Lengkap**: `https://api.sairibot.my.id/api/balance`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/balance?apikey=YOUR_API_KEY
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "balance": 150000
}
```

---

### 3.2. Membuat Invoice Baru (Generate QRIS Dinamis)
Digunakan untuk membuat transaksi baru dan menghasilkan QRIS dinamis unik sesuai nominal yang ditentukan.

- **Method**: `GET`
- **Endpoint**: `/api/invoice`
- **URL Lengkap**: `https://api.sairibot.my.id/api/invoice`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |
| `amount` | `integer` | **Ya** | Nominal dasar pembayaran dalam Rupiah (contoh: `50000`) |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/invoice?apikey=YOUR_API_KEY&amount=50000
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "success": true,
  "invoice_id": "64c8d9e1a2b3c4d5e6f7a8b9",
  "amount": 50000,
  "fee": 500,
  "total": 50500,
  "qris_image": "https://api.sairibot.my.id/qris/...",
  "expired_at": "2025-01-01 12:00:00"
}
```

#### Struktur Kolom Respon
- `success` (`boolean`): Indikator status pembuatan invoice (`true` jika berhasil).
- `invoice_id` (`string`): ID unik transaksi yang digunakan untuk referensi pelacakan dan verifikasi status pembayaran.
- `amount` (`number`): Nominal transaksi awal yang diajukan oleh merchant/pengguna.
- `fee` (`number`): Biaya layanan transaksi / admin fee.
- `total` (`number`): Total nominal akhir yang wajib dibayar pelanggan saat memindai QRIS (`amount` + `fee`).
- `qris_image` (`string`): URL gambar QRIS dinamis yang siap ditampilkan di antarmuka pengguna (UI).
- `expired_at` (`string`): Batas waktu toleransi pembayaran QRIS (format: `YYYY-MM-DD HH:mm:ss`).

---

### 3.3. Cek Status Invoice (Verifikasi Pembayaran)
Setelah invoice dibuat dan pengguna memindai QRIS, endpoint ini dipanggil untuk mengecek apakah pembayaran telah berhasil diselesaikan oleh pembeli.

- **Method**: `GET`
- **Endpoint**: `/api/invoice/status`
- **URL Lengkap**: `https://api.sairibot.my.id/api/invoice/status`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |
| `invoice_id` | `string` | **Ya** | ID invoice yang didapatkan saat pembuatan invoice |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/invoice/status?apikey=YOUR_API_KEY&invoice_id=64c8d9e1a2b3c4d5e6f7a8b9
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "invoice_id": "64c8d9e1a2b3c4d5e6f7a8b9",
  "amount": 50000,
  "fee": 500,
  "total": 50500,
  "status": "paid",
  "qris_image": "https://api.sairibot.my.id/qris/...",
  "expired_at": "2025-01-01 12:00:00",
  "created_at": "2025-01-01 11:30:00"
}
```

#### Nilai Status Transaksi (`status`)
| Status | Penjelasan |
| :--- | :--- |
| `unpaid` / `pending` | Pengguna belum melakukan transfer/scan atau pembayaran belum terkonfirmasi oleh sistem bank. |
| `paid` | Pembayaran telah lunas diterima. Saldo telah masuk ke akun merchant, proses pemenuhan pesanan dapat dijalankan. |
| `expired` | Waktu pembayaran telah melewati `expired_at` dan transaksi dibatalkan secara otomatis. |

---

## 4. Alur Kerja Integrasi Sistem (Lifecycle & Polling)

Karena API SairiPedia berfokus pada kesederhanaan (tidak mewajibkan webhook URL yang rumit), arsitektur integrasinya menggunakan alur **Long Polling / Periodic Interval Checking**:

```
[ Pelanggan / User ]         [ Backend Aplikasi Anda ]          [ API SairiPedia ]
        |                               |                              |
        | 1. Memilih Produk & Bayar     |                              |
        |------------------------------>|                              |
        |                               | 2. GET /api/invoice          |
        |                               |    ?apikey=KEY&amount=TOTAL  |
        |                               |----------------------------->|
        |                               | 3. Kembalikan Invoice Data   |
        |                               |<-----------------------------|
        | 4. Tampilkan Gambar QRIS      |                              |
        |<------------------------------|                              |
        |                               |                              |
        | 5. Pelanggan Scan & Bayar     |                              |
        |    (via e-wallet / m-banking) |                              |
        |                               | 6. Interval Polling (tiap 3-5 detik)
        |                               |    GET /api/invoice/status   |
        |                               |----------------------------->|
        |                               |<-----------------------------|
        |                               |    Response: "status": "unpaid"
        |                               |                              |
        |                               |    ... (Setelah bayar) ...   |
        |                               |    GET /api/invoice/status   |
        |                               |----------------------------->|
        |                               |<-----------------------------|
        |                               |    Response: "status": "paid"|
        |                               |                              |
        | 7. Notifikasi Pembayaran      | 8. Update DB (Order Success) |
        |    Berhasil (Lunas)           |    & Kirim Produk/Fitur      |
        |<------------------------------|------------------------------|
```

### Tips Pengaturan Polling:
1. **Interval**: Atur interval polling status antara **3 sampai 5 detik** agar tidak terjadi rate-limiting namun tetap responsif bagi pengguna.
2. **Auto-Stop saat Expired**: Bandingkan waktu sekarang dengan `expired_at`. Jika waktu telah lewat atau status bernilai `expired`, hentikan interval pengecekan dan infokan kepada pembeli bahwa transaksi telah kedaluwarsa.
3. **Auto-Stop saat Paid**: Segera hentikan polling saat status `paid` diterima untuk menghemat resource server.

---

## 5. Contoh Implementasi Kode (Production-Ready)

### 5.1. Implementasi Node.js / TypeScript (Service Class)

```typescript
// services/sairiPayment.ts

interface CreateInvoiceResponse {
  success: boolean;
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  qris_image: string;
  expired_at: string;
}

interface InvoiceStatusResponse {
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  status: 'unpaid' | 'pending' | 'paid' | 'expired';
  qris_image: string;
  expired_at: string;
  created_at: string;
}

export class SairiPaymentService {
  private baseUrl = 'https://api.sairibot.my.id';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Cek saldo akun SairiPedia
   */
  async getBalance(): Promise<number> {
    const url = `${this.baseUrl}/api/balance?apikey=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.balance;
  }

  /**
   * Buat invoice QRIS dinamis baru
   */
  async createInvoice(amount: number): Promise<CreateInvoiceResponse> {
    if (amount <= 0) {
      throw new Error('Nominal amount harus lebih besar dari 0');
    }
    const url = `${this.baseUrl}/api/invoice?apikey=${encodeURIComponent(this.apiKey)}&amount=${amount}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Gagal membuat invoice: HTTP ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Cek status pembayaran transaksi
   */
  async checkInvoiceStatus(invoiceId: string): Promise<InvoiceStatusResponse> {
    const url = `${this.baseUrl}/api/invoice/status?apikey=${encodeURIComponent(this.apiKey)}&invoice_id=${encodeURIComponent(invoiceId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Gagal cek status: HTTP ${response.status}`);
    }
    return await response.json();
  }
}
```

---

### 5.2. Implementasi Python

```python
import requests

class SairiPayment:
    BASE_URL = "https://api.sairibot.my.id"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_balance(self):
        url = f"{self.BASE_URL}/api/balance"
        resp = requests.get(url, params={"apikey": self.api_key})
        resp.raise_for_status()
        return resp.json().get("balance", 0)

    def create_invoice(self, amount: int):
        url = f"{self.BASE_URL}/api/invoice"
        resp = requests.get(url, params={"apikey": self.api_key, "amount": amount})
        resp.raise_for_status()
        return resp.json()

    def check_status(self, invoice_id: str):
        url = f"{self.BASE_URL}/api/invoice/status"
        resp = requests.get(url, params={"apikey": self.api_key, "invoice_id": invoice_id})
        resp.raise_for_status()
        return resp.json()
```

---

### 5.3. Contoh Request cURL

```bash
# 1. Cek Saldo
curl -X GET "https://api.sairibot.my.id/api/balance?apikey=YOUR_API_KEY"

# 2. Buat Invoice QRIS
curl -X GET "https://api.sairibot.my.id/api/invoice?apikey=YOUR_API_KEY&amount=25000"

# 3. Cek Status Invoice
curl -X GET "https://api.sairibot.my.id/api/invoice/status?apikey=YOUR_API_KEY&invoice_id=INVOICE_ID"
```

---

## 6. Rangkuman & Rekomendasi Integrasi

1. **Format Request Seragam**: Semua interaksi API saat ini menggunakan protokol `HTTP GET` dengan query parameters.
2. **Kesesuaian Fitur**: Sangat cocok untuk:
   - Bot WhatsApp / Telegram transaksi otomatis.
   - Toko digital, top up voucher game, dan sistem deposit saldo member.
   - SaaS atau donasi instan.
3. **Penyimpanan Lokal**: Rekomendasikan menyimpan riwayat setiap transaksi ke database lokal dengan schema:
   - `order_id` (ID pesanan lokal)
   - `sairi_invoice_id` (ID invoice dari SairiPedia)
   - `user_id` / `phone_number`
   - `amount` (Nominal produk)
   - `fee` (Biaya admin)
   - `total` (Total tagihan QRIS)
   - `qris_image_url`
   - `status` (`pending`, `paid`, `expired`)
   - `created_at` & `expired_at`

---

# Dokumentasi & Spesifikasi Lengkap Integrasi LunasQRIS API (lunasqris.com)

Dokumen ini berisi rangkuman komprehensif hasil analisis mendalam dari dokumentasi resmi **LunasQRIS** ([https://lunasqris.com/docs](https://lunasqris.com/docs)).

---

## 1. Ringkasan Platform & Layanan
- **Nama Layanan**: LunasQRIS Payment Gateway
- **Base URL**: `https://lunasqris.com`
- **Tipe Integrasi**: Standar REST API (JSON Body & Header-based Authentication)
- **Basis Sistem**: Payment gateway QRIS berbasis DANA Bisnis dengan sistem deteksi mutasi otomatis dan kode unik transaksi.
- **Mata Uang**: Seluruh nilai nominal uang dalam Rupiah (`IDR`), bilangan bulat tanpa desimal (`integer`).

---

## 2. Autentikasi & Model Keamanan
LunasQRIS menggunakan model pemisahan kunci ganda (*Dual-Key Architecture*):

1. **API Key / Public Key (`pk_...`)**:
   - Disertakan pada **setiap request API** dari server aplikasi.
   - Header:
     ```http
     X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
     ```
     atau:
     ```http
     Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxx
     ```
   - Diperoleh dari Panel Toko LunasQRIS › Menu **API & Integrasi**.

2. **Secret Key (`sk_...`)**:
   - **HANYA** digunakan di sisi server untuk memvalidasi tanda tangan kriptografi (*HMAC-SHA256 signature*) pada Webhook/Callback.
   - ⚠️ **Dilarang keras**: Jangan pernah mengirim `sk_...` pada request API keluar atau mengeksposnya ke frontend klien.

---

## 3. Spesifikasi Lengkap Endpoint REST API

### 3.1. Buat Transaksi QRIS Dinamis (Create Transaction)
Digunakan saat pembeli melakukan checkout produk untuk menerbitkan tagihan QRIS dinamis unik.

- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/create`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json
  ```
- **Payload Request (JSON Body)**:
  | Field | Tipe | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `amount` | `integer` | **Ya** | Nominal dasar pembayaran dalam Rupiah. Kode unik ditambahkan otomatis oleh sistem toko. |
  | `order_id` | `string` | Tidak | ID pesanan unik di sistem toko (misal: `INV-20261026-001`). Pemanggilan ulang bersifat idempoten. |
  | `description` | `string` | Tidak | Deskripsi singkat pembelian (tampil pada web checkout). |
  | `customer_name` | `string` | Tidak | Nama pembeli. |
  | `customer_email` | `string` | Tidak | Email pembeli. |
  | `callback_url` | `string` | Tidak | Mengganti (*override*) URL webhook default toko untuk transaksi spesifik ini. |
  | `return_url` | `string` | Tidak | URL tujuan saat pembeli menekan tombol "Kembali ke Toko". |
  | `expired_minutes` | `integer` | Tidak | Batas waktu kedaluwarsa tagihan (rentang 1–1440 menit). Jika tidak diisi, mengikuti default panel toko. |
  | `metadata` | `object/string` | Tidak | Data kustom tambahan (maks 2KB) yang akan dikembalikan kembali pada callback. |

- **Contoh Request cURL**:
  ```bash
  curl -X POST https://lunasqris.com/api/v1/transaction/create \
    -H "X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 25000,
      "order_id": "INV-20261026-001",
      "description": "Beli Akun Netflix Premium 1 Bulan",
      "customer_name": "Wanzt",
      "expired_minutes": 15
    }'
  ```

- **Contoh Respon Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "trx_id": "TKO2610A1B2C3",
      "order_id": "INV-20261026-001",
      "amount": 25000,
      "unique_code": 117,
      "total_amount": 25117,
      "status": "pending",
      "qris_string": "00020101021226...6304AB12",
      "qr_url": "https://lunasqris.com/qr/TKO2610A1B2C3.svg",
      "payment_url": "https://lunasqris.com/pay/TKO2610A1B2C3",
      "expired_at": "2026-10-26T08:45:00.000Z"
    }
  }
  ```

- **Elemen Respon Penting**:
  - `total_amount`: Total nominal akhir yang **wajib dibayar tepat** oleh pembeli (`amount` + `unique_code`).
  - `qris_string`: String raw format EMVCo QRIS. Sangat fleksibel karena dapat diubah langsung menjadi gambar QR code di bot WhatsApp menggunakan generator buffer lokal, atau ditampilkan via SVG `qr_url`.
  - `qr_url`: URL langsung ke file SVG gambar QR code.
  - `payment_url`: Halaman web checkout instan responsif lengkap dengan hitung mundur (*countdown timer*) dan auto-check status.

---

### 3.2. Cek Status Transaksi (Check Transaction Status)
Digunakan untuk mengecek status transaksi terbaru secara on-demand / polling.

- **Method**: `GET`
- **Endpoint**:
  - Berdasarkan Order ID: `/api/v1/transaction/status?order_id={order_id}`
  - Berdasarkan ID Transaksi LunasQRIS: `/api/v1/transaction/{trx_id}`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  ```
- **Nilai Status (`status`)**:
  - `pending`: Menunggu pembayaran dari pembeli.
  - `paid`: Pembayaran lunas terverifikasi otomatis.
  - `expired`: Waktu pembayaran telah habis dan transaksi otomatis hangus.
  - `cancelled`: Transaksi dibatalkan secara manual.

---

### 3.3. Cek Saldo Toko (Check Merchant Balance)
Digunakan untuk memeriksa saldo penerimaan merchant di LunasQRIS.

- **Method**: `GET`
- **Endpoint**: `/api/v1/balance`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  ```
- **Contoh Respon Berhasil**:
  ```json
  {
    "success": true,
    "data": {
      "balance": 250000,
      "balance_hold": 15000
    }
  }
  ```

---

### 3.4. Batalkan Transaksi (Cancel Transaction)
Digunakan jika pembeli membatalkan pesanan atau ingin mengganti pilihan produk sebelum masa aktif habis.

- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/cancel`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json
  ```
- **Payload Request**:
  ```json
  {
    "trx_id": "TKO2610A1B2C3"
    // atau "order_id": "INV-20261026-001"
  }
  ```

---

### 3.5. Daftar Riwayat Transaksi (List Transactions)
- **Method**: `GET`
- **Endpoint**: `/api/v1/transactions?page=1&limit=20&status=paid`
- **Query Params**: `page`, `limit`, `status`.

---

## 4. Mekanisme Webhook / Callback & Verifikasi Signature

Saat status transaksi berubah menjadi lunas (`paid`) atau kedaluwarsa (`expired`), server LunasQRIS akan mengirimkan HTTP `POST` ke Callback URL toko. Pengiriman akan diulang hingga 7 kali dengan jeda bertingkat (*exponential backoff*) sampai server merespons HTTP `200 OK`.

### 4.1. Header Webhook yang Dikirimkan:
- `X-Callback-Event`: `transaction.paid` atau `transaction.expired`
- `X-Callback-Timestamp`: UNIX timestamp detik (contoh: `1760500000`)
- `X-Callback-Signature`: Hasil enkripsi hash HMAC-SHA256

### 4.2. Payload Webhook:
```json
{
  "event": "transaction.paid",
  "data": {
    "trx_id": "TKO2610A1B2C3",
    "order_id": "INV-20261026-001",
    "status": "paid",
    "amount": 25000,
    "total_amount": 25117,
    "net_amount": 24941,
    "paid_at": "2026-10-26T08:35:12.000Z",
    "paid_via": "notif"
  }
}
```

### 4.3. Algoritma Verifikasi Signature (Node.js / Express):
```javascript
const crypto = require('crypto');

function verifyLunasQrisSignature(req, secretKey) {
  const timestamp = req.header('X-Callback-Timestamp');
  const signature = req.header('X-Callback-Signature');
  const rawBody = req.rawBody; // Wajib raw string body asli sebelum di-JSON.parse

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return signature === expectedSignature;
}
```

---

## 5. Analisis Perbandingan: SairiPedia vs LunasQRIS

| Parameter / Fitur | SairiPedia API | LunasQRIS API |
| :--- | :--- | :--- |
| **Metode Permintaan** | Berbasis `GET` query param (`?apikey=...&amount=...`) | Berbasis standar REST `POST` JSON body & Header Authorization |
| **Sistem Autentikasi** | 1 Kunci (`apikey` tunggal) | 2 Kunci: Public API Key (`pk_...`) untuk request & Secret Key (`sk_...`) untuk verifikasi webhook |
| **Output QRIS** | Hanya URL gambar QR (`qris_image`) | Raw `qris_string` EMVCo + SVG image `qr_url` + Web checkout `payment_url` |
| **Sistem Kode Unik** | Ditentukan manual / flat fee | Otomatis dibuatkan `unique_code` + `total_amount` |
| **Batas Waktu Kedaluwarsa** | Tetap dari server Sairi | Dinamis per transaksi (`expired_minutes`: 1–1440) |
| **Fitur Pembatalan** | Tidak tersedia di API | Tersedia (`POST /api/v1/transaction/cancel`) |
| **Deteksi Pembayaran** | Polling interval manual (tiap 3-5 detik) | Mendukung **Webhook/Callback real-time** dengan HMAC-SHA256 signature + Dukungan Polling Status |
| **Fitur Cek Saldo** | `/api/balance` (hanya saldo aktif) | `/api/v1/balance` (menampilkan saldo aktif & saldo hold) |

---

## 6. Rencana Desain Penerapan di Bot Wanzt Store (Jika Disetujui)

Jika nanti pengguna menyetujui migrasi, alur teknis penerapannya adalah sebagai berikut:

1. **Penyimpanan Konfigurasi (`database/api_config.json`)**:
   - Menambahkan field `lunasQrisApiKey` (format `pk_...`) dan `lunasQrisSecretKey` (format `sk_...`).
   - Menyediakan opsi pemilihan provider aktif: `"paymentProvider": "lunasqris"` atau `"sairi"`.

2. **Dashboard UI (Tab Connection)**:
   - Menambahkan card konfigurasi **LunasQRIS** lengkap dengan field input API Key (`pk_...`), Secret Key (`sk_...`), status koneksi, dan tombol tes koneksi (cek saldo).
   - Opsi toggle switch memilih gateway utama (LunasQRIS vs Sairi).

3. **Backend Proxy Server (Vite / Express Middleware)**:
   - Endpoint proxy:
     - `POST /api/lunasqris/transaction/create`
     - `GET /api/lunasqris/transaction/status`
     - `GET /api/lunasqris/balance`
     - `POST /api/lunasqris/transaction/cancel`
     - `POST /api/lunasqris/webhook` (Endpoint penerima callback webhook)

4. **Kustom Hook Frontend (`useLunasQrisData.ts`)**:
   - Mengelola state transaksi, pembuatan invoice, dan cek status pembayaran LunasQRIS secara reaktif di dashboard.

5. **Logika Transaksi WhatsApp (Bot Engine)**:
   - Memanfaatkan `qris_string` untuk membuat gambar QR code beresolusi tinggi langsung di memory, atau mengirim `qr_url` ke chat pribadi pembeli (DM).
   - Memanfaatkan `payment_url` sebagai tombol tautan alternatif (*Native Flow button `cta_url`*) agar pembeli dapat membuka halaman bayar di browser jika ingin melihat timer hitung mundur.
   - Menggunakan sistem polling berkala (tiap 4-5 detik) atau webhook instan untuk mendeteksi `status: "paid"`, lalu mengeksekusi order produk ke Xaviera API dan mengirimkan akun ke DM pembeli.


---

[3.0] - ANALISIS FORMAT PROTOKOL PESAN BAILEYS WHATSAPP (VCARD, LIST TITLE, CAROUSEL HEADER)

- Tanggal: 2026-11-01 18:54
- Sumber: Eksplorasi & Kode Sumber Baileys WhatsApp

Informasi yang Dipelajari:
1. Normalisasi Nomor Telepon Indonesia untuk vCard:
   vCard versi 3.0 pada WhatsApp membutuhkan format internasional penuh pada parameter `waid` dan `TEL` (contoh: `waid=6282173515807:+6282173515807`). Jika pengguna menginput nomor lokal (contoh: `82173515807` atau `082173515807`), sistem harus otomatis mengonversi awalan menjadi `628...` agar tautan kartu kontak dapat diklik langsung di WhatsApp.

2. Atribut Judul dan Body pada Pesan Interaktif List WhatsApp:
   Pada pengiriman pesan `sock.sendMessage(jid, { text, title, footer, buttonText, sections })`, field `title` selalu ditampilkan WhatsApp di posisi paling atas mendahului `text`. Jika `title` diisi statis dengan "{storeName} - Katalog Produk", WhatsApp akan selalu menampilkannya di paling atas terlepas dari isi template teks kustom pengguna. Selain itu, daftar teks produk (`daftarProdukText`) hanya boleh disubstitusikan jika tag `{daftarProduk}` ada dalam template.

3. Atribut Header pada Kartu Pesan Interaktif Carousel WhatsApp:
   Setiap kartu dalam `carouselMessage.cards` merupakan objek `InteractiveMessage` yang memiliki `header` (`title`, `subtitle`, `imageMessage`) dan `body` (`text`). WhatsApp merender `header.title` dan `header.subtitle` tepat di atas `body.text`. Jika `header.title` diisi `variant` dan `header.subtitle` diisi `category`, maka teks tersebut akan terpampang di atas template body kustom pengguna.

Pemahaman:
Memisahkan kontrol antara metadata teknis WhatsApp dengan teks kustom pengguna. Field yang tidak diminta oleh pengguna tidak boleh di-hardcode dengan teks buatan sistem.

Potensi Penerapan:
1. Membuat fungsi pembantu `normalizePhoneNumber(rawNumber)` untuk digunakan pada seluruh pembuatan vCard (Owner, Admin, Invoice Admin).
2. Memperbarui `listMessage.ts` agar hanya mengisi daftar produk jika tag `{daftarProduk}` ada, serta tidak memaksakan teks title jika pengguna tidak mengaturnya.
3. Memperbarui `carouselMessage.ts` agar mengosongkan `cardHeader.title` dan `cardHeader.subtitle` jika media gambar telah terpasang, sehingga urutan tampilan murni mengikuti template teks pengguna.

Catatan Tambahan:
Pastikan pengujian build dan typecheck tetap valid.

---

[4.0] - ANALISIS STATUS FILE DATABASE JSON PASCA MIGRASI SQLITE

- Tanggal: 2026-11-01 19:15
- Sumber: Eksplorasi & Audit Kode Sumber Backend

Informasi yang Dipelajari:
1. Status File Database JSON:
   Seluruh file `.json` di dalam folder `/database/` dan `/backend/database/` (`api_config.json`, `auth.json`, `command_*.json`, `groups_config.json`, `store_info.json`, `transactions.json`) merupakan artefak database lama sebelum sistem dimigrasikan ke SQLite.
2. Arsitektur Aktif Saat Ini:
   Seluruh modul backend (`authManager.ts`, `configManager.ts`, `groupService.ts`, `transactionManager.ts`, `sqlite.ts`) membaca dan menulis langsung ke SQLite file tunggal `/database/bot.db` (dengan mode WAL: `bot.db-shm` dan `bot.db-wal`).
3. File JSON Tidak Lagi Digunakan:
   Fungsi auto-migrasi `migrateExistingJsonData()` pada `backend/database/sqlite.ts` hanya memeriksa keberadaan file JSON secara aman (`fs.existsSync`) sebagai fallback jika tabel SQLite masih kosong. Mengingat tabel SQLite sudah terisi data lengkap dan berjalan aktif, file-file JSON tersebut sudah 100% usang (stale) dan aman untuk dihapus.

Pemahaman:
Menghapus file-file JSON lama akan mencegah redundansi data dan menghindari kebingungan antara data aktif di SQLite dengan snapshot statis lama di JSON.

Potensi Penerapan:
File-file JSON lama dapat dihapus tanpa mengganggu jalannya aplikasi, dengan tetap mempertahankan file kode `backend/database/sqlite.ts` dan database aktif `/database/bot.db*`.

Catatan Tambahan:
Jangan menghapus `backend/database/sqlite.ts` karena file tersebut adalah modul koneksi dan operasi database SQLite utama.

---

[5.0] - ANALISIS & ARSITEKTUR FITUR APARTEMEN (MULTI-TENANT & MASTER ADMIN SAAS)

- Tanggal: 2026-11-01 19:38
- Sumber: Pengguna & Roadmap Proyek (Tahap 4)

Informasi yang Dipelajari:
1. Konsep "Fitur Apartemen":
   Sistem arsitektur Multi-Tenant berbasis analogi apartemen:
   - Super Admin / Pengelola Apartemen: Memiliki portal Master Admin khusus (`/adminutama` atau portal terproteksi) untuk mengontrol seluruh unit penyewa (tenants).
   - Unit Apartemen (Tenant): Penyewa bot yang menyewa layanan bot WhatsApp dalam durasi tertentu (misal: 30 hari, 90 hari, 365 hari).
2. Peran & Hak Akses:
   - Master Admin:
     - Membuat unit apartemen / tenant baru (Nama Toko/Penyewa, Username, Password, No WhatsApp, Paket, Durasi Hari Sewa).
     - Memantau status sewa: Aktif (Active), Kedaluwarsa (Expired), Dibekukan (Suspended).
     - Menambah / memperpanjang masa sewa (+7 hari, +30 hari, +90 hari, atau tanggal kustom).
     - Mengubah status suspend / aktifkan kembali.
     - Reset password akun penyewa atau hapus unit apartemen.
     - Melihat statistik sewa global (Total Unit, Unit Aktif, Unit Expired, Unit Suspended).
   - Penyewa (Tenant):
     - Memiliki portal login sendiri.
     - Mengelola toko mereka sendiri (Profil Toko, Respon Bot, Harga Produk, Saldo LunasQRIS/Xaviera, Whitelist Grup).
     - Memiliki sesi WhatsApp tersendiri (*multi-session isolation*).
     - Jika masa sewa kedaluwarsa atau disuspend oleh Master Admin, dashboard penyewa otomatis terkunci dengan notifikasi "Masa Sewa Unit Apartemen Telah Berakhir - Hubungi Admin Utama untuk Perpanjangan".
3. Struktur Data SQLite:
   - Tabel `tenants`: Menyimpan id unit, nama, username, password_hash, salt, no_wa, paket, durasi, tanggal_mulai, tanggal_kedaluwarsa, status, max_groups.
   - Tabel `master_admin`: Menyimpan kredensial otentikasi aman akun Super Admin.
   - Data tenant tersinkronisasi dan backward-compatible dengan tenant default (`tenant-default` / unit utama Wanzt Store).

Pemahaman:
Model ini mengubah bot toko tunggal menjadi platform Multi-Tenant (Software as a Service) siap jual. Pemilik server dapat menyewakan bot WhatsApp ke banyak pedagang lain sekaligus dengan sistem manajemen sewa otomatis.

Potensi Penerapan:
1. Menyiapkan skema database relasional di SQLite (`tenants` dan `master_admin`).
2. Membuat backend service & controller untuk autentikasi master admin dan manajemen CRUD tenant.
3. Menyediakan portal UI Master Admin (`/adminutama` atau tombol akses Super Admin di Dashboard) dengan antarmuka modern, kartu ringkasan sewa, tabel unit apartemen, modal tambah unit, modal perpanjang masa sewa, dan tombol aksi suspend/delete.
4. Menerapkan middleware validasi masa sewa pada setiap request tenant.

Catatan Tambahan:
Desain antarmuka harus tetap mematuhi prinsip anti-AI slop (kontras tinggi, WCAG AA, bebas em-dash, tanpa gradient ungu berlebihan, dan responsif di desktop maupun mobile).

---

[6.0] - DESAIN ARSITEKTUR TAHAP 4: MULTI-DOMAIN, STRUKTUR FOLDER TERISOLASI, DAN DATABASE-PER-TENANT (FITUR APARTEMEN)

- Tanggal: 2026-11-01 23:45
- Sumber: Diskusi Pengguna & Konsensus Arsitektur Perangkat Lunak

Informasi yang Dipelajari:
1. Pemisahan Domain Mandiri (Multi-Domain / Subdomain Separation):
   - Dashboard Pengguna / Toko: Berjalan di domain `dashboard.wanma2.my.id`.
   - Dashboard Master Admin: Berjalan di domain `admin.wanma2.my.id`.
   - Di server VPS, Nginx Reverse Proxy memisahkan lalu lintas berdasarkan `server_name` menuju antarmuka dan port/layanan masing-masing.
2. Pemisahan Struktur Folder (Monorepo Multi-App Workspace):
   - Folder `frontend/` & `backend/`: Khusus melayani logika, handler bot WhatsApp, dan antarmuka web toko penyewa (tenant).
   - Folder `admin-frontend/` & `admin-backend/`: Khusus melayani logika Super Admin, manajemen lisensi sewa, kontrol proses bot, dan antarmuka Master Admin.
   - Pemisahan ini menjamin tidak ada kebocoran kode internal/rahasia Master Admin ke dalam bundling JavaScript publik pengguna.
3. Arsitektur Database-per-Tenant (Isolasi SQLite per Toko):
   - Tidak menggabungkan data seluruh tenant ke dalam 1 file database tunggal karena berisiko memicu antrean write-lock dan memperlambat pembacaan saat tenant bertambah banyak.
   - Model Hub-and-Spoke:
     - `database/master.db`: Database pusat platform yang hanya diakses oleh `admin-backend/`. Berisi tabel `tenants`, `super_admins`, `subscription_logs`, dan `packages`.
     - `database/tenants/tenant_{tenant_id}.db`: Database fisik mandiri untuk tiap toko penyewa. Berisi tabel operasional toko (`store_config`, `commands_config`, `transactions`, `promo_codes`, `whitelisted_groups`, `pricing_rules`).
     - `auth_info_baileys/tenant_{tenant_id}/`: Folder kredensial sesi WhatsApp Baileys terisolasi per bot toko.
4. Fitur Wajib & Alur Kerja Dashboard Master Admin:
   - Manajemen Tenant: Tabel seluruh penyewa, tambah tenant baru, tombol suspend/bekukan, aktifkan kembali, dan hapus tenant bersih.
   - Fitur Impersonation ("Login sebagai Tenant"): Akses 1-klik ke dashboard toko penyewa tanpa memerlukan password mereka untuk kebutuhan troubleshooting.
   - Kontrol Durasi Sewa & Billing: Hitung mundur sisa hari aktif, perpanjangan masa sewa (+7, +30, +365 hari), otomasi auto-expire (bot berhenti jika expired), dan notifikasi penagihan otomatis H-3 via WhatsApp Bot Master.
   - Multi-Session Bot Manager: Monitoring status koneksi masing-masing bot WhatsApp penyewa, restart instance per-bot, dan reset auth session per-bot tanpa mengganggu tenant lain.
   - Global Overview Metrics: Total tenant aktif/expired, total volume transaksi platform, dan rekap pendapatan sewa.

Pemahaman:
Pola Database-per-Tenant pada SQLite merupakan arsitektur kelas industri yang sangat optimal:
- Zero Concurrency Bottleneck: Masing-masing bot menulis dan membaca database miliknya sendiri tanpa antrean file-lock bersama.
- Isolasi Keamanan 100%: Secara fisik tidak ada kemungkinan kebocoran data antar penyewa toko.
- Kemudahan Pemeliharaan: Backup data, migrasi, perbaikan kerusakan, maupun penghapusan tenant dapat dilakukan pada level file (.db) tunggal tanpa risiko mempengaruhi tenant lainnya.
- Pemisahan subdomain `admin.` dan `dashboard.` mempermudah penerapan lapisan keamanan tambahan (seperti Cloudflare Zero Trust, 2FA, atau IP Whitelist pada portal master).

Potensi Penerapan:
1. Menyiapkan struktur direktori `admin-frontend/` dan `admin-backend/` berdampingan dengan `frontend/` dan `backend/`.
2. Membuat database `database/master.db` beserta helper koneksi dinamis `getTenantDb(tenantId)`.
3. Mengembangkan `botManager` multi-session di backend yang mampu memanajemen lifecycle banyak koneksi Baileys secara paralel.
4. Menyiapkan template Virtual Host Nginx ganda di `deploy-vps.sh` untuk routing `dashboard.wanma2.my.id` dan `admin.wanma2.my.id`.

Catatan Tambahan:
- Setiap pembuatan database tenant baru wajib mengaktifkan mode SQLite WAL (`PRAGMA journal_mode = WAL;`) dan `PRAGMA busy_timeout = 5000;`.
- Middleware autentikasi pada backend tenant wajib memeriksa status `is_active` dan tanggal `expires_at` dari `master.db` sebelum memproses pesan WhatsApp atau akses dashboard.

---

[7.0] - LARANGAN WINDOW.CONFIRM / ALERT DI ENVIRONMENT IFRAME DAN POLA MODAL KONFIRMASI IN-APP

- Tanggal: 2026-11-02 02:48
- Sumber: Pengujian Langsung & Debugging UI Sandbox AI Studio

Informasi yang Dipelajari:
1. Perilaku `window.confirm()` dan `window.alert()` pada Iframe Sandbox:
   - Di lingkungan pratinjau browser modern yang terisolasi dalam iframe (seperti sandbox AI Studio), browser secara default memblokir atau menolak eksekusi `window.confirm()` dan `window.alert()`.
   - Pemanggilan `window.confirm()` langsung mengembalikan nilai `false` secara instan tanpa memunculkan dialog pop-up konfirmasi apapun di layar.
   - Akibatnya, tombol-tombol yang memanggil `if (!window.confirm(...)) return;` (seperti tombol Hapus Tenant dan Suspend/Aktifkan pada Master Admin) terlihat macet atau "tidak dapat diklik" dari sudut pandang pengguna.
2. Solusi Standar Aplikasi Web Modern (In-App Modal Confirmation):
   - Mengganti seluruh dialog bawaan peramban (`window.confirm`) dengan Modal Konfirmasi khusus berbasis React state (misal `tenantToDelete: Tenant | null`).
   - Dialog modal in-app ini 100% aman dari blokir sandbox iframe, memiliki desain dark mode yang selaras dengan tema Master Admin (slate-900 border slate-800), menyajikan informasi unit yang jelas (Nama Toko, ID Unit, Pemilik), serta tombol aksi tegas "Batal" dan "Hapus Permanen".

Pemahaman:
- Seluruh aksi destruktif atau mutasi status (Delete Tenant, Suspend, Reset) wajib menggunakan modal dialog kustom in-app atau inline two-step confirmation.
- Selalu pastikan elemen `<button>` memiliki atribut `type="button"` dan class utilitas kursor `cursor-pointer` agar interaksi klik responsif dan tidak terganggu event bawaan browser.

Potensi Penerapan:
- Menggantikan pemanggilan `window.confirm` pada `handleDeleteTenant` dan `handleToggleStatus` di `admin-frontend/src/App.tsx` dengan modal konfirmasi React in-app.

Catatan Tambahan:
- Desain modal konfirmasi hapus harus memuat peringatan jelas bahwa file database dan kredensial WhatsApp penyewa akan terhapus secara fisik dari server.

---

[8.0] - ISOLASI STATE REACT MULTI-TENANT (CLEAN COMPONENT REMOUNT & PER-TENANT SESSION MANAGEMENT)

- Tanggal: 2026-11-02 03:25
- Sumber: Analisis Lifecycle React Frontend & Multi-Tenant Routing Sandbox

Informasi yang Dipelajari:
1. Masalah Kebocoran State Lifecycle React (Hook Premature Execution):
   - Jika hook bisnis (`useStoreConfig`, `useBotConnection`, `useTransactions`, dsb.) dideklarasikan di level komponen root `App` sebelum kondisi `!auth.isAuthenticated`, hook-hook tersebut langsung tereksekusi saat halaman login pertama kali dimuat.
   - Karena belum ada token otentikasi aktif, hook membaca konteks default (`t_wanzt` / Wanzt Store) dan mengunci state di memori.
   - Saat pengguna berhasil login dengan akun tenant baru (`berkah_erot` / `t_berkahstore_469`), state React tidak ter-reset secara otomatis, menyebabkan data Wanzt Store tetap membekas di layar meskipun token dan database sebenarnya sudah berpindah.
2. Pola Arsitektur Pemisahan Auth Shell dan Tenant Dashboard:
   - Komponen root `App` hanya bertugas mengelola autentikasi (`useAuth`).
   - Seluruh fungsionalitas dashboard toko dipindahkan ke komponen terisolasi `TenantDashboard`.
   - Komponen `TenantDashboard` dirender dengan prop `key={auth.user?.tenantId || auth.user?.username}`.
   - Dengan prop `key` berbasis `tenantId`, React secara native akan menghancurkan (*unmount*) instance lama dan membuat (*mount*) instance baru yang bersih dan terisolasi setiap kali tenant berganti atau login baru terjadi.
3. Keberlangsungan Koneksi Bot WhatsApp saat Logout:
   - Koneksi Baileys socket (`this.sock`) adalah proses server-side jangka panjang yang tersimpan di memori Node.js (`botInstances: Map<string, BotManager>`).
   - Logout di web dashboard hanyalah penghapusan token browser (`localStorage.removeItem`).
   - Oleh karena itu, bot WhatsApp tetap aktif 24 jam melayani pelanggan di background tanpa terpengaruh oleh aksi buka/tutup browser atau logout dari web dashboard.

Pemahaman:
- Pemisahan komponen dashboard dengan `key` unik per tenant menjamin 100% *clean state lifecycle* tanpa risiko kontaminasi data antar penyewa.
- Interface sesi pengguna di frontend harus memuat `tenantId` agar routing dan interseptor API selalu sinkron.

Potensi Penerapan:
- Memisahkan tampilan dashboard toko ke `TenantDashboard.tsx` di `frontend/src/components/dashboard/TenantDashboard.tsx`.
- Memperbarui `App.tsx` agar merender `<TenantDashboard key={auth.user.tenantId} auth={auth} />` saat `auth.isAuthenticated`.
- Memastikan `useAuth` menyimpan dan memperbarui `tenantId` pada state dan `localStorage`.

Catatan Tambahan:
- Penautan sesi bot di folder `auth_info_baileys/tenant_{tenantId}/` sepenuhnya independen dan aman digunakan oleh banyak pemilik toko secara bersamaan.






---

[9.0] - ANALISIS PENYEBAB GAGALNYA PEMUATAN PRODUK XAVIERA (DOMAIN EXPIRED PADA XAVIERA.STORE VS XAVIERASTORE.COM)

- Tanggal: 2026-11-02 03:44
- Sumber: Investigasi Teknis & Pengujian Respon API Xaviera

Informasi yang Dipelajari:
1. Status Domain Resmi Xaviera:
   - Domain lama `https://xaviera.store` telah kedaluwarsa (*expired*) oleh pihak penyedia domain. Ketika aplikasi mengirimkan HTTP request ke endpoint `https://xaviera.store/api/*`, server registrar mengembalikan dokumen HTML:
     `<!doctype html><title>Your domain is expired</title>...`
   - Domain resmi dan aktif dari Xaviera Store saat ini adalah:
     `https://xavierastore.com/api/v1`
2. Dampak Teknis terhadap Endpoint Produk, SMM, dan TopUp:
   - Pada `backend/config/configManager.ts`, nilai default `DEFAULT_API_CONFIG.xavieraBaseUrl` masih mengarah ke domain lama `https://xaviera.store/api`.
   - Ketika pengguna menyimpan konfigurasi API Key Xaviera melalui tab "Koneksi Layanan", input Base URL terisi otomatis dengan `https://xaviera.store/api` dan tersimpan ke tabel `api_config` di database tenant (`t_macam_984.db` atau tenant aktif).
   - Saat backend menjalankan fungsi `fetch(baseUrl + '/products')`, `fetch(baseUrl + '/smm/services')`, atau `fetch(baseUrl + '/games')`, server Xaviera lama merespon dengan status 200 berupa HTML teks domain expired.
   - Pemanggilan `response.json()` memicu fatal parsing error:
     `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`
   - Akibatnya, blok `catch (err)` menangkap error tersebut dan mengembalikan status gagal, sehingga daftar Aplikasi Premium, SMM, dan Top Up menjadi kosong di layar antarmuka pengguna.
3. Hasil Pengujian Verifikasi dengan Domain Baru (`https://xavierastore.com/api/v1`):
   - Pengujian langsung dengan API Key pengguna (`xvs_3bdb31b7...`) ke `https://xavierastore.com/api/v1`:
     - `/me`: Berhasil (200 OK) - Terhubung ke akun "Mine Craft", Saldo Rp 3.529.
     - `/products`: Berhasil (200 OK) - Memuat daftar lengkap ChatGPT, Canva, Netflix, CapCut, Spotify, dll.
     - `/smm/services`: Berhasil (200 OK) - Memuat daftar layanan Instagram Views, TikTok Followers, dll.
     - `/games`: Berhasil (200 OK) - Memuat katalog Mobile Legends, Free Fire, Arena of Valor, dll.
   - Hal ini membuktikan 100% bahwa API Key yang dimasukkan oleh pengguna sudah benar dan valid. Masalah murni disebabkan oleh alamat Base URL yang mengarah ke domain kedaluwarsa `xaviera.store` alih-alih `xavierastore.com/api/v1`.

Pemahaman:
- API Key pengguna tidak bermasalah sama sekali.
- Masalah terletak pada konfigurasi **Base URL** Xaviera yang terisi `https://xaviera.store/api`.
- Begitu Base URL diarahkan ke `https://xavierastore.com/api/v1`, seluruh produk Aplikasi Premium, SMM, TopUp Game, serta saldo akun langsung muncul secara normal.

Potensi Penerapan:
- Memberikan penjelasan transparan dan jelas kepada pengguna mengenai hasil investigasi ini tanpa mengubah kode terlebih dahulu sesuai instruksi.
- Jika pengguna mengizinkan perbaikan, solusi yang dapat dilakukan:
  1. Pengguna dapat langsung mengubah Base URL di form tab "Koneksi Layanan" menjadi `https://xavierastore.com/api/v1` dan klik Simpan.
  2. Atau memperbarui nilai default di `backend/config/configManager.ts` dan database tenant agar otomatis menggunakan `https://xavierastore.com/api/v1`.

Catatan Tambahan:
- Pengguna secara eksplisit meminta: "Jangan ubah kodenya terlebih dahulu". Oleh karena itu, tidak ada perubahan kode yang dilakukan sebelum pengguna memberikan konfirmasi instruksi berikutnya.

---

[10.0] - PRINSIP PENYERAGAMAN FITUR MULTI-TENANT & PERINGKAT ADIL BERBASIS MASA SEWA

- Tanggal: 2026-11-02 04:18
- Sumber: Permintaan Pengguna & Filosofi Layanan Multi-Tenant yang Adil

Informasi yang Dipelajari:
1. Eliminasi Kasta/Tier Layanan:
   - Banyak sistem SaaS menerapkan pembatasan buatan (artificial gating / paywall) seperti "Paket Basic", "Paket Pro", dan "Paket Enterprise" dengan memangkas fitur (misal membatasi whitelist grup atau akses menu).
   - Bagi platform penyewaan bot WhatsApp ini, pengguna menginginkan filosofi yang sepenuhnya setara dan adil (*fair & egalitarian architecture*): setiap penyewa yang menyewa bot mendapatkan kapabilitas terbaik 100% tanpa perbedaan kasta fitur.
2. Peringkat Murni Berdasarkan Masa Sewa (*Rental Duration-Based Ranking*):
   - Satu-satunya pembeda antar unit bot adalah **Masa Sewa** (sisa hari masa aktif sewa bot).
   - Peringkat bot diurutkan dari durasi masa sewa aktif terpanjang (unit dengan komitmen sewa terlama memegang peringkat prioritas atas).
   - Pengelola gedung apartemen bot dapat memantau dengan jelas unit mana yang memiliki masa sewa panjang vs unit yang mendekati tanggal kedaluwarsa tanpa bias nama paket.
3. Dampak pada Antarmuka & Skema Data:
   - Form pendaftaran unit tidak lagi membingungkan penyewa atau admin dengan opsi paket. Cukup tentukan durasi sewa (misal 30 hari, 60 hari, 90 hari, 365 hari).
   - Tabel apartemen toko menyingkirkan badge paket, dan menonjolkan status keaktifan, sisa hari, serta peringkat durasi sewa secara elegan.
   - Tetap menjaga backward-compatibility di SQLite `master.db` dengan mengisi kolom `package_name` sebagai label seragam 'Akses Penuh'.

Pemahaman:
Model ini sangat menyederhanakan alur pendaftaran, menghilangkan friksi mental bagi calon penyewa, dan memberikan rasa adil bagi setiap pengguna bot toko.

Potensi Penerapan:
1. Menghapus dropdown paket di `admin-frontend/src/App.tsx`.
2. Menyajikan informasi sisa sewa dengan visualisasi ranking dan opsi sorting (Masa Sewa Terpanjang, Mendekati Habis, Terbaru).
3. Menyeragamkan logika `tenantManager.ts` di backend.

Catatan Tambahan:
- Pastikan seluruh antarmuka tetap mematuhi prinsip anti-AI slop (kontras tinggi, tidak ada em-dash, tidak ada gradasi ungu klise, dan responsif).

---

[11.0] - ARSITEKTUR ISOLASI PENYIMPANAN MEDIA MULTI-TENANT & FITUR UPLOAD FOTO KUSTOM

- Tanggal: 2026-11-03 08:20
- Sumber: Diskusi Kebutuhan Pengguna & Analisis Keamanan Multi-Tenant

Informasi yang Dipelajari:
1. Akar Permasalahan Kebocoran Media Antar-Tenant:
   - Saat ini file foto command Menu dan Carousel diletakkan di satu direktori bersama pada kode frontend: `/frontend/src/media/picture`.
   - Endpoint `GET /api/media/pictures` membaca seluruh isi folder tersebut secara flat tanpa memfilter siapa pemilik file.
   - Akibatnya, jika ada foto baru ditambahkan atau diakses, seluruh penyewa (Tenant A, Tenant B, dst.) dapat melihat file yang sama di dropdown pilihan foto dashboard.
   - Selain itu, tidak ada mekanisme bagi tenant untuk mengunggah (upload) foto promosi mereka sendiri dari browser, sehingga penambahan foto baru harus melalui hardcode atau akses file server manual oleh pengelola.

2. Solusi Arsitektur Penyimpanan Terisolasi (Per-Tenant Storage):
   - Server menyediakan struktur folder khusus yang dipartisi berdasarkan `tenantId`:
     `storage/tenants/<tenantId>/media/`
     Contoh: `storage/tenants/t_wanzt/media/` dan `storage/tenants/t_pablo/media/`.
   - Sediakan juga folder aset bawaan (default/fallback):
     `storage/shared/default_media/`
   - Setiap kali tenant baru dibuat, folder media tenant otomatis diinisialisasi di server.

3. Desain API Terproteksi Konteks Tenant (Backend):
   - `GET /api/media/pictures`: Mengambil daftar foto hanya dari direktori tenant aktif yang sedang login (`getActiveTenantId()`).
   - `POST /api/media/upload`: Endpoint unggah file gambar (format `.jpg`, `.jpeg`, `.png`, `.webp` dengan limit ukuran misal 5MB) menggunakan middleware multipart (seperti multer) yang langsung menaruh file ke folder `storage/tenants/<tenantId>/media/`.
   - `DELETE /api/media/:filename`: Menghapus foto milik tenant tersebut (dengan validasi sanitasi path untuk mencegah Directory Traversal `../`).
   - `GET /api/media/view/:filename`: Menyajikan file gambar ke browser dashboard dengan verifikasi kepemilikan tenant.

4. Integrasi ke Bot WhatsApp Baileys:
   - Pada saat bot mengirim pesan Menu (`menuMessage.ts`) atau Carousel (`carouselMessage.ts`), fungsi pembaca file gambar tidak lagi membaca folder statis frontend, melainkan:
     `path.resolve(process.cwd(), 'storage', 'tenants', tenantId, 'media', selectedPicture)`
   - Jika foto kustom tenant belum ada atau file tidak ditemukan, bot otomatis fallback ke gambar default sistem agar pengiriman pesan tidak crash.

5. Pengalaman Pengguna di Dashboard (Frontend):
   - Di tab Command (Menu & Carousel), sediakan area Upload Media interaktif (Drag & Drop atau tombol Pilih File).
   - Tampilkan galeri mini pratinjau (thumbnail preview) foto-foto yang sudah diunggah oleh tenant tersebut, lengkap dengan radio pilihan aktif dan tombol hapus file.
   - Pengguna tidak perlu menyentuh kode sama sekali; cukup upload foto dari dashboard, pilih foto yang diinginkan, dan simpan.

Pemahaman:
Pemisahan fisik folder per tenant adalah pendekatan paling aman, efisien, dan bersih. Ini selaras dengan arsitektur Database-per-Tenant yang sudah diterapkan sebelumnya, tanpa menambah dependensi cloud berbayar (seperti AWS S3 atau Firebase Storage) karena seluruh file tersimpan terorganisir di server VPS lokal.

Potensi Penerapan:
1. Menyiapkan helper direktori `getTenantStoragePath(tenantId)` di backend.
2. Memperbarui `backend/routes/mediaRoutes.ts` dengan multer untuk upload dan endpoint view yang aman.
3. Menyesuaikan `menuMessage.ts`, `carouselMessage.ts`, dan `botManager.ts` untuk membaca foto dari direktori tenant.
4. Menambahkan komponen Upload & Gallery Selector di tab Command pada `frontend/src/components/dashboard/tabs/CommandTab.tsx`.

Catatan Tambahan:
- Sanitasi nama file dan pencegahan path traversal (`path.basename()`) wajib diterapkan agar tenant tidak bisa mengakses file di luar folder mereka.
- Jangan melakukan perubahan kode sebelum rencana disetujui pengguna.

---

[12.0] - SPESIFIKASI TABEL MANAJEMEN PENYEWA BARU PADA DASHBOARD MASTER ADMIN

- Tanggal: 2026-11-03 08:40
- Sumber: Permintaan Pengguna & Analisis Kebutuhan Operasional Master Admin

Informasi yang Dipelajari:
1. Kebutuhan Restrukturisasi Tabel Penyewa (Tenant Management Table):
   Dashboard Master Admin (`/master` atau `admin-frontend/`) memerlukan pembaruan tampilan tabel penyewa agar lebih informatif, komprehensif, dan mudah dioperasikan dalam mengelola gedung apartemen bot.

2. Struktur Kolom dan Aksi yang Dibutuhkan (13 Kolom Spesifik):
   - Kolom 1: Status (Status akun: Aktif [Hijau], Suspend [Kuning/Oranye], Expired [Merah]).
   - Kolom 2: ID Bot (ID unik unit penyewa, misal `t_berkahstore_450` dalam badge monospace).
   - Kolom 3: Toko (Nama toko/unit bisnis penyewa).
   - Kolom 4: Owner (Nama pemilik toko/penyewa).
   - Kolom 5: No. WhatsApp (Nomor kontak WhatsApp owner, dapat dihubungi atau disalin).
   - Kolom 6: Username (Username yang digunakan untuk login ke dashboard toko penyewa).
   - Kolom 7: Masa Sewa (Total durasi masa sewa atau sisa hari aktif, misal "360 Hari").
   - Kolom 8: Expired (Tanggal berakhirnya masa sewa dalam format tanggal Indonesia yang jelas, misal 28 Oktober 2026).
   - Kolom 9: Status Bot (Indikator real-time koneksi bot WhatsApp ke Baileys: Online [Hijau berkedip] jika terhubung, Offline [Abu-abu] jika terputus).
   - Kolom 10: Perpanjang (Tombol aksi yang memunculkan modal popup perpanjangan masa sewa bot).
   - Kolom 11: Suspend (Toggle switch interaktif untuk suspend/aktifkan akun: jika toggle ON maka akun disuspend dan bot dinonaktifkan, jika toggle OFF maka akun aktif dan bot berjalan normal).
   - Kolom 12: Reset (Tombol reset password akun dashboard penyewa yang disiapkan untuk alur pengembangan lanjutan).
   - Kolom 13: Hapus (Tombol aksi hapus akun tenant beserta pembersihan database dan sesi dengan konfirmasi aman in-app).

3. Kebutuhan Integrasi Data Backend:
   - Endpoint `/api/admin/tenants` perlu menyuplai status bot real-time (`botStatus: 'online' | 'offline'`) dengan memeriksa status koneksi dari `getBotManager(tenantId).status === 'connected'`.
   - Endpoint suspend/status toggle perlu mendukung integrasi toggle switch secara mulus (`POST /api/admin/tenants/:id/status` dengan payload `{ status: 'suspended' | 'active' }`).
   - Endpoint perpanjangan (`POST /api/admin/tenants/:id/extend`) sudah siap dan dapat langsung dihubungkan dengan modal perpanjang.
   - Endpoint reset password (`POST /api/admin/tenants/:id/reset-password`) dapat disiapkan untuk mendukung aksi reset.

Pemahaman:
Restrukturisasi tabel ini menyederhanakan pemantauan unit penyewa apartemen bot bagi Master Admin, memberikan visualisasi status akun dan status bot secara jelas, serta menyediakan kendali operasional langsung (perpanjang, suspend toggle, reset, hapus) dalam satu baris tabel yang rapi.

Potensi Penerapan:
1. Memperbarui `admin-backend/routes/adminRoutes.ts` dan `admin-backend/services/tenantManager.ts` untuk menyertakan `bot_status` ('online' / 'offline') pada respon daftar tenant.
2. Memperbarui antarmuka `admin-frontend/src/App.tsx` dengan komponen tabel baru yang modern, responsif, berdesain dark-mode konsisten, dan memuat 13 kolom/aksi yang diminta.
3. Menyiapkan modal Perpanjang Sewa, modal Reset Password, dan modal Hapus Tenant in-app yang aman tanpa `window.confirm`.

Catatan Tambahan:
- Pengguna meminta agar pemahaman dijelaskan terlebih dahulu sebelum kode diubah. Tidak ada perubahan kode aplikasi yang dilakukan sebelum konfirmasi dari pengguna.

---

[13.0] - EKSPLORASI FIGCRAFT DARI ARTCRAFT (DESAIN UI/UX OPEN-SOURCE NATIVE BERBASIS RUST)

- Tanggal: 2026-11-03 09:35
- Sumber: Diskusi Pengguna & Dokumentasi Ekosistem ArtCraft

Informasi yang Dipelajari:
1. Definisi dan Tujuan FigCraft:
   FigCraft adalah perangkat lunak desain antarmuka (UI/UX) dan prototyping gratis, sumber terbuka (free & open source / FOSS), serta bersifat local-first yang dikembangkan oleh ArtCraft.
2. Dibangun Murni dengan Rust (Native & Tanpa Electron):
   Berbeda dengan Figma yang berbasis cloud browser atau aplikasi Electron yang boros memori (RAM), FigCraft ditulis dari awal menggunakan bahasa pemrograman Rust. Hal ini menghasilkan performa render yang sangat kencang, konsumsi daya/memori minimal, dan responsivitas instan.
3. Fitur Utama yang Mengadopsi Standar Desain Modern:
   - Frames dan Kanvas Tanpa Batas (Infinite Canvas).
   - Auto Layout dengan fleksibilitas alur responsif.
   - Reusable Components dan Variants untuk pembuatan Design System.
   - Vector Networks untuk pembuatan ikon dan aset grafis vektor presisi.
   - Styles dan Design Tokens / Variables untuk tokenisasi warna, tipografi, dan spasi.
   - Interactive Prototyping dengan transisi kurva Bezier kustom.
   - Dev Mode terintegrasi untuk copy-paste kode/CSS secara instan.
4. Filosofi Local-First dan Bebas Biaya Langganan:
   FigCraft dapat berjalan 100% offline tanpa perlu koneksi internet, file desain tersimpan langsung di penyimpanan lokal komputer pengguna, serta bebas dari model langganan bulanan (*subscription-free*).
5. Ekosistem Kreatif ArtCraft yang Lebih Luas:
   FigCraft merupakan bagian dari rangkaian software kreatif ArtCraft (dikelola melalui ArtCraft Launcher), yang juga mencakup PhotoCraft (alternatif Photoshop) dan FilmCraft (alternatif editor video). Proyek ini juga mendukung integrasi antarmuka program seperti command line, kanal kontrol JSON, dan Model Context Protocol (MCP) server.

Pemahaman:
FigCraft hadir sebagai alternatif independen dan open-source yang tangguh terhadap Figma, terutama bagi desainer dan developer yang menginginkan kepemilikan penuh atas file desain lokal mereka, privasi data tanpa keterikatan cloud vendor, serta kecepatan aplikasi native berbasis Rust.

Potensi Penerapan:
- Dapat digunakan sebagai referensi alur kerja Dev Mode dan konversi token desain ke Tailwind CSS/React.
- Relevan untuk desainer atau developer yang mengutamakan privasi dan performa native dalam merancang antarmuka web atau aplikasi.

Catatan Tambahan:
- Karena proyek ini masih dalam fase pengembangan aktif (alpha/open-source), beberapa ekosistem plugin komunitas pihak ketiga masih terus bertumbuh dibandingkan platform mature seperti Figma.

---

[14.0] - ARSITEKTUR PEMISAHAN SUBDOMAIN DASHBOARD BOT (dashboard.example.com) DAN DASHBOARD MASTER (admin.example.com)

- Tanggal: 2026-11-03 10:15
- Sumber: Diskusi Kebutuhan Pengguna & Praktik Standar Reverse Proxy Web Architecture

Informasi yang Dipelajari:
1. Kebutuhan Pemisahan Akses Pengguna vs Master Admin:
   - Dashboard Bot Tenant ditujukan untuk para pemilik toko/penyewa (tenant) pada domain publik, misalnya `dashboard.example.com`.
   - Dashboard Master Admin ditujukan khusus untuk pemilik server (Super Admin) untuk mengelola seluruh gedung apartemen bot pada subdomain terproteksi, misalnya `admin.example.com`.
   - Tombol pintas masuk ke "Dashboard Master" yang saat ini ada di dashboard tenant hanyalah alat bantu (shortcut) selama tahap pengembangan (development), dan wajib disembunyikan/dihapus pada mode produksi agar tenant tidak mengetahui atau mencoba mengakses antarmuka Master Admin.

2. Opsi Arsitektur Pemisahan Subdomain:
   A. Metode Reverse Proxy (Nginx / Caddy / Cloudflare) - Sangat Direkomendasikan untuk Production VPS:
      - Satu proses backend Node.js (`server.ts`) berjalan di port internal (misal port 3000).
      - Nginx / Caddy membaca Host Header dari request pengunjung:
        - Jika Host = `admin.example.com`:
          Arahkan request root `/` ke path `/admin/` di backend, dan izinkan rute API `/api/admin/*`.
        - Jika Host = `dashboard.example.com`:
          Arahkan request ke root `/` (frontend tenant), tetapi blokir secara ketat (`return 404` atau `return 403`) seluruh akses ke path `/admin` dan `/api/admin/*`.
      - Keuntungan: Sangat aman karena lapisan isolasi terjadi di level web server (reverse proxy), sebelum paket request masuk ke aplikasi.

   B. Metode Host-Based Routing di Express Middleware (`server.ts`):
      - Di dalam file `server.ts`, pasang middleware pemeriksa `req.hostname`:
        - Jika subdomain berawalan `admin.`, maka layani admin SPA di root `/` dan izinkan `/api/admin/*`.
        - Jika subdomain berawalan `dashboard.` (atau domain tenant), tolak akses `/admin` dan `/api/admin/*` dengan status 404 Not Found.
      - Keuntungan: Berjalan tanpa konfigurasi web server yang rumit, portabel di berbagai platform.

3. Strategi Pengamanan Tombol Dev Master Admin:
   - Tombol pintas pengembangan (seperti tombol "Dashboard Master" di modal suspended atau menu navigasi) dikontrol melalui environment variable `VITE_ENABLE_DEV_ADMIN_SHORTCUT=false` di file `.env` produksi.
   - Atau menggunakan pengecekan otomatis `import.meta.env.DEV` (hanya aktif saat `npm run dev` di sandbox/localhost, dan otomatis hilang saat dibuild untuk production `npm run build`).

Pemahaman:
- Pemisahan domain tidak mengharuskan pemecahan project menjadi dua server terpisah yang rumit. Arsitektur unified monorepo saat ini dapat tetap dipertahankan dengan routing berbasis virtual host / reverse proxy.
- Mengisolasi rute `/admin` dan `/api/admin/*` di level reverse proxy menjamin keamanan data master admin 100% dari rasa penasaran penyewa toko.

Potensi Penerapan:
1. Menyediakan dokumentasi konfigurasi Nginx dan Caddy siap pakai untuk pengguna.
2. Mengamankan tombol shortcut Master Admin di frontend tenant dengan conditional flag `import.meta.env.DEV` atau flag konfigurasi.
3. Menyiapkan middleware opsional di `server.ts` untuk mendeteksi `req.hostname`.

Catatan Tambahan:
- Pastikan sertifikat SSL (HTTPS) disediakan untuk kedua subdomain (`admin.example.com` dan `dashboard.example.com`) menggunakan Let's Encrypt / Certbot atau Cloudflare.

---

[15.0] - FITUR MANDIRI KUSTOMISASI KREDENSIAL TENANT (UBAH USERNAME & GANTI PASSWORD 3-FORM)

- Tanggal: 2026-11-03 20:38
- Sumber: Pengguna

Informasi yang Dipelajari:
1. Kebutuhan Tenant Mengubah Kredensial Sendiri:
   - Saat ini akun tenant dibuatkan oleh Master Admin (atau sistem generate otomatis) dengan username dan password default yang statis.
   - Tenant membutuhkan kebebasan dan privasi untuk mengkustomisasi username dan password mereka sendiri langsung dari dalam dashboard.
2. Titik Masuk (Trigger / Entry Point):
   - Terletak pada bagian footer navbar sidebar (bagian bawah), tepatnya pada area foto profil / avatar profil penyewa (sesuai lampiran tangkapan layar pengguna).
   - Area avatar dan info profil tersebut harus interaktif (dapat diklik) dan mengarahkan tampilan ke halaman / tab "Kredensial Akun" (Keamanan & Akun).
3. Spesifikasi Form yang Diminta:
   - Form 1: Pengubahan Username (nama pengguna).
   - Form 2: Pengubahan Password yang wajib memiliki 3 kolom input:
     * Kolom 1: Password Saat Ini (Current Password) — wajib diverifikasi dengan kredensial aktif saat ini. Jika salah/tidak valid, permintaan ganti password ditolak.
     * Kolom 2: Password Baru (New Password).
     * Kolom 3: Konfirmasi Password Baru (Confirm New Password) — tenant harus mengetikkan password baru sebanyak 2 kali untuk memastikan tidak ada salah ketik.
4. Keamanan dan Sinkronisasi Data:
   - Pembaruan kredensial harus tersinkronisasi di SQLite master (`database/master.db` tabel `tenants`) dan database lokal tenant (`auth` / `tenants`).
   - Sesi aktif pengguna di memori dan cookie/token perlu diperbarui agar sesi tetap valid dengan identitas baru.

Pemahaman:
- Pemisahan form username dan password memberikan fleksibilitas: tenant bisa hanya mengganti username tanpa harus mengganti password, atau mengganti password dengan verifikasi ketat password lama.
- Verifikasi password lama mutlak diperlukan untuk mencegah pengubahan akun tanpa izin jika sesi browser ditinggalkan terbuka.

Potensi Penerapan:
1. Menambahkan endpoint backend aman `/api/auth/profile/update-username` dan `/api/auth/profile/update-password` (atau `/api/tenant/credentials`).
2. Menghubungkan klik profil di `DesktopSidebar.tsx` ke tab baru (misalnya tab `'Akun'` atau `'Keamanan'`).
3. Merancang komponen antarmuka form yang bersih, aman, responsif, dan bebas AI-slop.

Catatan Tambahan:
- Pastikan ada validasi kesamaan password baru dan konfirmasi password di frontend dan backend sebelum disimpan ke database.

---

[16.0] - ARSITEKTUR REST API KOLABORATOR UNTUK PENJUALAN OTOMATIS SEWA BOT (PARTNER/RESELLER API)

- Tanggal: 2026-11-07 05:45
- Sumber: Diskusi dan Permintaan Pengguna

Informasi yang Dipelajari:
1. Tujuan dan Model Bisnis Kolaborasi (Affiliate / Reseller / Partner Integration):
   - Pengguna berniat membuka peluang kemitraan/kolaborasi di mana pihak ketiga (kolaborator/reseller/website affiliate) dapat menjual jasa sewa bot WhatsApp secara otomatis.
   - Pihak kolaborator menembak endpoint REST API khusus saat ada transaksi/pembelian dari pelanggan mereka.
   - Server merespon balik secara otomatis dengan membuat unit tenant baru dan memberikan kredensial lengkap yang siap diserahkan ke pembeli.

2. Kebutuhan Data Input dan Output API:
   - Data Input yang Diterima dari Kolaborator:
     * API Key / Secret Token Kolaborator (identifikasi otorisasi mitra resmi).
     * Durasi sewa dalam hari (misal 30, 60, 90, 365 hari).
     * Data opsional profil pembeli: Nama Toko, Nama Pemilik, dan Nomor WhatsApp pembeli. Jika dikosongkan, sistem tetap dapat menggunakan mode instan otomatis.
   - Data Respon Output yang Diberikan ke Kolaborator:
     * ID Tenant unik (misal `t_kolaborator_8492` atau `t_tenant_9312`).
     * Username login dashboard toko bot.
     * Password login acak yang aman.
     * Masa aktif (durasi hari, tanggal mulai aktif, dan tanggal kedaluwarsa).
     * URL tautan login dashboard bot (misal `https://dashboard.domain.com/`).
     * Status akun (`active`).

3. Persyaratan Keamanan dan Tata Kelola API:
   - Autentikasi API Key terenkripsi (misal `x-api-key` atau Bearer Token mitra).
   - Validasi saldo/kuota kolaborator atau otorisasi mitra aktif di tabel `master.db` (misal tabel `collaborators` / `api_keys`).
   - Rate limiting untuk mencegah abuse / spam pembuatan akun.
   - Logging riwayat pembuatan akun per kolaborator untuk rekonsiliasi komisi / pembayaran.

Pemahaman:
- Konsep ini sangat realistis dan sangat mudah diintegrasikan karena fondasi pembuatan tenant otomatis (auto-generation ID, username, password, dan isolasi database-per-tenant) sudah selesai dibangun pada `admin-backend/services/tenantService.ts` dan `admin-backend/utils/generatorUtils.ts`.
- Endpoint publik berotentikasi API Key dapat dipasang di `admin-backend` (misal `POST /api/partner/v1/create-tenant`) tanpa mengganggu alur operasional dashboard Master Admin yang sudah ada.

Potensi Penerapan:
1. Pembuatan tabel `collaborator_keys` pada `database/master.db` untuk mencatat daftar mitra resmi, status keaktifan, dan saldo/kuota.
2. Pembuatan middleware otentikasi `collaboratorAuthMiddleware.ts`.
3. Pembuatan controller `collaboratorApiController.ts` yang memanfaatkan fungsi yang sudah ada (`TenantService.createTenantAuto()` atau `TenantManager.createTenant()`).
4. Penyediaan dokumentasi endpoint API (API Docs / Swagger / cURL example) untuk dibagikan ke mitra kolaborasi.

Catatan Tambahan:
- Ini merupakan tahap perencanaan awal. Tidak ada perubahan kode yang dilakukan sebelum disetujui pengguna.

---

[17.0] - SISTEM TOKEN VOUCHER PERPANJANGAN MASA SEWA BOT (SINGLE-USE EXTENSION TOKENS)

- Tanggal: 2026-11-07 05:58
- Sumber: Diskusi dan Penjelasan Kebutuhan Pengguna

Informasi yang Dipelajari:
1. Konteks Kemitraan Tunggal (Single Exclusive Collaborator):
   - Bot ini dirancang untuk bekerja sama secara eksklusif dengan satu mitra/kolaborator utama.
   - Kolaborator dapat menjual masa sewa awal maupun token perpanjangan masa sewa ke pembeli.

2. Mekanisme Token Perpanjangan Sekali Pakai (One-Time License Token):
   - Admin Utama dapat membuat kode unik token langsung melalui Dashboard Master Admin atau mitra dapat memintanya melalui API khusus.
   - Input pembuatan token: Durasi hari perpanjangan sewa (misal 30 hari, 60 hari, 90 hari, 365 hari).
   - Sistem secara otomatis membuat kode acak unik (misal `EXT-89FA-21K9` atau `WANZT-30D-K821A`).
   - Sifat Token:
     * Universal: Berlaku untuk seluruh akun tenant bot mana pun tanpa terikat ke ID bot tertentu di awal.
     * Sekali Pakai (Single-Use): Hanya dapat digunakan 1 kali saja. Begitu digunakan oleh salah satu tenant, status token berubah menjadi 'used' dan dicatat riwayat penggunaannya (tenant ID, tanggal redeem).

3. Halaman Redeem Token di Dashboard Bot Tenant:
   - Menyediakan halaman atau sub-tab khusus di dashboard bot (misal tab 'Perpanjang Masa Aktif').
   - Halaman dirancang minimalis dan mudah: hanya terdapat 1 kolom input kode token dan tombol verifikasi 'Perpanjang Bot Sekarang'.
   - Ketika tenant memasukkan kode unik dan submit:
     * Sistem memverifikasi validitas token di tabel database `master.db`.
     * Jika valid dan belum terpakai, masa aktif bot tenant tersebut langsung bertambah sesuai durasi token.
     * Jika bot berstatus suspended atau expired karena masa sewa habis, penukaran token otomatis mengaktifkan kembali bot dan membuka gembok suspensi.
     * Tampilkan notifikasi sukses yang jelas beserta tanggal kedaluwarsa baru.

Pemahaman:
- Model token lisensi ini sangat fleksibel dan aman karena:
  1. Mitra kolaborator dapat menjual token voucher seperti produk voucher fisik/digital (voucher 30 hari, 60 hari).
  2. Tenant memiliki kendali penuh untuk memperpanjang bot mereka kapan saja tanpa perlu menunggu konfirmasi manual dari admin.
  3. Mengurangi beban administrasi Master Admin dalam mengurus perpanjangan sewa harian.

Potensi Penerapan:
1. Skema Database SQLite di `database/master.db`:
   - Tabel `extension_tokens`: `id`, `token_code` (unique), `duration_days`, `status` ('available' / 'used' / 'revoked'), `created_by` ('admin' / 'api_partner'), `used_by_tenant_id`, `used_at`, `created_at`.
2. Backend Endpoint:
   - Master Admin: `POST /api/admin/tokens/create` dan `GET /api/admin/tokens` (generate dan monitoring token).
   - Partner API: `POST /api/v1/partner/tokens/create` (generate token via API mitra tunggal).
   - Tenant Dashboard: `POST /api/tenant/redeem-token` (klaim token dan auto-extend masa sewa).
3. Frontend Antarmuka:
   - Dashboard Bot: Halaman/Tab 'Perpanjang Masa Aktif' dengan form penukaran kode unik.
   - Dashboard Master Admin: Panel Manajemen Token di sidebar (buat token satuan/massal, pantau token aktif dan riwayat token terpakai).

Catatan Tambahan:
- Ini adalah tahap perencanaan dan kesepakatan konsep. Kode belum diubah.
