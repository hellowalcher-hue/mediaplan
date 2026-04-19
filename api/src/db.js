// src/db.js
import mysql from 'mysql2/promise'

export const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     +(process.env.DB_PORT   || 3306),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'mediaplan',
  charset:  'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
})

// Ensure tables exist — run schema on startup
export async function initSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS projects (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      emoji VARCHAR(10) DEFAULT '📁',
      color VARCHAR(7) NOT NULL DEFAULT '#378ADD',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS activity_types (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#378ADD',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS activity_groups (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#E8593C',
      date_from DATE NOT NULL,
      date_to DATE NOT NULL,
      project_id INT UNSIGNED,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS activities (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      short_desc TEXT,
      comment TEXT,
      date_from DATE,
      date_to DATE,
      time_publish TIME DEFAULT NULL,
      show_time TINYINT(1) DEFAULT 0,
      project_id INT UNSIGNED,
      type_id INT UNSIGNED,
      group_id INT UNSIGNED,
      is_process TINYINT(1) DEFAULT 0,
      status ENUM('active','done','cancelled') DEFAULT 'active',
      no_deadline TINYINT(1) DEFAULT 0,
      deadline_scope ENUM('week','month','none') DEFAULT NULL,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (type_id) REFERENCES activity_types(id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES activity_groups(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS activity_details (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      activity_id INT UNSIGNED NOT NULL UNIQUE,
      description TEXT,
      goal TEXT,
      expected_result TEXT,
      actual_result TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS assignees (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      avatar_color VARCHAR(7) DEFAULT '#7F77DD',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS tasks (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      activity_id INT UNSIGNED NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      assignee_id INT UNSIGNED,
      deadline DATE DEFAULT NULL,
      status ENUM('todo','in_progress','done','cancelled') DEFAULT 'todo',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES assignees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    try { await db.query(stmt) } catch (e) { console.error('Schema error:', e.message) }
  }

  // Seed default activity types if none exist
  const [rows] = await db.query('SELECT COUNT(*) AS c FROM activity_types')
  if (rows[0].c === 0) {
    await db.query(`
      INSERT INTO activity_types (name, color, sort_order) VALUES
      ('IG', '#E1306C', 1), ('TG', '#229ED9', 2), ('VK', '#4C75A3', 3),
      ('Email', '#EA4335', 4), ('YouTube', '#FF0000', 5),
      ('CRM', '#FF7A00', 6), ('Mailing', '#7F77DD', 7)
    `)
  }
}
