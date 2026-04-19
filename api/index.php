<?php
// api/index.php — Main router

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/controllers/ProjectsController.php';
require_once __DIR__ . '/controllers/ActivityTypesController.php';
require_once __DIR__ . '/controllers/ActivityGroupsController.php';
require_once __DIR__ . '/controllers/ActivitiesController.php';
require_once __DIR__ . '/controllers/TasksController.php';
require_once __DIR__ . '/controllers/AssigneesController.php';

// ---- CORS & JSON headers ----
applyCors();
header('Content-Type: application/json; charset=utf-8');

// ---- Router ----
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip base path (e.g. /api) — adjust if needed
$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/') ?: '/';

// Parse path segments
$parts = explode('/', trim($uri, '/'));
$resource = $parts[0] ?? '';
$id       = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;
$sub      = $parts[2] ?? null;   // e.g. /activities/5/tasks

try {
    match ($resource) {
        'projects'        => routeResource(new ProjectsController(),        $method, $id),
        'activity-types'  => routeResource(new ActivityTypesController(),   $method, $id),
        'activity-groups' => routeResource(new ActivityGroupsController(),  $method, $id),
        'activities'      => $sub === 'tasks'
                               ? routeNested(new TasksController(), $method, $id)
                               : routeResource(new ActivitiesController(),  $method, $id),
        'tasks'           => routeResource(new TasksController(),           $method, $id),
        'assignees'       => routeResource(new AssigneesController(),       $method, $id),
        default           => jsonError(404, 'Not found'),
    };
} catch (Throwable $e) {
    jsonError(500, $e->getMessage());
}

// ---- Helpers ----

function routeResource(object $ctrl, string $method, ?int $id): void {
    match ($method) {
        'GET'    => $id ? $ctrl->show($id)  : $ctrl->index(),
        'POST'   => $ctrl->store(),
        'PUT',
        'PATCH'  => $ctrl->update($id),
        'DELETE' => $ctrl->destroy($id),
        default  => jsonError(405, 'Method not allowed'),
    };
}

function routeNested(object $ctrl, string $method, ?int $activityId): void {
    // GET /activities/{id}/tasks  or  POST /activities/{id}/tasks
    match ($method) {
        'GET'  => $ctrl->byActivity($activityId),
        'POST' => $ctrl->store($activityId),
        default => jsonError(405, 'Method not allowed'),
    };
}

function json(mixed $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(int $status, string $message): void {
    json(['error' => $message], $status);
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw ?: '{}', true) ?? [];
}
