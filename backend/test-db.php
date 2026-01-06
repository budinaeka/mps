<?php
require 'config.php';

if ($pdo) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Koneksi database berhasil!',
        'detail' => [
            'host' => $host,
            'database' => $db,
            'user' => $user
        ]
    ], JSON_PRETTY_PRINT);
}
?>