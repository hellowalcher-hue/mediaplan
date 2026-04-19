<?php
// api/middleware/cors.php

function applyCors(): void {
    $allowed = $_SERVER['HTTP_ORIGIN'] ?? '*';

    header("Access-Control-Allow-Origin: $allowed");
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
