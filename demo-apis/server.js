const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { execSync } = require('child_process');
const { initDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3100;

// Initialize database
const db = initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Debug: log all POST/PATCH request bodies
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH') {
    console.log(`\n[DEBUG ${req.method} ${req.path}]`);
    console.log('  Content-Type:', req.headers['content-type']);
    console.log('  Body:', JSON.stringify(req.body));
    console.log('  Query:', JSON.stringify(req.query));
  }
  next();
});

// Serve dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/social-posts', require('./routes/social-posts')(db));
app.use('/api/analysis', require('./routes/analysis')(db));
app.use('/api/customers', require('./routes/customers')(db));
app.use('/api/escalations', require('./routes/escalations')(db));
app.use('/api/responses', require('./routes/responses')(db));
app.use('/api/incidents', require('./routes/incidents')(db));

// Health check
app.get('/api/health', (req, res) => {
  const postCount = db.prepare('SELECT COUNT(*) as count FROM social_posts').get().count;
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  res.json({
    status: 'healthy',
    service: 'Acme National Bank - Social Media Risk Monitor API',
    timestamp: new Date().toISOString(),
    data: { posts: postCount, customers: customerCount }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Acme National Bank - Social Media Risk Monitor API',
    version: '1.0.0',
    endpoints: {
      social_posts: {
        'GET /api/social-posts': 'List posts (query: status, platform, priority, limit, offset, since)',
        'GET /api/social-posts/unreviewed': 'Get posts not yet analyzed',
        'GET /api/social-posts/:id': 'Get post with analysis and responses',
        'POST /api/social-posts': 'Create new post',
        'PATCH /api/social-posts/:id': 'Update post status/priority',
        'DELETE /api/social-posts/:id': 'Delete a post',
      },
      analysis: {
        'GET /api/analysis': 'List analysis results (query: sentiment, escalation_target, is_banking_related)',
        'GET /api/analysis/summary': 'Dashboard summary statistics',
        'GET /api/analysis/:postId': 'Get analysis for a specific post',
        'POST /api/analysis': 'Store analysis result from AI workflow',
      },
      customers: {
        'GET /api/customers': 'List customers (query: tier, account_type)',
        'GET /api/customers/lookup/:handle': 'Look up customer by social media handle',
        'GET /api/customers/:id': 'Get customer details',
        'POST /api/customers': 'Create customer',
      },
      escalations: {
        'GET /api/escalations': 'List escalations (query: status, severity, escalation_target)',
        'POST /api/escalations': 'Create escalation',
        'PATCH /api/escalations/:id': 'Update escalation status',
      },
      responses: {
        'GET /api/responses': 'List drafted responses (query: status)',
        'POST /api/responses': 'Draft a public response',
        'PATCH /api/responses/:id': 'Approve/reject/post response',
      },
      incidents: {
        'GET /api/incidents': 'List known incidents (query: status, category)',
        'GET /api/incidents/active': 'Get active incidents only',
        'GET /api/incidents/:id': 'Get incident details',
        'POST /api/incidents': 'Create incident',
        'PATCH /api/incidents/:id': 'Update incident',
      },
      health: {
        'GET /api/health': 'Health check with data counts',
        'GET /api': 'This documentation',
      }
    }
  });
});

// Reset endpoint - re-seeds the database
app.post('/api/reset', (req, res) => {
  try {
    execSync('node seed-data.js', { cwd: __dirname, stdio: 'pipe' });
    res.json({ message: 'Database reset to demo state' });
  } catch(e) {
    res.status(500).json({ error: 'Reset failed', details: e.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🏦 Acme National Bank - Social Media Risk Monitor API`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API Docs:  http://localhost:${PORT}/api`);
  console.log(`   Health:    http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
