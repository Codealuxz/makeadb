const express = require('express');
const router = express.Router();
const db = require('./db');
const { createDatabase, deleteDatabase, startDatabase, stopDatabase, checkDocker, DB_TYPES } = require('./docker');

router.get('/health', async (req, res) => {
  const docker = await checkDocker();
  res.json({ docker });
});

router.get('/types', (req, res) => {
  res.json(Object.keys(DB_TYPES));
});

router.get('/databases', (req, res) => {
  const databases = db.prepare('SELECT id, name, type, port, username, password, db_name, connection_url, status, created_at FROM databases ORDER BY created_at DESC').all();
  res.json(databases);
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
