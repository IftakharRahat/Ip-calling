/**
 * GSM SMS Gateway — Database Layer
 * 
 * SQLite database for message logging and template management.
 * Uses better-sqlite3 for synchronous, fast SQLite access.
 */

import Database from 'better-sqlite3';
import path from 'path';
import config from './config.js';

let db = null;

/**
 * Get or create the database connection.
 */
function getDb() {
  if (!db) {
    const dbPath = path.resolve(config.db.path);
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        recipient_name TEXT DEFAULT '',
        recipient_type TEXT DEFAULT 'general',
        template_id TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        confirmed_at TEXT DEFAULT NULL,
        sent_at TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general'
      );

      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    `);

    // Seed default templates if empty
    const count = db.prepare('SELECT COUNT(*) as count FROM templates').get();
    if (count.count === 0) {
      seedTemplates();
    }
  }

  return db;
}

/**
 * Seed default SMS templates.
 */
function seedTemplates() {
  const templates = [
    {
      id: 'interview_confirm',
      name: 'Interview Confirmation',
      body: 'Dear {name},\nYour interview with the tutor has been scheduled tomorrow at 4 PM.\nPlease be available on time.\nThank you — Bright Tutor',
      category: 'interview',
    },
    {
      id: 'payment_reminder',
      name: 'Payment Reminder',
      body: 'Dear {name},\nThis is a reminder that your payment is due. Please complete the payment at your earliest convenience.\nThank you — Bright Tutor',
      category: 'payment',
    },
    {
      id: 'tutor_matched',
      name: 'Tutor Matched',
      body: 'Dear {name},\nGreat news! We have found a suitable tutor for you. Please check the app for details and confirm your preference.\nThank you — Bright Tutor',
      category: 'matching',
    },
    {
      id: 'schedule_update',
      name: 'Schedule Update',
      body: 'Dear {name},\nYour class schedule has been updated. Please check the app for the latest timings.\nThank you — Bright Tutor',
      category: 'schedule',
    },
    {
      id: 'general_notification',
      name: 'General Notification',
      body: 'Dear {name},\n{custom_message}\nThank you — Bright Tutor',
      category: 'general',
    },
  ];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO templates (id, name, body, category) VALUES (?, ?, ?, ?)'
  );

  for (const t of templates) {
    insert.run(t.id, t.name, t.body, t.category);
  }
}

// ──────────────────────────────────────────
// MESSAGE CRUD
// ──────────────────────────────────────────

/**
 * Queue a new message (status = 'pending').
 */
export function queueMessage({ id, phone, message, recipientName, recipientType, templateId }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO messages (id, phone, message, recipient_name, recipient_type, template_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  stmt.run(id, phone, message, recipientName || '', recipientType || 'general', templateId || null);
}

/**
 * Get messages, optionally filtered by status.
 */
export function getMessages(status = null, limit = 50) {
  const db = getDb();

  if (status) {
    return db.prepare(
      'SELECT * FROM messages WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    ).all(status, limit);
  }

  return db.prepare(
    'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

/**
 * Get a single message by ID.
 */
export function getMessageById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

/**
 * Update message status.
 */
export function updateMessageStatus(id, status, extra = {}) {
  const db = getDb();
  const sets = ['status = ?'];
  const values = [status];

  if (extra.error !== undefined) {
    sets.push('error = ?');
    values.push(extra.error);
  }
  if (status === 'confirmed') {
    sets.push("confirmed_at = datetime('now', 'localtime')");
  }
  if (status === 'sent' || status === 'failed') {
    sets.push("sent_at = datetime('now', 'localtime')");
  }

  values.push(id);
  db.prepare(`UPDATE messages SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

// ──────────────────────────────────────────
// TEMPLATE CRUD
// ──────────────────────────────────────────

/**
 * Get all templates.
 */
export function getTemplates() {
  const db = getDb();
  return db.prepare('SELECT * FROM templates ORDER BY category, name').all();
}

// ──────────────────────────────────────────
// STATS
// ──────────────────────────────────────────

/**
 * Get dashboard statistics.
 */
export function getStats() {
  const db = getDb();

  const today = new Date().toISOString().slice(0, 10);

  const pending = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'pending'").get().count;
  const sentToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'sent' AND date(sent_at) = ?").get(today).count;
  const failedToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'failed' AND date(sent_at) = ?").get(today).count;
  const rejectedToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'rejected' AND date(created_at) = ?").get(today).count;
  const totalSent = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'sent'").get().count;

  return {
    pending,
    sentToday,
    failedToday,
    rejectedToday,
    totalSent,
  };
}
