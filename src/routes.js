const express = require('express');
const router = express.Router();
const db = require('./db');
const { createDatabase, deleteDatabase, startDatabase, stopDatabase, checkDocker, buildConnectionUrl, DB_TYPES } = require('./docker');

router.get('/health', async (req, res) => {
  const docker = await checkDocker();
  res.json({ docker });
});

router.get('/types', (req, res) => {
  res.json(Object.keys(DB_TYPES));
});

function getHost(req) {
  const h = req.get('host') || req.hostname || 'localhost';
  return h.split(':')[0];
}

router.get('/databases', (req, res) => {
  const host = getHost(req);
  const databases = db.prepare('SELECT * FROM databases ORDER BY created_at DESC').all();
  const result = databases.map(d => ({
    ...d,
    connection_url: buildConnectionUrl(d, host)
  }));
  res.json(result);
});

router.post('/databases', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nom et type requis' });
    if (!DB_TYPES[type]) return res.status(400).json({ error: 'Type non supporté' });
    const result = await createDatabase(name.trim(), type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/databases/:id', async (req, res) => {
  try {
    await deleteDatabase(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/databases/:id/start', async (req, res) => {
  try {
    const result = await startDatabase(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/databases/:id/stop', async (req, res) => {
  try {
    const result = await stopDatabase(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
