<?php
// api/controllers/AssigneesController.php

class AssigneesController {
    private PDO $db;
    public function __construct() { $this->db = getDB(); }

    public function index(): void {
        $rows = $this->db->query('SELECT * FROM assignees ORDER BY sort_order, name')->fetchAll();
        json($rows);
    }

    public function show(int $id): void {
        $stmt = $this->db->prepare('SELECT * FROM assignees WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row ? json($row) : jsonError(404, 'Assignee not found');
    }

    public function store(): void {
        $body = getBody();
        $stmt = $this->db->prepare(
            'INSERT INTO assignees (name, avatar_color, sort_order) VALUES (:name, :avatar_color, :sort_order)'
        );
        $stmt->execute([
            ':name'         => $body['name']         ?? '',
            ':avatar_color' => $body['avatar_color'] ?? '#7F77DD',
            ':sort_order'   => $body['sort_order']   ?? 0,
        ]);
        $this->show((int)$this->db->lastInsertId());
    }

    public function update(?int $id): void {
        $body = getBody();
        $fields = []; $params = [];
        foreach (['name','avatar_color','sort_order'] as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (!$fields) { json(['ok' => true]); return; }
        $params[':id'] = $id;
        $this->db->prepare('UPDATE assignees SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        $this->show($id);
    }

    public function destroy(?int $id): void {
        $this->db->prepare('DELETE FROM assignees WHERE id = ?')->execute([$id]);
        json(['ok' => true]);
    }
}
