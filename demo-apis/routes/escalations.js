const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/escalations
  router.get('/', (req, res) => {
    const { status, severity, escalation_target } = req.query;
    let sql = `
      SELECT e.*, sp.content as post_content, sp.author_handle, sp.platform,
             c.full_name as customer_name, c.tier as customer_tier
      FROM escalations e
      JOIN social_posts sp ON e.post_id = sp.id
      LEFT JOIN customers c ON e.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (severity) { sql += ' AND e.severity = ?'; params.push(severity); }
    if (escalation_target) { sql += ' AND e.escalation_target = ?'; params.push(escalation_target); }
    sql += ' ORDER BY e.created_at DESC';

    res.json({ escalations: db.prepare(sql).all(...params) });
  });

  // POST /api/escalations - Create escalation (called by N8N workflow)
  router.post('/', (req, res) => {
    const { post_id, customer_id, escalation_target, severity, notes } = req.body;
    if (!post_id || !escalation_target) {
      return res.status(400).json({ error: 'post_id and escalation_target are required' });
    }

    const result = db.prepare(`
      INSERT INTO escalations (post_id, customer_id, escalation_target, severity, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(post_id, customer_id || null, escalation_target, severity || 'medium', notes);

    db.prepare("UPDATE social_posts SET status = 'escalated', priority = ? WHERE id = ?")
      .run(severity === 'critical' ? 'critical' : 'high', post_id);

    res.status(201).json(db.prepare('SELECT * FROM escalations WHERE id = ?').get(result.lastInsertRowid));
  });

  // PATCH /api/escalations/:id - Update escalation status
  router.patch('/:id', (req, res) => {
    const { status, assigned_to, notes } = req.body;
    const esc = db.prepare('SELECT * FROM escalations WHERE id = ?').get(req.params.id);
    if (!esc) return res.status(404).json({ error: 'Escalation not found' });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (assigned_to) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    if (status === 'resolved') { updates.push("resolved_at = datetime('now')"); }
    updates.push("updated_at = datetime('now')");

    params.push(req.params.id);
    db.prepare(`UPDATE escalations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (status === 'resolved') {
      db.prepare("UPDATE social_posts SET status = 'resolved' WHERE id = ?").run(esc.post_id);
    }

    res.json(db.prepare('SELECT * FROM escalations WHERE id = ?').get(req.params.id));
  });

  return router;
};
