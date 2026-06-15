import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Permite override via env (Fly volume em prod, ./data em dev)
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ===== Schema =====
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  premium_since TEXT,
  mp_subscription_id TEXT,
  mp_payer_id TEXT,
  trial_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_data (
  user_id TEXT PRIMARY KEY,
  songs TEXT NOT NULL DEFAULT '[]',
  setlists TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mp_id TEXT,
  mp_type TEXT,
  amount REAL,
  status TEXT,
  raw TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp ON payments(mp_id);
`)

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '7', 10)
const PRICE_BRL = parseFloat(process.env.SUBSCRIPTION_PRICE_BRL || '24.90')

// ===== Users =====
export function findUserByEmail(email) {
  if (!email) return null
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()) || null
}

export function findUserById(id) {
  if (!id) return null
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null
}

export function createUser({ id, name, email, passwordHash }) {
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000).toISOString()
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, premium, trial_end)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(id, name, String(email).toLowerCase(), passwordHash, trialEnd)
  return findUserById(id)
}

export function setPremium(email, value) {
  const user = findUserByEmail(email)
  if (!user) return null
  const premiumSince = value ? (user.premium_since || new Date().toISOString()) : null
  const trialEnd = value ? null : user.trial_end
  db.prepare(`
    UPDATE users
    SET premium = ?, premium_since = ?, trial_end = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(value ? 1 : 0, premiumSince, trialEnd, user.id)
  return findUserById(user.id)
}

export function setMpSubscription(email, subscriptionId, payerId = null) {
  const user = findUserByEmail(email)
  if (!user) return null
  db.prepare(`
    UPDATE users SET mp_subscription_id = ?, mp_payer_id = COALESCE(?, mp_payer_id), updated_at = datetime('now')
    WHERE id = ?
  `).run(subscriptionId, payerId, user.id)
  return findUserById(user.id)
}

export function checkTrial(email) {
  const user = findUserByEmail(email)
  if (!user || !user.trial_end || user.premium_since) return user
  if (new Date(user.trial_end) < new Date()) {
    db.prepare('UPDATE users SET premium = 0, updated_at = datetime(\'now\') WHERE id = ?').run(user.id)
    return findUserById(user.id)
  }
  return user
}

// ===== Sync data =====
export function setUserData(email, data) {
  const user = findUserByEmail(email)
  if (!user) return false
  db.prepare(`
    INSERT INTO user_data (user_id, songs, setlists, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      songs = excluded.songs,
      setlists = excluded.setlists,
      updated_at = datetime('now')
  `).run(user.id, JSON.stringify(data.songs || []), JSON.stringify(data.setlists || []))
  return true
}

export function getUserData(email) {
  const user = findUserByEmail(email)
  if (!user) return null
  const row = db.prepare('SELECT songs, setlists FROM user_data WHERE user_id = ?').get(user.id)
  if (!row) return { songs: [], setlists: [] }
  return { songs: safeJson(row.songs, []), setlists: safeJson(row.setlists, []) }
}

// ===== Payments =====
export function recordPayment({ userId, mpId, mpType, amount, status, raw }) {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO payments (id, user_id, mp_id, mp_type, amount, status, raw)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, mpId || null, mpType || null, amount || null, status || null, raw ? JSON.stringify(raw) : null)
  return id
}

export function updatePaymentStatus(mpId, status, raw) {
  db.prepare(`
    UPDATE payments SET status = ?, raw = COALESCE(?, raw) WHERE mp_id = ?
  `).run(status, raw ? JSON.stringify(raw) : null, mpId)
}

export function getAllUsers() {
  return db.prepare('SELECT id, name, email, premium, premium_since, trial_end, created_at FROM users ORDER BY created_at DESC').all()
}

function safeJson(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

export { PRICE_BRL, TRIAL_DAYS }
