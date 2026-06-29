import crypto from 'crypto';
import db from './db.js';

// Generate login token for Farcaster user
export function generateLoginToken(fid, username, wallet) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO login_tokens (fid, token, expires_at)
    VALUES (?, ?, ?)
  `).run(fid, token, expiresAt);

  return { token, expiresAt };
}

// Verify login token
export function verifyLoginToken(token) {
  const row = db.prepare(`
    SELECT fid, expires_at FROM login_tokens WHERE token = ?
  `).get(token);

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM login_tokens WHERE token = ?').run(token);
    return null;
  }
  return { fid: row.fid };
}

// Auth middleware
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = authHeader.slice(7);
  const session = verifyLoginToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.fid = session.fid;
  next();
}

// Admin middleware (for cron jobs, etc.)
export function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}
