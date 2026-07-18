<?php
/**
 * CoreCut Admin — File Save API
 * Upload this file to: public_html/corecut/admin/save.php
 * Change the PASSWORD below before uploading!
 */

// ── Config ──────────────────────────────────────────────────
define('ADMIN_PASSWORD', 'corecut2026');   // CHANGE THIS
define('SITE_ROOT', dirname(__DIR__));     // = public_html/corecut/

// ── CORS ────────────────────────────────────────────────────
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true) ?: [];
$pass = $body['password'] ?? ($_GET['password'] ?? '');
if ($pass !== ADMIN_PASSWORD) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $body['action'] ?? ($_GET['action'] ?? '');

// ── LIST FILES ───────────────────────────────────────────────
if ($action === 'list') {
    $files = [];
    $allowed = ['*.html', 'css/*.css', '*.css'];
    $iter = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(SITE_ROOT));
    foreach ($iter as $file) {
        if ($file->isDir()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, ['html','css','js'])) continue;
        $rel = str_replace(SITE_ROOT . DIRECTORY_SEPARATOR, '', $file->getPathname());
        $rel = str_replace('\\', '/', $rel);
        // skip admin itself and hidden files
        if (strpos($rel, 'admin/') === 0) continue;
        if (strpos($rel, '.') === 0) continue;
        $files[] = ['path' => $rel, 'size' => $file->getSize(), 'modified' => date('Y-m-d H:i', $file->getMTime())];
    }
    usort($files, function($a,$b){ return strcmp($a['path'],$b['path']); });
    echo json_encode(['files' => $files]);
    exit;
}

// ── READ FILE ────────────────────────────────────────────────
if ($action === 'read') {
    $rel = $body['file'] ?? '';
    $abs = realpath(SITE_ROOT . '/' . $rel);
    if (!$abs || strpos($abs, SITE_ROOT) !== 0) {
        http_response_code(400); echo json_encode(['error' => 'Invalid path']); exit;
    }
    if (!file_exists($abs)) {
        http_response_code(404); echo json_encode(['error' => 'File not found']); exit;
    }
    echo json_encode(['content' => file_get_contents($abs), 'file' => $rel]);
    exit;
}

// ── SAVE FILE ────────────────────────────────────────────────
if ($action === 'save') {
    $rel     = $body['file'] ?? '';
    $content = $body['content'] ?? '';
    if (!$rel) { http_response_code(400); echo json_encode(['error' => 'No file specified']); exit; }
    $abs = SITE_ROOT . '/' . ltrim($rel, '/');
    $abs = str_replace(['../', '..\\'], '', $abs); // path traversal guard
    $dir = dirname($abs);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (file_put_contents($abs, $content) === false) {
        http_response_code(500); echo json_encode(['error' => 'Could not write file']); exit;
    }
    echo json_encode(['success' => true, 'file' => $rel, 'bytes' => strlen($content)]);
    exit;
}

// ── CREATE FILE ──────────────────────────────────────────────
if ($action === 'create') {
    $rel = $body['file'] ?? '';
    if (!$rel) { http_response_code(400); echo json_encode(['error' => 'No filename']); exit; }
    $abs = SITE_ROOT . '/' . ltrim($rel, '/');
    $abs = str_replace(['../', '..\\'], '', $abs);
    if (file_exists($abs)) { http_response_code(409); echo json_encode(['error' => 'File already exists']); exit; }
    $dir = dirname($abs);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($abs, "<!-- " . basename($rel) . " -->\n");
    echo json_encode(['success' => true, 'file' => $rel]);
    exit;
}

// ── DELETE FILE ──────────────────────────────────────────────
if ($action === 'delete') {
    $rel = $body['file'] ?? '';
    $abs = realpath(SITE_ROOT . '/' . $rel);
    if (!$abs || strpos($abs, SITE_ROOT) !== 0) {
        http_response_code(400); echo json_encode(['error' => 'Invalid path']); exit;
    }
    unlink($abs);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
