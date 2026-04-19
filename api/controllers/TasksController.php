<?php
// api/controllers/TasksController.php

class TasksController {
    private PDO $db;
    public function __construct() { $this->db = getDB(); }

    public function index(): void {
        $activityId = $_GET['activity_id'] ?? null;
        $projectId  = $_GET['project_id']  ?? null;
        $assigneeId = $_GET['assignee_id'] ?? null;
        $status     = $_GET['status']      ?? null;

        $sql = '
            SELECT
                tk.*,
                a.title        AS activity_title,
                a.date_from    AS activity_date,
                p.name         AS project_name,
                p.color        AS project_color,
                p.emoji        AS project_emoji,
                asgn.name      AS assignee_name,
                asgn.avatar_color AS assignee_color
            FROM tasks tk
            LEFT JOIN activities a    ON a.id = tk.activity_id
            LEFT JOIN projects   p    ON p.id = a.project_id
            LEFT JOIN assignees  asgn ON asgn.id = tk.assignee_id
            WHERE 1=1
        ';
        $params = [];
        if ($activityId) { $sql .= ' AND tk.activity_id = :activity_id'; $params[':activity_id'] = $activityId; }
        if ($projectId)  { $sql .= ' AND a.project_id = :project_id';   $params[':project_id']  = $projectId; }
        if ($assigneeId) { $sql .= ' AND tk.assignee_id = :assignee_id'; $params[':assignee_id'] = $assigneeId; }
        if ($status)     { $sql .= ' AND tk.status = :status';           $params[':status']      = $status; }
        $sql .= ' ORDER BY tk.deadline, tk.sort_order, tk.id';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }

    public function byActivity(?int $activityId): void {
        $stmt = $this->db->prepare('
            SELECT tk.*, asgn.name AS assignee_name, asgn.avatar_color AS assignee_color
            FROM tasks tk
            LEFT JOIN assignees asgn ON asgn.id = tk.assignee_id
            WHERE tk.activity_id = ?
            ORDER BY tk.sort_order, tk.id
        ');
        $stmt->execute([$activityId]);
        json($stmt->fetchAll());
    }

    public function show(int $id): void {
        $stmt = $this->db->prepare('
            SELECT tk.*, asgn.name AS assignee_name, asgn.avatar_color AS assignee_color
            FROM tasks tk
            LEFT JOIN assignees asgn ON asgn.id = tk.assignee_id
            WHERE tk.id = ?
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row ? json($row) : jsonError(404, 'Task not found');
    }

    public function store(?int $activityId = null): void {
        $body = getBody();
        $actId = $activityId ?? $body['activity_id'] ?? null;
        if (!$actId) { jsonError(400, 'activity_id required'); return; }

        $stmt = $this->db->prepare('
            INSERT INTO tasks (activity_id, title, description, assignee_id, deadline, status, sort_order)
            VALUES (:activity_id, :title, :description, :assignee_id, :deadline, :status, :sort_order)
        ');
        $stmt->execute([
            ':activity_id' => $actId,
            ':title'       => $body['title']       ?? '',
            ':description' => $body['description'] ?? null,
            ':assignee_id' => $body['assignee_id'] ?? null,
            ':deadline'    => $body['deadline']    ?? null,
            ':status'      => $body['status']      ?? 'todo',
            ':sort_order'  => $body['sort_order']  ?? 0,
        ]);
        $this->show((int)$this->db->lastInsertId());
    }

    public function update(?int $id): void {
        $body = getBody();
        $allowed = ['title','description','assignee_id','deadline','status','sort_order'];
        $fields = []; $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if ($fields) {
            $params[':id'] = $id;
            $this->db->prepare('UPDATE tasks SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        }
        $this->show($id);
    }

    public function destroy(?int $id): void {
        $this->db->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);
        json(['ok' => true]);
    }
}
