<div align="center">

<img src="assets/banner.svg" alt="Movie Reservation API" width="100%"/>

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-E50914?style=for-the-badge&logo=nextdotjs&logoColor=white&labelColor=141414)
![Prisma](https://img.shields.io/badge/Prisma-7-E50914?style=for-the-badge&logo=prisma&logoColor=white&labelColor=141414)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-E50914?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=141414)
![Stripe](https://img.shields.io/badge/Stripe-Payments-E50914?style=for-the-badge&logo=stripe&logoColor=white&labelColor=141414)
![TypeScript](https://img.shields.io/badge/TypeScript-5-E50914?style=for-the-badge&logo=typescript&logoColor=white&labelColor=141414)

### Backend REST API untuk reservasi kursi bioskop — dari memilih kursi sampai tiket terbayar.

[Trailer](#trailer) ·
[Fitur](#fitur-unggulan) ·
[Alur](#alur-pemesanan) ·
[Arsitektur](#arsitektur) ·
[ERD](#erd) ·
[Endpoint](#daftar-endpoint) ·
[Mulai](#season-premiere-memulai)

</div>

<br/>

---

## Trailer

**Movie Reservation API** adalah backend untuk sistem pemesanan tiket bioskop. Pengguna bisa menjelajahi film dan jadwal tayang, melihat peta kursi secara *real-time*, menahan kursi pilihan, membayar lewat **Stripe Checkout**, lalu menerima tiket yang sah. Admin mengelola bioskop, studio, film, jadwal, dan memantau laporan pendapatan.

Satu hal yang paling dijaga: **tidak boleh ada dua orang yang mendapat kursi yang sama.**

> *"Kursi terakhir di baris tengah? Siapa cepat, dia dapat, dan database yang jadi wasitnya."*

<br/>

## Fitur Unggulan

| Fitur | Penjelasan |
|---|---|
| **Autentikasi JWT** | Register & login, token HS256 berlaku 7 hari, password di-hash dengan bcrypt. |
| **Role USER & ADMIN** | Endpoint pengelolaan data hanya untuk admin. Admin dibuat lewat seed, bukan API publik. |
| **Anti double-booking** | Constraint `UNIQUE(showtimeId, seatId)` di database menolak pemesanan ganda dengan HTTP `409`. |
| **Tahan kursi 15 menit** | Reservasi `PENDING` otomatis `EXPIRED` jika tidak dibayar, lalu kursi dilepas kembali. |
| **Pembayaran Stripe** | Checkout Session + webhook bertanda tangan, aman terhadap event ganda (*idempotent*). |
| **Refund otomatis** | Pembatalan tiket yang sudah dibayar, atau pembayaran yang terlambat, langsung di-refund. |
| **Peta kursi** | Tiap kursi berstatus `AVAILABLE` atau `TAKEN` beserta ringkasan total, terisi, dan tersisa. |
| **Laporan admin** | Total pendapatan, tiket terjual, dan persentase okupansi per jadwal, bisa difilter tanggal. |
| **Validasi ketat** | Semua input divalidasi dengan Zod. Error selalu berformat konsisten. |

<br/>

## Alur Pemesanan

<div align="center">
<img src="assets/journey.svg" alt="Alur pemesanan tiket" width="100%"/>
</div>

<br/>

Setiap reservasi punya siklus hidup yang jelas:

<div align="center">
<img src="assets/status.svg" alt="Status reservasi" width="100%"/>
</div>

<br/>

## Cast (Tech Stack)

| Peran | Pemeran |
|---|---|
| Framework | **Next.js 16** (App Router, Route Handlers) |
| ORM | **Prisma 7** dengan adapter `@prisma/adapter-pg` |
| Database | **PostgreSQL** |
| Pembayaran | **Stripe** (Checkout Session + Webhook) |
| Auth | **jose** (JWT) + **bcrypt** |
| Validasi | **Zod 4** |
| Bahasa | **TypeScript 5** |

<br/>

## Arsitektur

<div align="center">
<img src="assets/architecture.svg" alt="Arsitektur sistem" width="100%"/>
</div>

> **Catatan:** diagram menggambarkan pembagian tanggung jawab secara konseptual. Pada implementasinya, semuanya berjalan dalam **satu aplikasi Next.js (modular monolith)**: setiap "service" adalah modul di `src/modules/*`, dan route handler di `src/app/api/*` hanya menjadi pintu masuknya.

<br/>

## ERD

<div align="center">
<img src="assets/erd.svg" alt="Entity Relationship Diagram" width="100%"/>
</div>

> Diagram diturunkan dari [`prisma/schema.prisma`](prisma/schema.prisma). Selain 9 tabel inti, ada tabel **Genre** yang berelasi *many-to-many* dengan **Movie**.

<br/>

## Daftar Endpoint

Semua endpoint berawalan `/api`. Header autentikasi: `Authorization: Bearer <token>`.

**Level akses:** Publik (tanpa login), Login (perlu token), Admin (khusus role ADMIN)

### Auth & Health

| Method | Path | Akses | Deskripsi |
|:-:|---|:-:|---|
| `GET` | `/api/health` | Publik | Cek status server |
| `POST` | `/api/auth/register` | Publik | Daftar akun baru (role `USER`) |
| `POST` | `/api/auth/login` | Publik | Login, mengembalikan `user` dan `token` |

### Film & Jadwal

| Method | Path | Akses | Deskripsi |
|:-:|---|:-:|---|
| `GET` | `/api/movies` | Publik | Daftar film. Query: `genre`, `q`, `page`, `limit` |
| `GET` | `/api/movies/:id` | Publik | Detail film |
| `POST` | `/api/movies` | Admin | Tambah film |
| `PATCH` | `/api/movies/:id` | Admin | Ubah film |
| `DELETE` | `/api/movies/:id` | Admin | Hapus film |
| `GET` | `/api/showtimes` | Publik | Jadwal tayang. Query: `movieId`, `theaterId`, `from`, `to` |
| `POST` | `/api/showtimes` | Admin | Tambah jadwal (dicek bentrok dengan jadwal lain di studio yang sama) |
| `GET` | `/api/showtimes/:id/seats` | Publik | Peta kursi + ringkasan ketersediaan |

### Bioskop & Studio

| Method | Path | Akses | Deskripsi |
|:-:|---|:-:|---|
| `GET` | `/api/theaters` | Publik | Daftar bioskop |
| `POST` | `/api/theaters` | Admin | Tambah bioskop |
| `POST` | `/api/theaters/:id/auditoriums` | Admin | Tambah studio, kursi dibuat otomatis dari `rows` × `seatsPerRow` |

### Reservasi & Pembayaran

| Method | Path | Akses | Deskripsi |
|:-:|---|:-:|---|
| `POST` | `/api/reservations` | Login | Tahan kursi. Body: `showtimeId`, `seatIds` (1 sampai 6 kursi) |
| `GET` | `/api/reservations` | Login | Daftar reservasi milikku |
| `GET` | `/api/reservations/:id` | Login | Detail reservasi (admin boleh melihat semua) |
| `DELETE` | `/api/reservations/:id` | Login | Batalkan reservasi, refund otomatis jika sudah dibayar |
| `POST` | `/api/payments/checkout` | Login | Buat Stripe Checkout Session, mengembalikan `checkoutUrl` |
| `POST` | `/api/payments/webhook` | Stripe | Menerima event Stripe (diverifikasi dengan signature) |

### Laporan

| Method | Path | Akses | Deskripsi |
|:-:|---|:-:|---|
| `GET` | `/api/reports` | Admin | Pendapatan, tiket terjual, okupansi per jadwal. Query: `from`, `to` |

<details>
<summary><b>Format error</b> (klik untuk membuka)</summary>

<br/>

Semua error memakai bentuk yang sama:

```json
{
  "error": {
    "code": "SEAT_TAKEN",
    "message": "Satu atau lebih kursi baru saja dipesan orang lain. Silakan pilih kursi lain."
  }
}
```

Kode yang sering muncul: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `SEAT_TAKEN` (409), `INVALID_STATUS` (409), `SHOWTIME_STARTED` (400).

</details>

<br/>

## Season Premiere (Memulai)

### Prasyarat

- Node.js 20 atau lebih baru
- PostgreSQL yang sedang berjalan
- Akun [Stripe](https://stripe.com) mode test, plus [Stripe CLI](https://stripe.com/docs/stripe-cli) untuk uji webhook lokal

### 1. Clone & install

```bash
git clone <url-repo-kamu>
cd movie-reservation-api
npm install
```

### 2. Siapkan environment

Buat file `.env` di root proyek:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/movie_reservation"
JWT_SECRET="isi-dengan-string-acak-yang-panjang"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Opsional
STRIPE_CURRENCY="idr"
APP_URL="http://localhost:3000"
```

| Variabel | Wajib | Keterangan |
|---|:-:|---|
| `DATABASE_URL` | Ya | Connection string PostgreSQL |
| `JWT_SECRET` | Ya | Kunci penandatangan JWT |
| `STRIPE_SECRET_KEY` | Ya | Secret key Stripe (mode test) |
| `STRIPE_WEBHOOK_SECRET` | Ya | Signing secret dari `stripe listen` |
| `STRIPE_CURRENCY` | Tidak | Mata uang checkout, default `idr` |
| `APP_URL` | Tidak | Dasar URL redirect setelah bayar, default `http://localhost:3000` |

### 3. Siapkan database

```bash
npm run db:migrate   # membuat tabel
npm run db:seed      # mengisi data contoh
```

> **Perhatian:** `db:seed` **menghapus semua data** sebelum mengisi ulang. Pakai hanya untuk development.

### 4. Jalankan

```bash
npm run dev
```

API siap di **http://localhost:3000**. Coba buka `http://localhost:3000/api/health`.

### 5. Hubungkan webhook Stripe

Di terminal lain:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Salin `whsec_...` yang muncul ke `STRIPE_WEBHOOK_SECRET`, lalu restart server.

<br/>

## Akun Demo

Setelah menjalankan seed, tersedia dua akun:

| Role | Email | Password |
|:-:|---|---|
| Admin | `admin@example.com` | `Admin123!` |
| User | `user@example.com` | `User12345!` |

Data contoh lainnya: bioskop **Cinema Central** (Jakarta) dengan **Studio 1** (40 kursi) dan **Studio 2** (24 kursi), 4 film, dan jadwal tayang untuk 3 hari ke depan.

> Ganti kredensial ini dan `JWT_SECRET` sebelum men-deploy ke produksi.

<br/>

## Coba Langsung

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"User12345!"}'
# → salin nilai "token" dari respons

# 2. Lihat jadwal tayang
curl http://localhost:3000/api/showtimes

# 3. Lihat peta kursi sebuah jadwal
curl http://localhost:3000/api/showtimes/<SHOWTIME_ID>/seats

# 4. Tahan kursi (maks. 6)
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"showtimeId":"<SHOWTIME_ID>","seatIds":["<SEAT_ID_1>","<SEAT_ID_2>"]}'

# 5. Minta link pembayaran Stripe
curl -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"<RESERVATION_ID>"}'
# → buka "checkoutUrl" di browser, bayar dengan kartu uji Stripe 4242 4242 4242 4242
```

<br/>

## Aturan Main (Business Rules)

- Satu reservasi maksimal **6 kursi**, dan tidak boleh ada `seatId` duplikat.
- Kursi ditahan selama **15 menit**. Reservasi yang lewat batas waktu ditandai `EXPIRED` dan tiketnya dihapus.
- Tidak bisa memesan atau membatalkan jadwal yang **sudah dimulai**.
- Jadwal di studio yang sama tidak boleh bentrok, dengan jeda **15 menit** antar film.
- Harga tiket disimpan sebagai *snapshot* saat pembelian, jadi perubahan harga jadwal tidak memengaruhi tiket lama.
- Mengakses reservasi milik orang lain menghasilkan `404` (bukan `403`) agar keberadaannya tidak bocor.
- Webhook Stripe bersifat *idempotent*: event yang dikirim berulang tidak diproses dua kali.

<br/>

## Struktur Proyek

```
movie-reservation-api/
├── prisma/
│   ├── schema.prisma        # Skema database
│   ├── migrations/          # Riwayat migrasi
│   └── seed.ts              # Data contoh
├── src/
│   ├── app/api/             # Route handlers (pintu masuk HTTP)
│   │   ├── auth/            #   register, login
│   │   ├── movies/          #   CRUD film
│   │   ├── showtimes/       #   jadwal + peta kursi
│   │   ├── theaters/        #   bioskop + studio
│   │   ├── reservations/    #   tahan, lihat, batalkan
│   │   ├── payments/        #   checkout + webhook Stripe
│   │   ├── reports/         #   laporan admin
│   │   └── health/          #   health check
│   ├── modules/             # Logika bisnis per domain
│   │   ├── auth/  movies/  theaters/  reservations/  payments/
│   └── lib/                 # auth (JWT), errors, prisma client
└── assets/                  # Gambar untuk README
```

<br/>

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan server development |
| `npm run build` | Build untuk produksi |
| `npm run start` | Jalankan hasil build |
| `npm run db:migrate` | Jalankan migrasi Prisma |
| `npm run db:seed` | Isi database dengan data contoh |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run lint` | Jalankan ESLint |

<br/>

---

<div align="center">

### That's a wrap!

Selamat menikmati filmnya.

<sub>Jika proyek ini membantu, jangan lupa beri bintang di repositori.</sub>

</div>
