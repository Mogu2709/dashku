# 📋 Dashku — Personal Dashboard

Dashboard pribadi multi-user yang bisa digunakan oleh siapa saja. Data tersimpan di browser masing-masing user (`localStorage`) dan tidak akan hilang saat refresh atau di-reset.

## Fitur
- **Multi-user** — setiap orang login dengan nama unik, data terpisah
- **Rekap Keuangan** — catat pemasukan & pengeluaran, pantau anggaran per kategori
- **Manajemen Tugas** — tambah, centang, dan hapus tugas harian
- **Persistent** — data tidak hilang saat refresh (tersimpan di browser)
- **Responsif** — bisa dipakai di HP maupun laptop

## Deploy ke GitHub Pages

### Langkah 1 — Buat repository
1. Buka [github.com](https://github.com) dan login
2. Klik **New repository**
3. Nama repo bebas, misalnya `dashku`
4. Centang **Public**, lalu klik **Create repository**

### Langkah 2 — Upload file
1. Di halaman repo, klik **Add file → Upload files**
2. Upload ketiga file ini:
   - `index.html`
   - `style.css`
   - `app.js`
3. Klik **Commit changes**

### Langkah 3 — Aktifkan GitHub Pages
1. Buka **Settings** di repo kamu
2. Scroll ke bagian **Pages** (di sidebar kiri)
3. Di bagian **Source**, pilih `Deploy from a branch`
4. Pilih branch `main` dan folder `/ (root)`
5. Klik **Save**

### Langkah 4 — Akses website
Setelah 1–2 menit, website kamu live di:
```
https://<username-github-kamu>.github.io/<nama-repo>/
```

Contoh: `https://budi123.github.io/dashku/`

Bagikan link ini ke siapa saja — setiap orang akan punya data masing-masing!

## Catatan
- Data tersimpan di `localStorage` browser masing-masing, jadi data **tidak sinkron antar device**
- Untuk berbagi data antar device, perlu backend tambahan (bisa ditambahkan belakangan)
