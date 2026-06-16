<?php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API routes → Laravel backend
if (strpos($uri, '/api/') === 0) {
    require __DIR__ . '/backend/vendor/autoload.php';
    $app = require __DIR__ . '/backend/bootstrap/app.php';
    $app->handleRequest(\Illuminate\Http\Request::capture());
    exit;
}

// Setup wizard
if ($uri === '/setup.php') {
    require __DIR__ . '/backend/public/setup.php';
    exit;
}

// Everything else → React SPA
$file = __DIR__ . '/index.html';
if (file_exists($file)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($file);
} else {
    http_response_code(404);
    echo 'Not found';
}
