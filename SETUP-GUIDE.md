# Acme National Bank - Social Media Risk Monitor Demo

## Architecture

```
                        ┌──────────────────────────────────────────────────┐
                        │                 N8N Workflow                      │
                        │                                                  │
  ┌──────────┐   ┌──────┴──────┐   ┌─────────────┐   ┌────────────────┐  │
  │ Schedule │──▶│Fetch Posts  │──▶│ Split Posts  │──▶│ AI Agent       │  │
  │ Trigger  │   │(HTTP GET)   │   │             │   │ (Claude Opus)  │  │
  └──────────┘   └─────────────┘   └─────────────┘   └──────┬─────────┘  │
                                                             │            │
                                          ┌──────────────────┤            │
                                          ▼                  ▼            │
                                   ┌────────────┐   ┌──────────────┐     │
                                   │ Customer   │   │  Incidents   │     │
                                   │ Lookup MCP │   │  MCP Tool    │     │
                                   │ (via Tyk)  │   │  (via Tyk)   │     │
                                   └────────────┘   └──────────────┘     │
                                                             │            │
                                                             ▼            │
                                                    ┌──────────────┐     │
                                                    │ Parse Agent  │     │
                                                    │ Output (Code)│     │
                                                    └──────┬───────┘     │
                                                           │             │
                                                           ▼             │
                                                    ┌──────────────┐     │
                                                    │Save Analysis │     │
                                                    │ (HTTP POST)  │     │
                                                    └──────┬───────┘     │
                                                           │             │
                                                     ┌─────┴─────┐      │
                                                     ▼           ▼      │
                                              ┌──────────┐ ┌──────────┐ │
                                              │Escalation│ │Response  │ │
                                              │? (IF)    │ │? (IF)    │ │
                                              └────┬─────┘ └────┬─────┘ │
                                                   ▼            ▼      │
                                              ┌──────────┐ ┌──────────┐ │
                                              │Create    │ │Save Draft│ │
                                              │Escalation│ │Response  │ │
                                              │(HTTP)    │ │(HTTP)    │ │
                                              └──────────┘ └──────────┘ │
                        └──────────────────────────────────────────────────┘
                                          │              │
                                          ▼              ▼
                               ┌────────────────────────────────┐
                               │     Demo API Server (:3100)    │
                               │  Social Posts | Analysis       │
                               │  Customers   | Escalations     │
                               │  Incidents   | Responses       │
                               │         + Dashboard            │
                               └────────────────────────────────┘
                                          ▲
                                          │
                               ┌────────────────────┐
                               │  Tyk AI Studio     │
                               │  (MCP Proxy)       │
                               │  OAS → MCP Tools   │
                               └────────────────────┘
```

**How it works:**

1. N8N polls for unreviewed social media posts every 5 minutes
2. Each post is sent to the AI Agent (Claude) for analysis
3. The agent calls **MCP tools via Tyk** to read customer data and active incidents
4. The agent returns a JSON analysis (sentiment, category, escalation target, drafted response)
5. A **Code node** parses the agent output and injects the correct `post_id`
6. **HTTP Request nodes** write the analysis, escalations, and draft responses back to the API
7. Results appear on the **live dashboard** at http://localhost:3100

Key design: the AI agent **reads via MCP tools** (customer lookup, incidents) and **returns structured JSON**. N8N handles all **writes via HTTP Request nodes** with guaranteed correct post IDs.

---

## Step 1: Start the Demo API Server

```bash
cd demo-apis

# Install dependencies (first time only)
npm install

# Seed the database with sample data
npm run seed

# Start the API server on port 3100
npm start
```

Verify it's running:
```bash
curl http://localhost:3100/api/health
```

Open the **dashboard** at http://localhost:3100 to see the monitoring UI.

### API Endpoints

| API          | Base URL             | Purpose                          |
|--------------|----------------------|----------------------------------|
| Social Posts | `/api/social-posts`  | Incoming social media feed       |
| Analysis     | `/api/analysis`      | AI analysis results storage      |
| Customers    | `/api/customers`     | Customer lookup by social handle |
| Escalations  | `/api/escalations`   | Escalation tracking              |
| Responses    | `/api/responses`     | Public response drafts           |
| Incidents    | `/api/incidents`     | Known active service issues      |

Full API docs: http://localhost:3100/api

### Sample Data

- **20 social media posts** across Twitter, Facebook, Instagram, Reddit, LinkedIn
  - 3 critical (phishing, fraud, security)
  - 7 negative (app bugs, fee complaints, service outages)
  - 3 positive (customer praise)
  - 4 neutral (news, community, non-banking)
  - 3 edge cases (mixed sentiment, follow-ups)
- **8 bank customers** linked to social handles (standard to private banking tiers)
- **3 active incidents** (app login delays, Zelle outage, phishing campaign)

### Resetting Data

Click **Reset Demo Data** on the dashboard, or run `npm run seed`.

---

## Step 2: Set Up Tyk AI Studio (MCP Tools)

### 2a. Import OAS Files

Import these **two** OAS files into Tyk AI Studio from `demo-apis/oas/`. Only the Customer Lookup and Incidents APIs are needed as MCP tools (the agent reads from these):

| File                   | API Name in Tyk                  | MCP Tools Created         |
|------------------------|----------------------------------|---------------------------|
| `customers.oas.json`   | Customer Lookup API              | `lookupCustomerByHandle`  |
| `incidents.oas.json`   | Known Incidents API              | `getActiveIncidents`      |

The remaining APIs (social-posts, analysis, escalations, responses) are called directly by N8N via HTTP Request nodes and do **not** need to be imported into Tyk.

### 2b. Important: Server URL

The OAS files have `servers.url` set to `http://host.docker.internal:3100`. This is correct if:
- **N8N runs in Docker** and the API server runs on the host machine
- **Tyk runs in Docker** and needs to reach the host

If your setup is different, update the `servers` URL in the OAS files before importing.

### 2c. Configure Tyk Gateway

1. Import each OAS file into Tyk Dashboard
2. Verify the upstream/target URL is `http://host.docker.internal:3100`
3. Publish each API
4. Note the MCP endpoint URLs (e.g., `http://host.docker.internal:9091/tools/<api-name>/mcp`)

### 2d. Authentication

Create a bearer auth credential in Tyk for the MCP endpoints. You'll use this in N8N's MCP Client Tool nodes.

---

## Step 3: Set Up N8N Workflow

### 3a. Prerequisites

1. **Anthropic Credential**: N8N Settings -> Credentials -> Add "Anthropic" with your API key
2. **Bearer Auth Credential**: N8N Settings -> Credentials -> Add "Header Auth" with your Tyk MCP bearer token
3. **MCP Client Tool node**: Ensure the `@n8n/n8n-nodes-langchain` package is installed

### 3b. Import the Workflow

1. Open N8N
2. Go to **Workflows -> Import from File**
3. Select `Acme Bank - Social Media Risk Monitor.json`

### 3c. Workflow Nodes (13 total)

```
Poll Every 5 Min
  -> Fetch Unreviewed Posts (HTTP GET, 3 posts per batch)
    -> Split Posts
      -> AI Risk Analyst Agent (Claude Opus)
          ├── Anthropic Claude (LLM sub-node)
          ├── Customer Lookup (MCP Client Tool, via Tyk)
          └── Incidents (MCP Client Tool, via Tyk)
        -> Parse Agent Output (Code node - extracts JSON, adds post_id)
          -> Save Analysis (HTTP POST to /api/analysis)
            -> Needs Escalation? (IF: escalation_target != no_escalation)
               ├── Yes -> Create Escalation (HTTP POST to /api/escalations)
               └── No  -> Response Needed? (IF: suggested_response != "No response needed")
                          ├── Yes -> Save Draft Response (HTTP POST to /api/responses)
                          └── No  -> done
```

### 3d. Nodes to Configure After Import

1. **Anthropic Claude** -> Select your Anthropic credential, confirm model
2. **Customer Lookup MCP node** -> Set endpoint URL to your Tyk MCP endpoint, select bearer auth credential
3. **Incidents MCP node** -> Set endpoint URL to your Tyk MCP endpoint, select bearer auth credential
4. **Fetch Unreviewed Posts** -> URL should be `http://host.docker.internal:3100/api/social-posts/unreviewed`
5. **Save Analysis, Create Escalation, Save Draft Response** -> URLs should use `http://host.docker.internal:3100`

### 3e. Manual Build (if import fails)

Build in this order:

1. **Schedule Trigger** -> Every 5 minutes
2. **HTTP Request** -> `GET http://host.docker.internal:3100/api/social-posts/unreviewed`
3. **Split Out** -> Field: `posts`
4. **AI Agent** (LangChain):
   - Sub-node: **Anthropic Chat Model** -> Claude Opus, temp 0.1, max 4096 tokens
   - Sub-node: **MCP Client Tool** (x2) -> Customer Lookup + Incidents endpoints
   - Prompt: see the workflow JSON for the full prompt text
5. **Code node** ("Parse Agent Output") -> see workflow JSON for the JavaScript code
6. **HTTP Request** -> `POST http://host.docker.internal:3100/api/analysis` with body from Code node output
7. **IF** -> `$json.escalation_target != "no_escalation"`
   - True: **HTTP Request** -> `POST /api/escalations`
   - False: **IF** -> `$json.suggested_response` does not contain "No response needed"
     - True: **HTTP Request** -> `POST /api/responses`

---

## Step 4: Run the Demo

### First Run

1. Ensure the API server is running: `npm start` in `demo-apis/`
2. Open the dashboard: http://localhost:3100
3. In N8N, click **Test Workflow**
4. The workflow processes 3 posts per run (rate limit safe)
5. Watch the dashboard update within 15 seconds (auto-refreshes)

### What You'll See on the Dashboard

| Panel              | Shows                                                    |
|--------------------|----------------------------------------------------------|
| Stats Bar          | Total posts, analyzed count, critical/negative/positive, escalations |
| Unreviewed Posts   | Posts waiting to be processed                            |
| Analyzed Posts     | Processed posts with sentiment tags and categories       |
| Escalations        | Issues flagged for Security/PR/Support teams             |
| Draft Responses    | AI-drafted replies with Approve/Reject buttons           |
| Active Incidents   | Known service issues the bank is tracking                |

### Live Demo Script

1. **Show the dashboard** -> 20 unreviewed posts, nothing analyzed yet
2. **Trigger the workflow** in N8N -> processes 3 posts
3. **Watch the dashboard update** -> analyzed posts appear, escalations created, responses drafted
4. **Trigger again** -> 3 more posts processed
5. **Approve a response** -> click Approve on a draft response
6. **Add a live post** -> use the curl command below, trigger workflow, show it gets analyzed
7. **Show the API** -> `curl http://localhost:3100/api/analysis/summary`

### Adding a Live Post During Demo

```bash
curl -X POST http://localhost:3100/api/social-posts \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "author_handle": "demo_user",
    "author_name": "Demo User",
    "content": "@AcmeNatlBank I just noticed a $500 charge on my account I did not authorize. Please help ASAP!",
    "likes": 5,
    "shares": 2,
    "comments_count": 1,
    "posted_at": "2026-04-09T16:00:00Z"
  }'
```

Then trigger the workflow -- only the new unreviewed post will be picked up.

### Processing All Posts

The workflow processes 3 posts per run (to stay within API rate limits). To process all 20:
- Trigger the workflow 7 times, or
- Change the limit: update `Fetch Unreviewed Posts` URL to add `?limit=10` (if your rate limit allows)

---

## File Reference

```
n8nproject/
├── demo-apis/
│   ├── package.json                # Node.js project
│   ├── server.js                   # Express API server (port 3100) + dashboard
│   ├── seed-data.js                # Sample data seeder
│   ├── public/
│   │   └── index.html              # Live monitoring dashboard
│   ├── db/
│   │   ├── init.js                 # Database schema & initialization
│   │   └── acme_bank.db            # SQLite database (auto-created)
│   ├── routes/
│   │   ├── social-posts.js         # Social media posts CRUD
│   │   ├── analysis.js             # Sentiment analysis results
│   │   ├── customers.js            # Customer lookup
│   │   ├── escalations.js          # Escalation tracking
│   │   ├── responses.js            # Public response management
│   │   └── incidents.js            # Known incidents
│   └── oas/
│       ├── customers.oas.json      # OAS 3.0 -> import into Tyk (MCP tool)
│       ├── incidents.oas.json      # OAS 3.0 -> import into Tyk (MCP tool)
│       ├── analysis.oas.json       # OAS 3.0 (reference only, not needed in Tyk)
│       ├── escalations.oas.json    # OAS 3.0 (reference only, not needed in Tyk)
│       ├── responses.oas.json      # OAS 3.0 (reference only, not needed in Tyk)
│       └── social-posts.oas.json   # OAS 3.0 (reference only, not needed in Tyk)
├── Acme Bank - Social Media Risk Monitor.json  # N8N workflow (import this)
└── SETUP-GUIDE.md                  # This file
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API server won't start | Check port 3100 isn't in use: `lsof -i :3100` |
| Empty unreviewed posts | Click Reset Demo Data on dashboard, or run `npm run seed` |
| N8N workflow import fails | Build manually following Step 3e |
| MCP tools not connecting | Verify Tyk upstream URL is `host.docker.internal:3100`, not `localhost:3100` |
| "undefined is not valid JSON" in Save Analysis | The Parse Agent Output Code node isn't connected, or the agent returned non-JSON text |
| Agent hits max iterations | Reduce MCP tools connected to agent (should only be Customer Lookup + Incidents) |
| Rate limit errors | Reduce batch size: change `?limit=3` in the Fetch Unreviewed Posts URL |
| Dashboard not updating | Check the API server is running; dashboard auto-refreshes every 15 seconds |
| Posts not marked as reviewed | The `POST /api/analysis` endpoint auto-updates post status to 'reviewed' |
| Foreign key constraint error | Post IDs changed after re-seeding; reset data and re-run workflow |

---

## Key Design Decisions

**Why does the agent read via MCP but write via HTTP Request nodes?**

LLMs don't reliably include all required fields when calling write-back tools (e.g., they omit `post_id` because they consider it "metadata"). By having the agent return a JSON analysis and using N8N Code + HTTP nodes for writes, we guarantee correct `post_id` injection from the pipeline context.

**Why 3 posts per batch?**

To stay within Anthropic API rate limits (50k input tokens/min on lower tiers). Each post requires ~2 MCP tool calls + analysis, consuming significant tokens. Adjust the limit based on your tier.

**Why a Code node between the agent and Save Analysis?**

The agent returns raw text that may include markdown code blocks or extra explanation. The Code node safely extracts JSON, handles edge cases, and injects the `post_id` and `platform` from the Split Posts node.
