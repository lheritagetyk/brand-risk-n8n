const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/responses
  router.get('/', (req, res) => {
    const { status } = req.query;
    let sql = `
      SELECT pr.*, sp.content as original_post, sp.author_handle, sp.platform
      FROM public_responses pr
      JOIN social_posts sp ON pr.post_id = sp.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND pr.status = ?'; params.push(status); }
    sql += ' ORDER BY pr.created_at DESC';
    res.json({ items: db.prepare(sql).all(...params) });
  });

  // POST /api/responses - Draft a response (called by N8N workflow)
  router.post('/', (req, res) => {
    const { post_id, response_text, response_platform, drafted_by } = req.body;
    if (!post_id || !response_text) {
      return res.status(400).json({ error: 'post_id and response_text are required' });
    }

    const post = db.prepare('SELECT platform FROM social_posts WHERE id = ?').get(post_id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const result = db.prepare(`
      INSERT INTO public_responses (post_id, response_text, response_platform, drafted_by)
      VALUES (?, ?, ?, ?)
    `).run(post_id, response_text, response_platform || post.platform, drafted_by || 'ai');

    res.status(201).json(db.prepare('SELECT * FROM public_responses WHERE id = ?').get(result.lastInsertRowid));
  });

  // PATCH /api/responses/:id - Approve/reject/post response
  router.patch('/:id', (req, res) => {
    const { status, approved_by } = req.body;
    const resp = db.prepare('SELECT * FROM public_responses WHERE id = ?').get(req.params.id);
    if (!resp) return res.status(404).json({ error: 'Response not found' });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (approved_by) { updates.push('approved_by = ?'); params.push(approved_by); }
    if (status === 'posted') { updates.push("posted_at = datetime('now')"); }

    params.push(req.params.id);
    db.prepare(`UPDATE public_responses SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (status === 'posted') {
      db.prepare("UPDATE social_posts SET status = 'responded' WHERE id = ?").run(resp.post_id);
    }

    res.json(db.prepare('SELECT * FROM public_responses WHERE id = ?').get(req.params.id));
  });

  return router;
};
