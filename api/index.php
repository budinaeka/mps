<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$table = isset($_GET['table']) ? $_GET['table'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';
$type = isset($_GET['type']) ? $_GET['type'] : '';

// Whitelist tables to prevent SQL injection via table name
$allowed_tables = [
    'users', 'pengobatan', 'vaksinasi', 'monitoring', 
    'surveilans', 'surat', 'stok_obat', 'pemakaian_obat', 
    'kegiatan_lain', 'kunjungan_tamu'
];

if ($table && !in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid table']);
    exit;
}

switch ($method) {
    case 'GET':
        if (!$table) {
            http_response_code(400);
            echo json_encode(['error' => 'Table required']);
            exit;
        }

        $sql = "SELECT * FROM $table";
        $params = [];
        $where = [];

        if ($type) {
            $where[] = "type = ?";
            $params[] = $type;
        }

        if ($id) {
            $where[] = "id = ?";
            $params[] = $id;
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY id DESC";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($data);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'POST':
        if (!$table) {
            http_response_code(400);
            echo json_encode(['error' => 'Table required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }

        // Add type if provided in URL (for nested helper compatibility)
        if ($type) {
            $input['type'] = $type;
        }
        
        // Remove 'id' if present, let DB handle auto-increment
        unset($input['id']);
        unset($input['created_at']);

        $columns = array_keys($input);
        $values = array_values($input);
        $placeholders = array_fill(0, count($columns), '?');

        $sql = "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            $input['id'] = $pdo->lastInsertId();
            echo json_encode($input);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        if (!$table || !$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Table and ID required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }

        // Remove ID from input if present to avoid changing it
        unset($input['id']);
        unset($input['created_at']);

        $set = [];
        $values = [];
        foreach ($input as $key => $value) {
            $set[] = "$key = ?";
            $values[] = $value;
        }
        $values[] = $id;

        // If type is specified, ensure we only update correct type (safety check)
        $typeCheck = "";
        if ($type) {
            $typeCheck = " AND type = ?";
            $values[] = $type;
        }

        $sql = "UPDATE $table SET " . implode(', ', $set) . " WHERE id = ?" . $typeCheck;

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        if (!$table || !$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Table and ID required']);
            exit;
        }

        $sql = "DELETE FROM $table WHERE id = ?";
        $params = [$id];

        if ($type) {
            $sql .= " AND type = ?";
            $params[] = $type;
        }

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
