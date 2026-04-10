const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/customers - List all customers
  router.get('/', (req, res) => {
    const { tier, account_type } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (tier) { sql += ' AND tier = ?'; params.push(tier); }
    if (account_type) { sql += ' AND account_type = ?'; params.push(account_type); }
    sql += ' ORDER BY full_name';
    res.json({ customers: db.prepare(sql).all(...params) });
  });

  // GET /api/customers/lookup/:handle - Look up customer by social handle
  router.get('/lookup/:handle', (req, res) => {
    const handle = req.params.handle.replace(/^@/, '');
    const customer = db.prepare(`
      SELECT * FROM customers
      WHERE social_handle_twitter = ? OR social_handle_facebook = ? OR social_handle_instagram = ?
    `).get(handle, handle, handle);

    if (!customer) return res.json({ found: false, message: 'No customer account linked to this social handle' });
    res.json({ found: true, customer });
  });

  // GET /api/customers/:id
  router.get('/:id', (req, res) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  });

  // POST /api/customers
  router.post('/', (req, res) => {
    const { full_name, email, phone, social_handle_twitter, social_handle_facebook, social_handle_instagram, account_type, tier, customer_since, notes } = req.body;
    if (!full_name) return res.status(400).json({ error: 'full_name is required' });

    const result = db.prepare(`
      INSERT INTO customers (full_name, email, phone, social_handle_twitter, social_handle_facebook, social_handle_instagram, account_type, tier, customer_since, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, email, phone, social_handle_twitter, social_handle_facebook, social_handle_instagram, account_type || 'checking', tier || 'standard', customer_since, notes);

    res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
  });

  return router;
};
