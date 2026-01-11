CREATE DATABASE IF NOT EXISTS puskeswan_db;
USE puskeswan_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'viewer') NOT NULL,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS pengobatan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  pemilik VARCHAR(255) NOT NULL,
  hewan VARCHAR(255) NOT NULL,
  jumlah INT NOT NULL,
  diagnosa TEXT NOT NULL,
  terapi TEXT NOT NULL,
  INDEX idx_pengobatan_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS vaksinasi (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type ENUM('pmk', 'rabies', 'lsd') NOT NULL,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  jumlah INT NOT NULL,
  keterangan TEXT,
  foto VARCHAR(255),
  INDEX idx_vaksinasi_type_tanggal (type, tanggal)
);

CREATE TABLE IF NOT EXISTS monitoring (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type ENUM('poktan', 'bumdes') NOT NULL,
  tanggal DATE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  keterangan TEXT,
  INDEX idx_monitoring_type (type)
);

CREATE TABLE IF NOT EXISTS surveilans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  jenis_penyakit VARCHAR(255) NOT NULL,
  sampel VARCHAR(255) NOT NULL,
  hasil VARCHAR(255) NOT NULL,
  INDEX idx_surveilans_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS surat (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type ENUM('masuk', 'keluar', 'keterangan') NOT NULL,
  tanggal DATE NOT NULL,
  nomor VARCHAR(255) NOT NULL,
  perihal VARCHAR(255) NOT NULL,
  pengirim VARCHAR(255),
  tujuan VARCHAR(255),
  keterangan TEXT,
  INDEX idx_surat_type_tanggal (type, tanggal)
);

CREATE TABLE IF NOT EXISTS stok_obat (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nama VARCHAR(255) NOT NULL UNIQUE,
  stok INT NOT NULL,
  satuan VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS pemakaian_obat (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  obat_id BIGINT,
  nama_obat VARCHAR(255) NOT NULL,
  jumlah INT NOT NULL,
  satuan VARCHAR(255) NOT NULL,
  FOREIGN KEY (obat_id) REFERENCES stok_obat(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_pemakaian_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS kegiatan_lain (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  nama_kegiatan VARCHAR(255) NOT NULL,
  petugas VARCHAR(255) NOT NULL,
  keterangan TEXT,
  INDEX idx_kegiatan_lain_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS layanan_usg (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  jumlah INT NOT NULL,
  hasil VARCHAR(255) NOT NULL,
  foto VARCHAR(255),
  INDEX idx_layanan_usg_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS kunjungan_tamu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tanggal DATE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT NOT NULL,
  no_hp VARCHAR(50) NOT NULL,
  tujuan TEXT NOT NULL,
  INDEX idx_kunjungan_tamu_tanggal (tanggal)
);

-- Insert default users
INSERT INTO users (username, password, role, name) VALUES
('admin', '123', 'admin', 'Administrator'),
('petugas', '123', 'staff', 'Petugas Lapangan')
ON DUPLICATE KEY UPDATE username=username;

-- Insert default stok_obat
INSERT INTO stok_obat (nama, stok, satuan) VALUES
('Antibiotik A', 100, 'Botol'),
('Vitamin B Kompleks', 50, 'Botol'),
('Disinfektan', 20, 'Liter')
ON DUPLICATE KEY UPDATE nama=nama;
