<?php
require_once 'config.php';

echo "<h2>Database Migration & Setup Tool</h2>";
echo "<pre>";

// 1. Create Tables if not exist
$tables_sql = [
    "users" => "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "pengobatan" => "CREATE TABLE IF NOT EXISTS pengobatan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        kecamatan VARCHAR(100),
        desa VARCHAR(100),
        pemilik VARCHAR(100),
        hewan VARCHAR(100),
        jumlah INT DEFAULT 0,
        diagnosa TEXT,
        terapi TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "vaksinasi" => "CREATE TABLE IF NOT EXISTS vaksinasi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        kecamatan VARCHAR(100),
        desa VARCHAR(100),
        jumlah INT DEFAULT 0,
        keterangan TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "monitoring" => "CREATE TABLE IF NOT EXISTS monitoring (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        tanggal DATE DEFAULT NULL,
        nama VARCHAR(100),
        kecamatan VARCHAR(100),
        desa VARCHAR(100),
        keterangan TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "surveilans" => "CREATE TABLE IF NOT EXISTS surveilans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        kecamatan VARCHAR(100),
        desa VARCHAR(100),
        jenis_penyakit VARCHAR(100),
        sampel VARCHAR(100),
        hasil VARCHAR(100),
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "phms" => "CREATE TABLE IF NOT EXISTS phms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        pemilik VARCHAR(100),
        kecamatan VARCHAR(100),
        desa VARCHAR(100),
        jumlah INT DEFAULT 0,
        mati INT DEFAULT 0,
        sehat INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "surat" => "CREATE TABLE IF NOT EXISTS surat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        nomor VARCHAR(100),
        tanggal DATE NOT NULL,
        perihal VARCHAR(255),
        tujuan VARCHAR(255),
        pengirim VARCHAR(255),
        keterangan TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "stok_obat" => "CREATE TABLE IF NOT EXISTS stok_obat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        stok INT DEFAULT 0,
        satuan VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "pemakaian_obat" => "CREATE TABLE IF NOT EXISTS pemakaian_obat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        obat_id INT,
        nama_obat VARCHAR(100),
        jumlah INT DEFAULT 0,
        satuan VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (obat_id) REFERENCES stok_obat(id) ON DELETE SET NULL
    )",
    "kegiatan_lain" => "CREATE TABLE IF NOT EXISTS kegiatan_lain (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        nama_kegiatan VARCHAR(255),
        petugas VARCHAR(255),
        keterangan TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "kunjungan_tamu" => "CREATE TABLE IF NOT EXISTS kunjungan_tamu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        nama VARCHAR(100),
        alamat TEXT,
        no_hp VARCHAR(50),
        tujuan TEXT,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "kreasi_konten" => "CREATE TABLE IF NOT EXISTS kreasi_konten (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        judul VARCHAR(255),
        nama_medsos VARCHAR(100),
        link VARCHAR(255),
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    "layanan_usg" => "CREATE TABLE IF NOT EXISTS layanan_usg (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kecamatan VARCHAR(255) NOT NULL,
        desa VARCHAR(255) NOT NULL,
        jumlah INT NOT NULL,
        hasil VARCHAR(255) NOT NULL,
        foto VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )"
];

foreach ($tables_sql as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "Checked table '$name'...\n";
    } catch (PDOException $e) {
        echo "Error checking table '$name': " . $e->getMessage() . "\n";
    }
}

// 2. Add 'foto' column if missing (Safe Update)
$tables_with_foto = [
    'pengobatan', 'vaksinasi', 'monitoring', 
    'surveilans', 'surat', 'kegiatan_lain', 'kunjungan_tamu'
];

foreach ($tables_with_foto as $table) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM $table LIKE 'foto'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE $table ADD COLUMN foto VARCHAR(255) DEFAULT NULL");
            echo "Added 'foto' column to '$table'.\n";
        } else {
            echo "Column 'foto' already exists in '$table'.\n";
        }
    } catch (PDOException $e) {
        echo "Error checking/adding column to '$table': " . $e->getMessage() . "\n";
    }
}

// 2b. Add 'tanggal' column to monitoring if missing (Safe Update)
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM monitoring LIKE 'tanggal'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE monitoring ADD COLUMN tanggal DATE DEFAULT NULL AFTER type");
        echo "Added 'tanggal' column to 'monitoring'.\n";
    } else {
        echo "Column 'tanggal' already exists in 'monitoring'.\n";
    }
} catch (PDOException $e) {
    echo "Error checking/adding 'tanggal' column to 'monitoring': " . $e->getMessage() . "\n";
}

// 3. Ensure Default Admin Exists
try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
    $stmt->execute();
    if ($stmt->rowCount() == 0) {
        $pdo->exec("INSERT INTO users (username, password, name, role) VALUES ('admin', 'admin123', 'Administrator', 'admin')");
        echo "Default admin user created.\n";
    } else {
        echo "Admin user already exists.\n";
    }
} catch (PDOException $e) {
    echo "Error checking admin user: " . $e->getMessage() . "\n";
}

echo "\nMigration Completed Successfully.</pre>";
?>
