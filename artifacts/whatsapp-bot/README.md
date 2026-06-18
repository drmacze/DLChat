# DLChat WhatsApp OTP Bot

Bot ini mengirimkan kode OTP ke user via WhatsApp secara otomatis.
**Jalankan di laptop/VPS kamu, bukan di Replit.**

## Cara Setup

### 1. Install Node.js
Pastikan Node.js v18+ sudah terinstall di komputermu.

### 2. Copy file ini ke komputermu
Download `index.js` dan `package.json`, lalu jalankan:
```bash
npm install
```

### 3. Set environment variables
```bash
# Windows
set BOT_PHONE_NUMBER=6285725483343
set BOT_WEBHOOK_SECRET=<isi secret dari Replit>
set API_BASE_URL=https://558701af-bb53-46b7-92fa-b54aab200136-00-31yp6ojufmlqt.pike.replit.dev

# Mac/Linux
export BOT_PHONE_NUMBER=6285725483343
export BOT_WEBHOOK_SECRET=<isi secret dari Replit>
export API_BASE_URL=https://558701af-bb53-46b7-92fa-b54aab200136-00-31yp6ojufmlqt.pike.replit.dev
```

### 4. Jalankan bot
```bash
npm start
```

### 5. Pairing WhatsApp
- Saat pertama kali, akan muncul **PAIRING CODE** di terminal
- Buka WhatsApp di HP nomor bot (+6285725483343)
- Pengaturan → Perangkat Tertaut → Tautkan Perangkat
- Pilih **"Tautkan dengan nomor telepon"**
- Masukkan kode yang muncul di terminal
- Bot langsung aktif!

## Cara Kerja
1. Bot cek endpoint Replit setiap 3 detik
2. Kalau ada OTP baru, langsung kirim via WhatsApp
3. Konfirmasi ke server bahwa pesan sudah terkirim

## Catatan
- Folder `auth_info/` menyimpan sesi WhatsApp — jangan dihapus
- Kalau mau logout, hapus folder `auth_info/` lalu restart bot
- Bot bisa dijalankan 24/7 di VPS
