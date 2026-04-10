const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/social-posts - List posts with filtering
  router.get('/', (req, res) => {
    const { status, platform, priority, limit = 50, offset = 0, since } = req.query;
    let sql = 'SELECT * FROM social_posts WHERE 1=1';
    const params = [];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    if (priority) { sql += ' AND priority = ?'; params.push(priority); }
    if (since) { sql += ' AND posted_at >= ?'; params.push(since); }

    sql += ' ORDER BY posted_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const posts = db.prepare(sql).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM social_posts').get().count;

    res.json({ posts, total, limit: Number(limit), offset: Number(offset) });
  });

  // GET /api/social-posts/unreviewed - Get posts needing review
  router.get('/unreviewed', (req, res) => {
    const { limit = 3 } = req.query;
    const posts = db.prepare(
      `SELECT sp.* FROM social_posts sp
       LEFT JOIN analysis_results ar ON sp.id = ar.post_id
       WHERE ar.id IS NULL AND sp.status = 'new'
       ORDER BY sp.priority DESC, sp.posted_at DESC
       LIMIT ?`
    ).all(Number(limit));
    const remaining = db.prepare(
      `SELECT COUNT(*) as count FROM social_posts sp
       LEFT JOIN analysis_results ar ON sp.id = ar.post_id
       WHERE ar.id IS NULL AND sp.status = 'new'`
    ).get().count;
    res.json({ posts, count: posts.length, remaining });
  });

  // GET /api/social-posts/:id
  router.get('/:id', (req, res) => {
    const post = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const analysis = db.prepare('SELECT * FROM analysis_results WHERE post_id = ?').get(req.params.id);
    const responses = db.prepare('SELECT * FROM public_responses WHERE post_id = ?').all(req.params.id);

    res.json({ post, analysis, responses });
  });

  // POST /api/social-posts - Create new post (simulates incoming feed)
  router.post('/', (req, res) => {
    const { platform, author_handle, author_name, content, post_url, likes, shares, comments_count, posted_at } = req.body;

    if (!platform || !author_handle || !author_name || !content) {
      return res.status(400).json({ error: 'Missing required fields: platform, author_handle, author_name, content' });
    }

    const result = db.prepare(`
      INSERT INTO social_posts (platform, author_handle, author_name, content, post_url, likes, shares, comments_count, posted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(platform, author_handle, author_name, content, post_url || null, likes || 0, shares || 0, comments_count || 0, posted_at || new Date().toISOString());

    const post = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(post);
  });

  // PATCH /api/social-posts/:id - Update post status/priority
  router.patch('/:id', (req, res) => {
    const { status, priority } = req.body;
    const post = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (status) db.prepare('UPDATE social_posts SET status = ? WHERE id = ?').run(status, req.params.id);
    if (priority) db.prepare('UPDATE social_posts SET priority = ? WHERE id = ?').run(priority, req.params.id);

    const updated = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // DELETE /api/social-posts/:id
  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM social_posts WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted', id: Number(req.params.id) });
  });

  return router;
};
