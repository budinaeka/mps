# Sistem Informasi Puskeswan Wilayah Sukabumi

Sistem Informasi Manajemen Puskeswan (Pusat Kesehatan Hewan) berbasis web (Single Page Application) dengan backend PHP dan database MySQL.

## Fitur Utama

1.  **Autentikasi**: Login sistem dengan manajemen session (admin/staff).
2.  **Dashboard**: Ringkasan data pelayanan dan grafik statistik.
3.  **Manajemen User**: Tambah, edit, dan hapus pengguna.
4.  **Layanan Pengobatan**: Pencatatan data pasien dan diagnosa/terapi.
5.  **Vaksinasi**: Pencatatan vaksinasi PMK, Rabies, dan LSD.
6.  **Monitoring**: Data Kelompok Tani (Poktan) dan BUMDES.
7.  **Surveilans**: Pencatatan data surveilans PHMS.
8.  **Administrasi Surat**: Surat Masuk, Surat Keluar, dan Surat Keterangan.
9.  **Stok Obat**: Manajemen stok obat dan riwayat pemakaian.
10. **Laporan**: Cetak laporan dan ekspor ke CSV.

## Teknologi

-   **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5.
-   **Backend**: PHP (Native REST API).
-   **Database**: MySQL.
-   **Libraries**: Chart.js (Grafik), SweetAlert2 (Notifikasi).

## Persyaratan Sistem

-   Web Server (Apache/Nginx).
-   PHP 7.4 atau lebih baru.
-   MySQL/MariaDB.

## Cara Instalasi

1.  **Siapkan Lingkungan Server**:
    -   Instal XAMPP, Laragon, atau paket server lokal lainnya.
    -   Pastikan layanan Apache dan MySQL berjalan.

2.  **Penempatan File**:
    -   Salin seluruh folder proyek ini ke dalam direktori root server (misalnya `C:\xampp\htdocs\mps` atau `C:\laragon\www\mps`).

3.  **Konfigurasi Database**:
    -   Buka phpMyAdmin (biasanya di `http://localhost/phpmyadmin`).
    -   Import file `database.sql` yang ada di root proyek.
    -   File ini akan otomatis membuat database `puskeswan_db` dan tabel-tabel yang diperlukan.

4.  **Konfigurasi Koneksi (Opsional)**:
    -   Jika konfigurasi MySQL Anda berbeda dari default (User: `root`, Pass: kosong), edit file `backend/config.php`.

5.  **Jalankan Aplikasi**:
    -   Buka browser dan akses `http://localhost/mps` (sesuaikan dengan nama folder Anda).

## Login Default

-   **Username**: `admin`
-   **Password**: `123`
-   **Username**: `petugas`
-   **Password**: `123`

## Struktur Folder

-   `backend/`: Kode PHP untuk API dan koneksi database.
-   `assets/`: Gambar dan aset statis.
-   `app.js`: Logika utama frontend (Routing, View Rendering, Event Handling).
-   `db.js`: Layer komunikasi data (Fetch API ke Backend PHP).
-   `database.sql`: Skema database MySQL.
-   `index.html`: Entry point aplikasi.

## Deploy di VPS (Nginx)

- Persyaratan:
  - VPS Linux (Ubuntu 22.04/24.04 direkomendasikan) dengan akses sudo.
  - Nginx, PHP-FPM, dan MySQL/MariaDB terpasang.

- Instal paket server:

```bash
sudo apt update
sudo apt install nginx mysql-server
sudo apt install php-fpm php-mysql php-xml php-mbstring php-curl unzip
```

- Buat database dan user MySQL:

```bash
sudo mysql
CREATE DATABASE puskeswan_db;
CREATE USER 'mps'@'localhost' IDENTIFIED BY 'password-kuat';
GRANT ALL PRIVILEGES ON puskeswan_db.* TO 'mps'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

- Upload kode aplikasi ke server:
  - Buat folder: `sudo mkdir -p /var/www/mps`
  - Upload semua file proyek ke `/var/www/mps` (gunakan scp/rsync/git).
  - Set izin:

```bash
sudo chown -R www-data:www-data /var/www/mps
sudo chmod -R 755 /var/www/mps
```

- Import skema database:

```bash
mysql -u mps -p puskeswan_db < /var/www/mps/database.sql
```

- Konfigurasi environment:
  - Edit `/var/www/mps/.env` dengan kredensial produksi:

```bash
DB_HOST=localhost
DB_NAME=puskeswan_db
DB_USER=mps
DB_PASS=password-kuat
```

- Konfigurasi Nginx:
  - Buat file `/etc/nginx/sites-available/mps`:

```nginx
server {
    server_name your-domain.com; # atau IP VPS
    root /var/www/mps;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock; # sesuaikan versi PHP-FPM (mis: php8.2-fpm.sock)
    }

    location ~ /\.env {
        deny all;
    }
}
```

  - Aktifkan site dan reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mps /etc/nginx/sites-enabled/mps
sudo nginx -t
sudo systemctl reload nginx
```

- Pastikan PHP-FPM aktif:

```bash
systemctl status php*-fpm
```

- SSL (opsional, direkomendasikan):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

- Verifikasi koneksi database:
  - Buka: `http://your-domain.com/backend/test-db.php`
  - Harus menampilkan status sukses.

- Troubleshooting cepat:
  - 502 Bad Gateway: cek service PHP-FPM dan fastcgi_pass socket path.
  - Tidak bisa baca .env: pastikan file berada di root proyek dan izin file cukup untuk user `www-data`.
  - Permission denied: pastikan kepemilikan/izin folder sudah diset ke `www-data`.
