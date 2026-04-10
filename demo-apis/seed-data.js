const { initDatabase } = require('./db/init');

const db = initDatabase();

// Clear existing data
db.exec('DELETE FROM public_responses');
db.exec('DELETE FROM escalations');
db.exec('DELETE FROM analysis_results');
db.exec('DELETE FROM social_posts');
db.exec('DELETE FROM customers');
db.exec('DELETE FROM known_incidents');

console.log('Seeding database...\n');

// ── Customers ────────────────────────────────────────────────────────────────
const insertCustomer = db.prepare(`
  INSERT INTO customers (full_name, email, phone, social_handle_twitter, social_handle_facebook, social_handle_instagram, account_type, tier, customer_since, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const customers = [
  ['Sarah Mitchell', 'sarah.m@email.com', '555-0101', 'sarah_fintech', 'sarah.mitchell.99', 'sarahmitch', 'checking', 'gold', '2019-03-15', 'Long-term customer, recently upgraded to Gold'],
  ['James Rodriguez', 'jrod@email.com', '555-0102', 'jrod_nyc', 'james.rodriguez.official', null, 'business', 'platinum', '2017-06-22', 'Small business owner, restaurant chain'],
  ['Emily Chen', 'echen@email.com', '555-0103', 'emilyc_writes', null, 'emily.chen.writer', 'savings', 'standard', '2022-01-10', null],
  ['Marcus Thompson', 'mthompson@email.com', '555-0104', 'marcus_t_speaks', 'marcus.thompson', 'marcust', 'premium', 'platinum', '2015-09-01', 'High-value customer, wealth management prospect'],
  ['Lisa Park', 'lpark@email.com', '555-0105', 'lisapark_tech', null, 'lisapark.dev', 'checking', 'standard', '2023-07-20', 'Tech-savvy, early mobile app adopter'],
  ['David Washington', 'dwash@email.com', '555-0106', 'dwash_atl', 'david.washington.atl', null, 'business', 'gold', '2020-11-03', 'Real estate business account'],
  ['Priya Patel', 'ppatel@email.com', '555-0107', 'priya_invests', 'priya.patel.finance', 'priyap', 'wealth_management', 'private_banking', '2014-02-28', 'Private banking client, very high value'],
  ['Tom Baker', 'tbaker@email.com', '555-0108', 'tombaker_runs', null, null, 'checking', 'standard', '2024-01-05', 'New customer'],
];

customers.forEach(c => insertCustomer.run(...c));
console.log(`✓ Seeded ${customers.length} customers`);

// ── Known Incidents ──────────────────────────────────────────────────────────
const insertIncident = db.prepare(`
  INSERT INTO known_incidents (title, description, category, severity, affected_services, started_at, status, public_statement)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const incidents = [
  [
    'Mobile App Login Delays',
    'Users experiencing intermittent 30-60 second delays when logging into the mobile app. Root cause identified as authentication service latency.',
    'App Bug',
    'medium',
    'mobile_app,authentication',
    '2026-04-08T14:00:00Z',
    'active',
    'We are aware some customers are experiencing delays logging into our mobile app. Our team is actively working on a fix. Your accounts remain secure.'
  ],
  [
    'Zelle Transfer Processing Delay',
    'Zelle transfers initiated after 2pm ET on April 8th are experiencing 2-4 hour delays in processing. Third-party service issue.',
    'Service Outage',
    'high',
    'zelle,transfers',
    '2026-04-08T18:00:00Z',
    'monitoring',
    'Zelle transfers may be delayed up to 4 hours. We are working with our partners to resolve this. Funds are safe and will be delivered.'
  ],
  [
    'Phishing Campaign Targeting Customers',
    'Security team has identified an active phishing campaign sending fake "account verification" emails mimicking Acme National Bank branding.',
    'Security Concern',
    'critical',
    'email,customer_accounts',
    '2026-04-07T09:00:00Z',
    'active',
    'We are aware of fraudulent emails claiming to be from Acme National Bank. We will NEVER ask for your password or PIN via email. Report suspicious emails to security@acmenationalbank.com.'
  ]
];

incidents.forEach(i => insertIncident.run(...i));
console.log(`✓ Seeded ${incidents.length} known incidents`);

// ── Social Media Posts ───────────────────────────────────────────────────────
const insertPost = db.prepare(`
  INSERT INTO social_posts (platform, author_handle, author_name, content, post_url, likes, shares, comments_count, posted_at, status, priority)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const posts = [
  // --- CRITICAL / SECURITY ---
  [
    'twitter', 'marcus_t_speaks', 'Marcus Thompson',
    'Just got a text from "Acme National Bank" asking me to verify my account by clicking a link. This looks like a SCAM. @AcmeNatlBank are you aware of this?? Others be careful! #phishing #bankscam',
    'https://twitter.com/marcus_t_speaks/status/1001', 342, 187, 45,
    '2026-04-09T08:15:00Z', 'new', 'critical'
  ],
  [
    'twitter', 'cybersec_alert', 'InfoSec Daily',
    'ALERT: Multiple reports of phishing SMS targeting @AcmeNatlBank customers. Messages contain link to fake login page at acme-national-verify.com. DO NOT CLICK. Report to bank immediately. #cybersecurity #phishing',
    'https://twitter.com/cybersec_alert/status/1002', 1205, 834, 92,
    '2026-04-09T09:30:00Z', 'new', 'critical'
  ],
  [
    'reddit', 'throwaway_banking99', 'Anonymous User',
    'I think someone accessed my Acme National Bank account. I see two transactions I did NOT make - $450 to a Venmo account and $200 to some online store. I have already called the fraud line but want to warn others. Has anyone else experienced unauthorized transactions recently?',
    'https://reddit.com/r/personalfinance/comments/abc123', 89, 0, 34,
    '2026-04-09T07:45:00Z', 'new', 'critical'
  ],

  // --- NEGATIVE / SERVICE ISSUES ---
  [
    'twitter', 'sarah_fintech', 'Sarah Mitchell',
    '@AcmeNatlBank your mobile app has been taking FOREVER to log in for the past 2 days. I have to wait almost a minute each time. This is ridiculous for 2026. Fix your app!! 😤',
    'https://twitter.com/sarah_fintech/status/1003', 28, 5, 12,
    '2026-04-09T10:22:00Z', 'new', 'high'
  ],
  [
    'twitter', 'jrod_nyc', 'James Rodriguez',
    'Sent a Zelle payment to my supplier 6 hours ago through @AcmeNatlBank and it STILL hasn\'t gone through. My business depends on timely payments. This is unacceptable. #AcmeBank #ZelleFail',
    'https://twitter.com/jrod_nyc/status/1004', 15, 3, 8,
    '2026-04-09T11:00:00Z', 'new', 'high'
  ],
  [
    'facebook', 'lisa.park.tech', 'Lisa Park',
    'Has anyone else noticed the Acme National Bank app crashing when you try to deposit a check? It\'s happened three times today. I just want to deposit my paycheck! 😩 So frustrating.',
    'https://facebook.com/lisa.park.tech/posts/5001', 12, 2, 7,
    '2026-04-09T12:30:00Z', 'new', 'normal'
  ],
  [
    'twitter', 'tombaker_runs', 'Tom Baker',
    '@AcmeNatlBank Why did I just get charged a $12 "account maintenance fee"? I was told my checking account had no monthly fees when I signed up 3 months ago. Feeling misled. #HiddenFees',
    'https://twitter.com/tombaker_runs/status/1005', 34, 11, 15,
    '2026-04-09T09:00:00Z', 'new', 'normal'
  ],
  [
    'instagram', 'priyap', 'Priya Patel',
    'Disappointed with @acmenationalbank private banking service lately. My relationship manager hasn\'t returned my calls in over a week. When you\'re paying premium fees, you expect premium service. Considering moving to Chase Private Client.',
    'https://instagram.com/p/xyz789', 67, 0, 23,
    '2026-04-09T08:45:00Z', 'new', 'high'
  ],
  [
    'reddit', 'budget_bro_2026', 'BudgetBro',
    'Acme National Bank just denied my mortgage application after stringing me along for 6 weeks. Zero communication about issues with my application until the final denial letter. Worst experience ever. Going to a credit union.',
    'https://reddit.com/r/FirstTimeHomeBuyer/comments/def456', 156, 0, 42,
    '2026-04-08T22:00:00Z', 'new', 'normal'
  ],
  [
    'twitter', 'angry_customer_2026', 'Fed Up Frank',
    'THIRD time this month @AcmeNatlBank ATM on 5th Ave ate my card. Had to wait 45 min on the phone to get it resolved. Your ATMs are ancient. Time for an upgrade. #BankingFail #ATMproblems',
    'https://twitter.com/angry_customer_2026/status/1006', 22, 8, 6,
    '2026-04-09T13:15:00Z', 'new', 'normal'
  ],

  // --- POSITIVE ---
  [
    'twitter', 'emilyc_writes', 'Emily Chen',
    'Shoutout to @AcmeNatlBank customer service! Had an issue with my savings account and Jennifer on the phone fixed it in under 5 minutes. THIS is how banking should work. ⭐⭐⭐⭐⭐',
    'https://twitter.com/emilyc_writes/status/1007', 45, 8, 3,
    '2026-04-09T11:30:00Z', 'new', 'normal'
  ],
  [
    'facebook', 'david.washington.atl', 'David Washington',
    'Just refinanced my commercial property loan with Acme National Bank. The business banking team made the whole process smooth and saved us 1.2% on our rate. Highly recommend their business services!',
    'https://facebook.com/david.washington.atl/posts/5002', 38, 5, 9,
    '2026-04-09T10:00:00Z', 'new', 'normal'
  ],
  [
    'linkedin', 'maria_cfo', 'Maria Gonzalez',
    'Impressed by Acme National Bank\'s new treasury management platform. The cash flow forecasting tools have been a game-changer for our mid-size manufacturing company. Great innovation from their business banking team. #fintech #banking #treasurymanagement',
    'https://linkedin.com/posts/maria-gonzalez-cfo_123', 92, 14, 7,
    '2026-04-09T07:00:00Z', 'new', 'normal'
  ],

  // --- NEUTRAL / NOT BANKING ---
  [
    'twitter', 'news_daily_now', 'Daily News Now',
    'Acme National Bank announced Q1 2026 earnings today, reporting a 12% increase in net income. CEO Patricia Hawkins cited strong mortgage origination and growing digital banking adoption. $ACNB',
    'https://twitter.com/news_daily_now/status/1008', 87, 32, 11,
    '2026-04-09T06:00:00Z', 'new', 'normal'
  ],
  [
    'twitter', 'local_community_org', 'Riverdale Community',
    'Thank you @AcmeNatlBank for sponsoring this weekend\'s Riverdale Community Clean-Up Day! Your commitment to our neighborhood makes a real difference. 🌳💚 #CommunityMatters',
    'https://twitter.com/local_community_org/status/1009', 124, 28, 5,
    '2026-04-09T12:00:00Z', 'new', 'normal'
  ],
  [
    'twitter', 'foodie_adventures', 'FoodieAdventures',
    'Just had the most amazing acme burger at the new place on Main St. Their national bank of sauces is incredible lol 🍔🍟 #foodie #burgers',
    'https://twitter.com/foodie_adventures/status/1010', 5, 0, 1,
    '2026-04-09T13:00:00Z', 'new', 'low'
  ],
  [
    'twitter', 'crypto_chad_99', 'Crypto Chad',
    'Traditional banks like Acme National Bank are dinosaurs 🦕 DeFi is the future. Why pay fees when you can be your own bank? #crypto #DeFi #Bitcoin Not financial advice.',
    'https://twitter.com/crypto_chad_99/status/1011', 19, 4, 22,
    '2026-04-09T11:45:00Z', 'new', 'low'
  ],

  // --- MIXED / EDGE CASES ---
  [
    'twitter', 'dwash_atl', 'David Washington',
    '@AcmeNatlBank love your new business dashboard but the bill pay feature keeps timing out when I try to schedule payments over $10k. Can this get looked at? Otherwise great update!',
    'https://twitter.com/dwash_atl/status/1012', 8, 1, 2,
    '2026-04-09T14:00:00Z', 'new', 'normal'
  ],
  [
    'twitter', 'financial_times_parody', 'Financial Times (Parody)',
    'BREAKING: Acme National Bank to replace all tellers with trained parrots by 2027. "They repeat information accurately and work for crackers," says fictional CEO. 🦜💰',
    'https://twitter.com/financial_times_parody/status/1013', 2340, 567, 189,
    '2026-04-09T10:30:00Z', 'new', 'low'
  ],
  [
    'twitter', 'lisapark_tech', 'Lisa Park',
    'Update on my earlier @AcmeNatlBank complaint: they reached out to me directly and are working on the app crash issue. Appreciate the quick response! Still waiting for the fix though.',
    'https://twitter.com/lisapark_tech/status/1014', 9, 1, 3,
    '2026-04-09T15:00:00Z', 'new', 'normal'
  ],
];

posts.forEach(p => insertPost.run(...p));
console.log(`✓ Seeded ${posts.length} social media posts`);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n── Database Summary ──');
console.log(`Posts:      ${db.prepare('SELECT COUNT(*) as c FROM social_posts').get().c}`);
console.log(`Customers:  ${db.prepare('SELECT COUNT(*) as c FROM customers').get().c}`);
console.log(`Incidents:  ${db.prepare('SELECT COUNT(*) as c FROM known_incidents').get().c}`);
console.log(`Analysis:   ${db.prepare('SELECT COUNT(*) as c FROM analysis_results').get().c}`);
console.log(`Escalations:${db.prepare('SELECT COUNT(*) as c FROM escalations').get().c}`);
console.log(`Responses:  ${db.prepare('SELECT COUNT(*) as c FROM public_responses').get().c}`);
console.log('\nDatabase seeded successfully! ✓');

db.close();
