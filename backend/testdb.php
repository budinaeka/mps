<?php
$host = 'mps';
$db = 'puskeswan_db';
$user = 'admin_mps';
$pass = 'Suk@bumi2213';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    echo "Connected successfully!";
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}