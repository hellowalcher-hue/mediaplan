<?php
// api/controllers/ActivityTypesController.php

class ActivityTypesController {
    private PDO $db;
    public function __construct() { $this->db = getDB(); }

    public function index(): void {
        $rows = $this->db->query('SELECT * FROM activity_types ORDER BY sort_order, id')->fetchAll();
        json($rows);
    }

    public function show(int $id): void {
        $stmt = $this->db->prepare('SELECT * FROM activity_types WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row ? json($row) : jsonError(404, 'Type not found');
    }

    public function store(): void {
        $body = getBody();
        $stmt = $this->db->prepare(
            'INSERT INTO activity_types (name, color, sort_order) VALUES (:name, :color, :sort_order)'
        );
        $stmt->execute([
            ':name'       => $body['name']       ?? '',
            ':color'      => $body['color']      ?? '#378ADD',
            ':sort_order' => $body['sort_order'] ?? 0,
        ]);
        $this->show((int)$this->db->lastInsertId());
    }

    public function update(?int $id): void {
        $body = getBody();
        $fields = []; $params = [];
        foreach (['name','color','sort_order'] as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (!$fields) { json(['ok' => true]); return; }
        $params[':id'] = $id;
        $this->db->prepare('UPDATE activity_types SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        $this->show($id);
    }

    public function destroy(?int $id): void {
        $this->db->prepare('DELETE FROM activity_types WHERE id = ?')->execute([$id]);
        json(['ok' => true]);
    }
}
