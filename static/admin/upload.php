<?php
/**
 * CoreCut Admin — File Storage Handler
 * Upload to: public_html/corecut/admin/upload.php
 */

define('ADMIN_PASS',   'corecut2026');
define('UPLOAD_DIR',   realpath(__DIR__ . '/..') . '/uploads/');
define('SITE_BASE',    'https://corecut.matrixland.net');
define('UPLOAD_PATH',  '/uploads/');
define('MAX_SIZE',     100 * 1024 * 1024); // 100 MB

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ── Parse input ───────────────────────────────────────────────
$action   = '';
$password = '';
$body     = [];
$ct = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';

if (strpos($ct, 'application/json') !== false) {
    $raw    = file_get_contents('php://input');
    $body   = json_decode($raw, true) ?: [];
    $password = isset($body['password']) ? $body['password'] : '';
    $action   = isset($body['action'])   ? $body['action']   : '';
} else {
    // multipart / form-encoded (file uploads)
    $password = isset($_POST['password']) ? $_POST['password'] : (isset($_GET['password']) ? $_GET['password'] : '');
    $action   = isset($_POST['action'])   ? $_POST['action']   : (isset($_GET['action'])   ? $_GET['action']   : '');
}

// ── Auth ──────────────────────────────────────────────────────
if ($password !== ADMIN_PASS) {
    echo json_encode(['error' => 'Unauthorized']); exit;
}

// ── Ensure uploads dir exists ─────────────────────────────────
if (!is_dir(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
    // Prevent direct listing
    @file_put_contents(UPLOAD_DIR . '.htaccess', "Options -Indexes\n");
}

// ── Dispatch ──────────────────────────────────────────────────
switch ($action) {

    // LIST all uploaded files
    case 'list':
        $files = [];
        $total_size = 0;
        if (is_dir(UPLOAD_DIR)) {
            foreach (glob(UPLOAD_DIR . '*') as $fp) {
                if (!is_file($fp)) continue;
                $name = basename($fp);
                if ($name === '.htaccess') continue;
                $size = filesize($fp);
                $total_size += $size;
                $mime = function_exists('mime_content_type') ? mime_content_type($fp) : 'application/octet-stream';
                $files[] = [
                    'name' => $name,
                    'size' => $size,
                    'url'  => SITE_BASE . UPLOAD_PATH . rawurlencode($name),
                    'time' => filemtime($fp),
                    'mime' => $mime,
                ];
            }
        }
        usort($files, function($a, $b){ return $b['time'] - $a['time']; });
        echo json_encode(['files' => $files, 'count' => count($files), 'total_size' => $total_size]);
        break;

    // UPLOAD a file
    case 'upload':
        if (empty($_FILES['file'])) {
            echo json_encode(['error' => 'No file received']); exit;
        }
        $f = $_FILES['file'];
        if ($f['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'File exceeds server limit',
                UPLOAD_ERR_FORM_SIZE  => 'File exceeds form limit',
                UPLOAD_ERR_PARTIAL    => 'Upload was partial',
                UPLOAD_ERR_NO_FILE    => 'No file sent',
                UPLOAD_ERR_NO_TMP_DIR => 'No temp directory',
                UPLOAD_ERR_CANT_WRITE => 'Cannot write to disk',
            ];
            $msg = isset($errors[$f['error']]) ? $errors[$f['error']] : 'Upload error '.$f['error'];
            echo json_encode(['error' => $msg]); exit;
        }
        if ($f['size'] > MAX_SIZE) {
            echo json_encode(['error' => 'File too large (max 100 MB)']); exit;
        }
        // Sanitize filename
        $orig = basename($f['name']);
        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', $orig);
        $safe = ltrim($safe, '.');
        if (!$safe) $safe = 'file_' . time();
        // Avoid overwrite — append timestamp if exists
        if (file_exists(UPLOAD_DIR . $safe)) {
            $info  = pathinfo($safe);
            $ext   = isset($info['extension']) ? '.' . $info['extension'] : '';
            $base  = isset($info['filename'])  ? $info['filename']        : $safe;
            $safe  = $base . '_' . time() . $ext;
        }
        if (!move_uploaded_file($f['tmp_name'], UPLOAD_DIR . $safe)) {
            echo json_encode(['error' => 'Failed to save file to disk']); exit;
        }
        echo json_encode([
            'ok'   => true,
            'name' => $safe,
            'url'  => SITE_BASE . UPLOAD_PATH . rawurlencode($safe),
            'size' => $f['size'],
        ]);
        break;

    // DELETE a file
    case 'delete':
        $name = isset($body['file']) ? basename($body['file']) : '';
        if (!$name) { echo json_encode(['error' => 'No filename']); exit; }
        $fp = UPLOAD_DIR . $name;
        if (!file_exists($fp) || !is_file($fp)) {
            echo json_encode(['error' => 'File not found']); exit;
        }
        unlink($fp);
        echo json_encode(['ok' => true]);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
