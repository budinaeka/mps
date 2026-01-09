<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$uploadDir = '../uploads/';

// Create directory if not exists
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.']);
    exit;
}

// Validate file size (e.g., max 5MB)
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Max 5MB.']);
    exit;
}

// Generate filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);

$customName = '';
if (isset($_POST['tanggal']) && isset($_POST['feature']) && isset($_POST['nama'])) {
    $date = $_POST['tanggal'];
    $feature = $_POST['feature'];
    $name = $_POST['nama'];

    // Sanitize input
    $date = preg_replace('/[^a-zA-Z0-9-]/', '-', $date);
    $feature = preg_replace('/[^a-zA-Z0-9-]/', '-', $feature);
    $name = preg_replace('/[^a-zA-Z0-9-]/', '-', $name);
    
    // Construct base filename
    $customName = $date . '-' . $feature . '-' . $name;
}

if (!empty($customName)) {
    // Add timestamp for uniqueness
    $filename = $customName . '_' . time() . '.' . $ext;
} else {
    $filename = uniqid() . '_' . time() . '.' . $ext;
}

$targetPath = $uploadDir . $filename;

// Compression Function
function compressImage($source, $destination, $quality) {
    $info = getimagesize($source);
    $mime = $info['mime'];
    
    // Create image resource
    switch ($mime) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($source);
            break;
        case 'image/png':
            $image = imagecreatefrompng($source);
            break;
        case 'image/gif':
            $image = imagecreatefromgif($source);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($source);
            break;
        default:
            return false;
    }

    if (!$image) return false;

    // Resize logic
    $width = imagesx($image);
    $height = imagesy($image);
    $maxWidth = 800; // Max width 800px
    
    if ($width > $maxWidth) {
        $newWidth = $maxWidth;
        $newHeight = floor($height * ($maxWidth / $width));
        $tmp = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency
        if ($mime == 'image/png' || $mime == 'image/webp' || $mime == 'image/gif') {
            imagecolortransparent($tmp, imagecolorallocatealpha($tmp, 0, 0, 0, 127));
            imagealphablending($tmp, false);
            imagesavealpha($tmp, true);
        }
        
        imagecopyresampled($tmp, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);
        $image = $tmp;
    }

    // Save with compression
    $result = false;
    switch ($mime) {
        case 'image/jpeg':
            $result = imagejpeg($image, $destination, $quality); // 0-100
            break;
        case 'image/png':
            $result = imagepng($image, $destination, 8); // 0-9 (8 is high compression)
            break;
        case 'image/gif':
            $result = imagegif($image, $destination); // No compression param for gif
            break;
        case 'image/webp':
            $result = imagewebp($image, $destination, $quality); // 0-100
            break;
    }
    
    imagedestroy($image);
    return $result;
}

// Check if GD extension is loaded
if (extension_loaded('gd')) {
    // Try to compress
    if (compressImage($file['tmp_name'], $targetPath, 70)) {
        echo json_encode(['filename' => $filename]);
    } else {
        // Fallback if compression fails (e.g. invalid image data)
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            echo json_encode(['filename' => $filename]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save file']);
        }
    }
} else {
    // Fallback if GD not enabled
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['filename' => $filename]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to move uploaded file']);
    }
}
