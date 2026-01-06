<?php
require 'config.php';

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$table = isset($_GET['table']) ? $_GET['table'] : null;
$id = isset($_GET['id']) ? $_GET['id'] : null;
$type = isset($_GET['type']) ? $_GET['type'] : null;

if (!$table) {
    http_response_code(400);
    echo json_encode(['error' => 'Table not specified']);
    exit;
}

// Whitelist tables for security
$allowed_tables = ['users', 'pengobatan', 'vaksinasi', 'monitoring', 'surveilans', 'surat', 'stok_obat', 'pemakaian_obat', 'kegiatan_lain', 'kunjungan_tamu'];
if (!in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid table']);
    exit;
}

switch ($method) {
    case 'GET':
        $sql = "SELECT * FROM $table";
        $params = [];
        $where = [];

        if ($id) {
            $where[] = "id = ?";
            $params[] = $id;
        }
        if ($type) {
            $where[] = "type = ?";
            $params[] = $type;
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        $sql .= " ORDER BY id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        echo json_encode($data);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            exit;
        }

        // Remove any keys that are not columns (security measure recommended, but for now simple)
        // Also remove 'id' if present as it's auto-increment
        if (isset($input['id'])) unset($input['id']);
        if (isset($input['created_at'])) unset($input['created_at']);

        $columns = array_keys($input);
        if (empty($columns)) {
            http_response_code(400);
            echo json_encode(['error' => 'No data to insert']);
            exit;
        }

        $placeholders = array_fill(0, count($columns), '?');
        
        $sql = "INSERT INTO $table (" . implode(',', $columns) . ") VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        
        try {
            $stmt->execute(array_values($input));
            $input['id'] = $pdo->lastInsertId();
            echo json_encode($input);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required for update']);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            exit;
        }

        // Remove immutable fields
        if (isset($input['id'])) unset($input['id']);
        if (isset($input['created_at'])) unset($input['created_at']);

        $sets = [];
        $params = [];
        foreach ($input as $key => $value) {
            $sets[] = "$key = ?";
            $params[] = $value;
        }
        
        if (empty($sets)) {
            echo json_encode(['success' => true, 'message' => 'No changes']);
            exit;
        }

        $params[] = $id;

        $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);

        try {
            $stmt->execute($params);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required for delete']);
            exit;
        }
        $sql = "DELETE FROM $table WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        try {
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
}
?>
