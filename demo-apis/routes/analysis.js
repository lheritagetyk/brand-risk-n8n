const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/analysis - List all analysis results
  router.get('/', (req, res) => {
    const { sentiment, escalation_target, is_banking_related } = req.query;
    let sql = `
      SELECT ar.*, sp.content as post_content, sp.author_handle, sp.platform
      FROM analysis_results ar
      JOIN social_posts sp ON ar.post_id = sp.id
      WHERE 1=1
    `;
    const params = [];

    if (sentiment) { sql += ' AND ar.sentiment = ?'; params.push(sentiment); }
    if (escalation_target) { sql += ' AND ar.escalation_target = ?'; params.push(escalation_target); }
    if (is_banking_related !== undefined) { sql += ' AND ar.is_banking_related = ?'; params.push(Number(is_banking_related)); }

    sql += ' ORDER BY ar.analyzed_at DESC';
    const results = db.prepare(sql).all(...params);
    res.json({ results, count: results.length });
  });

  // GET /api/analysis/summary - Dashboard summary stats
  router.get('/summary', (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM analysis_results').get().count;
    const bySentiment = db.prepare(
      'SELECT sentiment, COUNT(*) as count FROM analysis_results GROUP BY sentiment'
    ).all();
    const byEscalation = db.prepare(
      'SELECT escalation_target, COUNT(*) as count FROM analysis_results GROUP BY escalation_target'
    ).all();
    const byCategory = db.prepare(
      'SELECT issue_category, COUNT(*) as count FROM analysis_results WHERE issue_category IS NOT NULL GROUP BY issue_category'
    ).all();
    const needingEscalation = db.prepare(
      "SELECT COUNT(*) as count FROM analysis_results WHERE escalation_target != 'no_escalation'"
    ).get().count;

    res.json({ total_analyzed: total, by_sentiment: bySentiment, by_escalation: byEscalation, by_category: byCategory, needing_escalation: needingEscalation });
  });

  // GET /api/analysis/:postId
  router.get('/:postId', (req, res) => {
    const result = db.prepare('SELECT * FROM analysis_results WHERE post_id = ?').get(req.params.postId);
    if (!result) return res.status(404).json({ error: 'No analysis found for this post' });
    res.json(result);
  });

  // POST /api/analysis - Store analysis result (called by N8N workflow)
  router.post('/', (req, res) => {
    // Log everything for debugging Tyk MCP proxy
    console.log('[analysis POST] Content-Type:', req.headers['content-type']);
    console.log('[analysis POST] Body:', JSON.stringify(req.body));
    console.log('[analysis POST] Query:', JSON.stringify(req.query));

    // Accept fields from body, query params, or a nested "body_" prefix (Tyk MCP format)
    const source = (req.body && Object.keys(req.body).length > 0) ? req.body : req.query;

    // Tyk MCP may prefix fields with "body_"
    const post_id = parseInt(source.post_id || source.body_post_id, 10) || null;
    const is_banking_related = source.is_banking_related || source.body_is_banking_related;
    const sentiment = source.sentiment || source.body_sentiment;
    const issue_category = source.issue_category || source.body_issue_category;
    const confidence_score = source.confidence_score || source.body_confidence_score;
    const key_topics = source.key_topics || source.body_key_topics;
    const suggested_response = source.suggested_response || source.body_suggested_response;
    const escalation_target = source.escalation_target || source.body_escalation_target;

    if (post_id === undefined || is_banking_related === undefined) {
      console.log('[analysis POST] REJECTED - missing fields. Full request keys:', Object.keys(source));
      return res.status(400).json({ error: 'Missing required fields: post_id, is_banking_related', received_body: req.body, received_query: req.query });
    }

    // Normalize is_banking_related: accept "yes"/"no", true/false, 1/0
    const bankingRelatedInt = (is_banking_related === 'yes' || is_banking_related === true || is_banking_related === 1) ? 1 : 0;
    // Normalize confidence_score: accept string or number
    const confidenceFloat = parseFloat(confidence_score) || 0;

    // Check if analysis already exists
    const existing = db.prepare('SELECT id FROM analysis_results WHERE post_id = ?').get(post_id);
    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE analysis_results SET
          is_banking_related = ?, sentiment = ?, issue_category = ?, confidence_score = ?,
          key_topics = ?, suggested_response = ?, escalation_target = ?, analyzed_at = datetime('now')
        WHERE post_id = ?
      `).run(bankingRelatedInt, sentiment, issue_category, confidenceFloat, key_topics, suggested_response, escalation_target, post_id);

      const updated = db.prepare('SELECT * FROM analysis_results WHERE post_id = ?').get(post_id);
      // Update post status
      db.prepare("UPDATE social_posts SET status = 'reviewed' WHERE id = ?").run(post_id);
      return res.json(updated);
    }

    const result = db.prepare(`
      INSERT INTO analysis_results (post_id, is_banking_related, sentiment, issue_category, confidence_score, key_topics, suggested_response, escalation_target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(post_id, bankingRelatedInt, sentiment, issue_category, confidenceFloat, key_topics, suggested_response, escalation_target || 'no_escalation');

    // Update post status
    db.prepare("UPDATE social_posts SET status = 'reviewed' WHERE id = ?").run(post_id);

    const analysis = db.prepare('SELECT * FROM analysis_results WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(analysis);
  });

  return router;
};
