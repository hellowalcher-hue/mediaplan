<?php
// api/controllers/ActivitiesController.php

class ActivitiesController {
    private PDO $db;
    public function __construct() { $this->db = getDB(); }

    public function index(): void {
        $dateFrom  = $_GET['date_from']  ?? null;
        $dateTo    = $_GET['date_to']    ?? null;
        $projectId = $_GET['project_id'] ?? null;
        $typeId    = $_GET['type_id']    ?? null;
        $groupId   = $_GET['group_id']   ?? null;
        $noDeadline = $_GET['no_deadline'] ?? null;

        $sql = '
            SELECT
                a.*,
                p.name        AS project_name,
                p.emoji       AS project_emoji,
                p.color       AS project_color,
                t.name        AS type_name,
                t.color       AS type_color,
                g.name        AS group_name,
                g.color       AS group_color,
                ad.description     AS detail_description,
                ad.goal            AS detail_goal,
                ad.expected_result AS detail_expected_result,
                ad.actual_result   AS detail_actual_result,
                (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id) AS tasks_count,
                (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id AND tk.status = "done") AS tasks_done_count,
                (ad.id IS NOT NULL AND (ad.description IS NOT NULL OR ad.goal IS NOT NULL)) AS has_details
            FROM activities a
            LEFT JOIN projects        p  ON p.id = a.project_id
            LEFT JOIN activity_types  t  ON t.id = a.type_id
            LEFT JOIN activity_groups g  ON g.id = a.group_id
            LEFT JOIN activity_details ad ON ad.activity_id = a.id
            WHERE 1=1
        ';
        $params = [];

        if ($noDeadline !== null) {
            $sql .= ' AND a.no_deadline = 1';
            if ($noDeadline !== 'all') {
                $sql .= ' AND a.deadline_scope = :scope';
                $params[':scope'] = $noDeadline;
            }
        } elseif ($dateFrom && $dateTo) {
            // Активности пересекающиеся с диапазоном
            $sql .= ' AND (
                (a.date_from IS NULL AND a.date_to IS NULL)
                OR (a.date_from <= :date_to AND (a.date_to IS NULL OR a.date_to >= :date_from))
            ) AND a.no_deadline = 0';
            $params[':date_from'] = $dateFrom;
            $params[':date_to']   = $dateTo;
        }

        if ($projectId) { $sql .= ' AND a.project_id = :project_id'; $params[':project_id'] = $projectId; }
        if ($typeId)    { $sql .= ' AND a.type_id = :type_id';    $params[':type_id']    = $typeId; }
        if ($groupId)   { $sql .= ' AND a.group_id = :group_id';  $params[':group_id']   = $groupId; }

        $sql .= ' ORDER BY a.date_from, a.sort_order, a.id';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Cast integer flags
        foreach ($rows as &$r) {
            $r['is_process']     = (bool)$r['is_process'];
            $r['no_deadline']    = (bool)$r['no_deadline'];
            $r['show_time']      = (bool)$r['show_time'];
            $r['has_details']    = (bool)$r['has_details'];
            $r['tasks_count']    = (int)$r['tasks_count'];
            $r['tasks_done_count'] = (int)$r['tasks_done_count'];
        }
        json($rows);
    }

    public function show(int $id): void {
        $stmt = $this->db->prepare('
            SELECT
                a.*,
                p.name        AS project_name,
                p.emoji       AS project_emoji,
                p.color       AS project_color,
                t.name        AS type_name,
                t.color       AS type_color,
                g.name        AS group_name,
                g.color       AS group_color,
                ad.description     AS detail_description,
                ad.goal            AS detail_goal,
                ad.expected_result AS detail_expected_result,
                ad.actual_result   AS detail_actual_result,
                (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id) AS tasks_count,
                (SELECT COUNT(*) FROM tasks tk WHERE tk.activity_id = a.id AND tk.status = "done") AS tasks_done_count
            FROM activities a
            LEFT JOIN projects        p  ON p.id = a.project_id
            LEFT JOIN activity_types  t  ON t.id = a.type_id
            LEFT JOIN activity_groups g  ON g.id = a.group_id
            LEFT JOIN activity_details ad ON ad.activity_id = a.id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) { jsonError(404, 'Activity not found'); return; }
        $row['is_process']     = (bool)$row['is_process'];
        $row['no_deadline']    = (bool)$row['no_deadline'];
        $row['show_time']      = (bool)$row['show_time'];
        $row['tasks_count']    = (int)$row['tasks_count'];
        $row['tasks_done_count'] = (int)$row['tasks_done_count'];
        json($row);
    }

    public function store(): void {
        $body = getBody();
        $stmt = $this->db->prepare('
            INSERT INTO activities
              (title, short_desc, comment, date_from, date_to, time_publish, show_time,
               project_id, type_id, group_id, is_process, status, no_deadline, deadline_scope, sort_order)
            VALUES
              (:title, :short_desc, :comment, :date_from, :date_to, :time_publish, :show_time,
               :project_id, :type_id, :group_id, :is_process, :status, :no_deadline, :deadline_scope, :sort_order)
        ');
        $stmt->execute([
            ':title'          => $body['title']          ?? '',
            ':short_desc'     => $body['short_desc']     ?? null,
            ':comment'        => $body['comment']        ?? null,
            ':date_from'      => $body['date_from']      ?? null,
            ':date_to'        => $body['date_to']        ?? null,
            ':time_publish'   => $body['time_publish']   ?? null,
            ':show_time'      => $body['show_time']      ?? 0,
            ':project_id'     => $body['project_id']     ?? null,
            ':type_id'        => $body['type_id']        ?? null,
            ':group_id'       => $body['group_id']       ?? null,
            ':is_process'     => $body['is_process']     ?? 0,
            ':status'         => $body['status']         ?? 'active',
            ':no_deadline'    => $body['no_deadline']    ?? 0,
            ':deadline_scope' => $body['deadline_scope'] ?? null,
            ':sort_order'     => $body['sort_order']     ?? 0,
        ]);
        $newId = (int)$this->db->lastInsertId();

        // Сохраняем детали если переданы
        $this->upsertDetails($newId, $body);

        $this->show($newId);
    }

    public function update(?int $id): void {
        $body = getBody();
        $allowed = ['title','short_desc','comment','date_from','date_to','time_publish','show_time',
                    'project_id','type_id','group_id','is_process','status','no_deadline','deadline_scope','sort_order'];
        $fields = []; $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "$f = :$f";
                $params[":$f"] = $body[$f];
            }
        }
        if ($fields) {
            $params[':id'] = $id;
            $this->db->prepare('UPDATE activities SET ' . implode(', ', $fields) . ' WHERE id = :id')
                     ->execute($params);
        }
        $this->upsertDetails($id, $body);
        $this->show($id);
    }

    public function destroy(?int $id): void {
        $this->db->prepare('DELETE FROM activities WHERE id = ?')->execute([$id]);
        json(['ok' => true]);
    }

    private function upsertDetails(int $activityId, array $body): void {
        $detailFields = ['description','goal','expected_result','actual_result'];
        $hasDetail = false;
        foreach ($detailFields as $f) {
            if (array_key_exists("detail_$f", $body)) { $hasDetail = true; break; }
        }
        if (!$hasDetail) return;

        $stmt = $this->db->prepare(
            'INSERT INTO activity_details (activity_id, description, goal, expected_result, actual_result)
             VALUES (:activity_id, :description, :goal, :expected_result, :actual_result)
             ON DUPLICATE KEY UPDATE
               description     = VALUES(description),
               goal            = VALUES(goal),
               expected_result = VALUES(expected_result),
               actual_result   = VALUES(actual_result)'
        );
        $stmt->execute([
            ':activity_id'     => $activityId,
            ':description'     => $body['detail_description']     ?? null,
            ':goal'            => $body['detail_goal']            ?? null,
            ':expected_result' => $body['detail_expected_result'] ?? null,
            ':actual_result'   => $body['detail_actual_result']   ?? null,
        ]);
    }
}
