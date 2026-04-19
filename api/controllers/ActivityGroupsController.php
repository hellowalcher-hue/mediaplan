<?php
// api/controllers/ActivityGroupsController.php

class ActivityGroupsController {
    private PDO $db;
    public function __construct() { $this->db = getDB(); }

    public function index(): void {
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo   = $_GET['date_to']   ?? null;

        $sql = 'SELECT ag.*, p.name AS project_name, p.emoji AS project_emoji
                FROM activity_groups ag
                LEFT JOIN projects p ON p.id = ag.project_id
                WHERE 1=1';
        $params = [];

        if ($dateFrom && $dateTo) {
            // Показываем группы, которые пересекаются с запрошенным периодом
            $sql .= ' AND ag.date_from <= :date_to AND ag.date_to >= :date_from';
            $params[':date_from'] = $dateFrom;
            $params[':date_to']   = $dateTo;
        }
        $sql .= ' ORDER BY ag.date_from, ag.sort_order';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }

    public function show(int $id): void {
        $stmt = $this->db->prepare(
            'SELECT ag.*, p.name AS project_name, p.emoji AS project_emoji
             FROM activity_groups ag
             LEFT JOIN projects p ON p.id = ag.project_id
             WHERE ag.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row ? json($row) : jsonError(404, 'Group not found');
    }

    public function store(): void {
        $body = getBody();
        $stmt = $this->db->prepare(
            'INSERT INTO activity_groups (name, color, date_from, date_to, project_id, sort_order)
             VALUES (:name, :color, :date_from, :date_to, :project_id, :sort_order)'
        );
        $stmt->execute([
            ':name'       => $body['name']       ?? '',
            ':color'      => $body['color']      ?? '#E8593C',
            ':date_from'  => $body['date_from']  ?? date('Y-m-d'),
            ':date_to'    => $body['date_to']    ?? date('Y-m-d'),
            ':project_id' => $body['project_id'] ?? null,
            ':sort_order' => $body['sort_order'] ?? 0,
        ]);
        $this->show((int)$this->db->lastInsertId());
    }

    public function update(?int $id): void {
        $body = getBody();
        $fields = []; $params = [];
        foreach (['name','color','date_from','date_to','project_id','sort_order'] as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (!$fields) { json(['ok' => true]); return; }
        $params[':id'] = $id;
        $this->db->prepare('UPDATE activity_groups SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        $this->show($id);
    }

    public function destroy(?int $id): void {
        $this->db->prepare('DELETE FROM activity_groups WHERE id = ?')->execute([$id]);
        json(['ok' => true]);
    }
}
