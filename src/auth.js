const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const COOKIE_NAME = 'madb_auth';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const secretFile = path.join(dataDir, 'session.secret');

let SECRET;
if (fs.existsSync(secretFile)) {
  SECRET = fs.readFileSync(secretFile, 'utf8').trim();
} else {
  SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, SECRET, { mode: 0o600 });
}

function isAuthEnabled() {
  return Boolean(process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.length > 0);
}

function makeToken() {
  const issuedAt = Date.now().toString();
  const sig = crypto.createHmac('sha256', SECRET)
    .update(issuedAt + '|' + process.env.AUTH_PASSWORD)
    .digest('hex');
  return Buffer.from(issuedAt + '.' + sig).toString('base64url');
}

function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [issuedAt, sig] = decoded.split('.');
    if (!issuedAt || !sig) return false;
    const age = (Date.now() - parseInt(issuedAt, 10)) / 1000;
    if (age < 0 || age > COOKIE_MAX_AGE) return false;
    const expected = crypto.createHmac('sha256', SECRET)
      .update(issuedAt + '|' + process.env.AUTH_PASSWORD)
      .digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function isAuthenticated(req) {
  if (!isAuthEnabled()) return true;
  const cookies = parseCookies(req);
  return verifyToken(cookies[COOKIE_NAME]);
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Authentification requise' });
}

function setAuthCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

function safeEqualString(a, b) {
  const bufA = Buffer.from(a || '');
  const bufB = Buffer.from(b || '');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function login(req, res) {
  if (!isAuthEnabled()) return res.json({ ok: true });
  const password = (req.body && req.body.password) || '';
  if (!safeEqualString(password, process.env.AUTH_PASSWORD)) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  setAuthCookie(res, makeToken());
  res.json({ ok: true });
}

function logout(req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

function status(req, res) {
  res.json({
    enabled: isAuthEnabled(),
    authenticated: isAuthenticated(req)
  });
}

module.exports = {
  isAuthEnabled,
  isAuthenticated,
  requireAuth,
  login,
  logout,
  status
};
