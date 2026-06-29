import crypto from 'crypto';
import { getOne, getAll, run } from './db.js';

export async function generateLoginToken(fid, username, wallet) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run('INSERT OR REPLACE INTO login_tokens (fid, token, expires_at) VALUES (?, ?, ?)', [fid, token, expiresAt]);
  return { token, expiresAt };
}

export async function verifyLoginToken(token) {
  const row = await getOne('SELECT fid, expires_at FROM login_tokens WHERE token = ?', [token]);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await run('DELETE FROM login_tokens WHERE token = ?', [token]);
    return null;
  }
  return { fid: row.fid };
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const token = authHeader.slice(7);
  verifyLoginToken(token).then(session => {
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });
    req.fid = session.fid;
    next();
  }).catch(() => res.status(500).json({ error: 'Auth error' }));
}

export function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}
