const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/incidents - List known incidents
  router.get('/', (req, res) => {
    const { status, category } = req.query;
    let sql = 'SELECT * FROM known_incidents WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY started_at DESC';
    res.json({ incidents: db.prepare(sql).all(...params) });
  });

  // GET /api/incidents/active - Only active incidents
  router.get('/active', (req, res) => {
    const incidents = db.prepare("SELECT * FROM known_incidents WHERE status IN ('active', 'monitoring') ORDER BY severity DESC").all();
    res.json({ incidents, count: incidents.length });
  });

  // GET /api/incidents/:id
  router.get('/:id', (req, res) => {
    const incident = db.prepare('SELECT * FROM known_incidents WHERE id = ?').get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // POST /api/incidents
  router.post('/', (req, res) => {
    const { title, description, category, severity, affected_services, started_at, public_statement } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'title, description, and category are required' });
    }

    const result = db.prepare(`
      INSERT INTO known_incidents (title, description, category, severity, affected_services, started_at, public_statement)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, category, severity || 'medium', affected_services, started_at || new Date().toISOString(), public_statement);

    res.status(201).json(db.prepare('SELECT * FROM known_incidents WHERE id = ?').get(result.lastInsertRowid));
  });

  // PATCH /api/incidents/:id
  router.patch('/:id', (req, res) => {
    const { status, severity, public_statement, resolved_at } = req.body;
    const inc = db.prepare('SELECT * FROM known_incidents WHERE id = ?').get(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (severity) { updates.push('severity = ?'); params.push(severity); }
    if (public_statement) { updates.push('public_statement = ?'); params.push(public_statement); }
    if (resolved_at || status === 'resolved') { updates.push('resolved_at = ?'); params.push(resolved_at || new Date().toISOString()); }

    if (updates.length === 0) return res.json(inc);
    params.push(req.params.id);
    db.prepare(`UPDATE known_incidents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json(db.prepare('SELECT * FROM known_incidents WHERE id = ?').get(req.params.id));
  });

  return router;
};
