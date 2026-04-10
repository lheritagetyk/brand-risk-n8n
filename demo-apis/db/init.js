const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'acme_bank.db');

function initDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Social Media Posts - the main feed to monitor
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL CHECK(platform IN ('twitter', 'facebook', 'instagram', 'reddit', 'linkedin')),
      author_handle TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      post_url TEXT,
      likes INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      posted_at TEXT NOT NULL,
      collected_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'responded', 'escalated', 'resolved')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'critical'))
    )
  `);

  // Sentiment Analysis Results - stored after AI analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL UNIQUE,
      is_banking_related INTEGER NOT NULL,
      sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative', 'critical')),
      issue_category TEXT,
      confidence_score REAL,
      key_topics TEXT,
      suggested_response TEXT,
      escalation_target TEXT CHECK(escalation_target IN ('pr_team', 'security_team', 'customer_support', 'no_escalation')),
      analyzed_at TEXT DEFAULT (datetime('now')),
      analyzed_by TEXT DEFAULT 'anthropic-claude',
      FOREIGN KEY (post_id) REFERENCES social_posts(id)
    )
  `);

  // Customer Lookup - match social handles to bank customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      social_handle_twitter TEXT,
      social_handle_facebook TEXT,
      social_handle_instagram TEXT,
      account_type TEXT CHECK(account_type IN ('checking', 'savings', 'business', 'premium', 'wealth_management')),
      account_status TEXT DEFAULT 'active' CHECK(account_status IN ('active', 'suspended', 'closed')),
      customer_since TEXT,
      tier TEXT DEFAULT 'standard' CHECK(tier IN ('standard', 'gold', 'platinum', 'private_banking')),
      notes TEXT
    )
  `);

  // Escalation Tracker - track issues needing attention
  db.exec(`
    CREATE TABLE IF NOT EXISTS escalations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      customer_id INTEGER,
      escalation_target TEXT NOT NULL,
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (post_id) REFERENCES social_posts(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Public Responses - track what was posted back
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      response_text TEXT NOT NULL,
      response_platform TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'posted', 'rejected')),
      drafted_by TEXT DEFAULT 'ai',
      approved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      posted_at TEXT,
      FOREIGN KEY (post_id) REFERENCES social_posts(id)
    )
  `);

  // Known Incidents - active service issues the bank is aware of
  db.exec(`
    CREATE TABLE IF NOT EXISTS known_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'monitoring', 'resolved')),
      affected_services TEXT,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      public_statement TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  return db;
}

module.exports = { initDatabase, DB_PATH };
