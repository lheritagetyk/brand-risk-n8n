# Acme National Bank: Social Media Brand Risk Monitor
## Demo Narrative & Talking Points

---

## The Business Problem

### Banks live and die by trust.

A single viral tweet can move markets. A trending complaint thread can trigger a run on deposits. A security scare left unanswered for two hours can become tomorrow's headline on CNBC.

**The numbers tell the story:**

- 67% of consumers expect a brand response on social media within 24 hours; 39% expect it within 60 minutes
- A single negative post from a high-follower account can reach 500,000 people before your PR team finishes their morning coffee
- In 2025 alone, multiple regional banks saw 8-figure deposit outflows that began with unanswered social media complaints snowballing into local news coverage
- Regulators now monitor social media sentiment as an early warning indicator for institutional risk

### The old way doesn't work.

Today, most banks handle social media monitoring with a small team manually reviewing posts in a social listening tool. They scan, they triage, they escalate over email, they draft responses in a shared doc, and they hope nothing critical slips through overnight.

**The gaps are obvious:**

- **Speed**: Manual review creates a 2-6 hour lag on critical posts. A phishing alert shared at 7am might not get a bank response until noon.
- **Consistency**: Different analysts classify the same post differently. One person's "negative" is another's "critical." Escalation is subjective.
- **Context blindness**: The analyst reading a complaint about Zelle delays doesn't know that the bank's operations team already identified a Zelle outage 30 minutes ago. The analyst reviewing an angry tweet doesn't know the author is a platinum private banking client worth $4M in AUM.
- **Scale**: A mid-size bank generates 200-500 social mentions per day. During a crisis, that spikes to 5,000+. No human team can keep up.
- **Audit trail**: Regulators increasingly want to see how your institution detected, classified, and responded to public complaints. Manual processes leave gaps.

---

## The Solution: AI-Powered Brand Risk Monitoring

This demo shows an end-to-end automated pipeline that:

1. **Ingests** social media posts mentioning Acme National Bank in real-time
2. **Enriches** each post with internal data — is this person a customer? What tier? Are there active incidents that explain their complaint?
3. **Analyzes** sentiment, classifies the issue, and determines escalation routing
4. **Drafts** professional, empathetic public responses that incorporate known incident status
5. **Escalates** critical issues to the right team (Security, PR, Customer Support) with full context
6. **Tracks** everything in a live dashboard with an audit trail

What used to take a team of 5 analysts working 8-hour shifts now runs continuously, processes posts in seconds, and never misses a critical alert at 3am.

---

## Why Tyk AI Studio Matters

### The demo falls apart without it. Here's why.

The AI agent at the center of this workflow needs to do something that LLMs can't do alone: **access live internal systems in real-time**. Claude doesn't know who your customers are. It doesn't know about your active service incidents. It can't look up whether @sarah_fintech is a Gold tier checking customer or a random internet commenter.

**Tyk AI Studio solves the "last mile" problem of enterprise AI.**

#### 1. Turning APIs into AI-Ready Tools (MCP)

Your bank already has APIs — customer databases, incident trackers, CRM systems. But an LLM can't call a REST API directly. Someone has to:

- Define the tool schema so the LLM knows what parameters to send
- Handle authentication and authorization
- Route requests through your API gateway
- Enforce rate limits and access policies

**Tyk AI Studio does all of this automatically.** You import an OpenAPI spec, and it generates MCP-compatible tool definitions that any AI agent can call. In this demo, we imported two OAS files and instantly had AI-callable tools for customer lookup and incident checking.

Without AI Studio, a developer would need to manually write tool definitions, build authentication middleware, and create custom proxy logic for every API the agent needs to access. That's weeks of integration work per API.

#### 2. Governance and Control

When an AI agent can call your internal APIs, you need guardrails:

- **Authentication**: Every MCP tool call goes through Tyk's gateway with bearer token auth. No anonymous AI access to customer data.
- **Rate limiting**: Prevent a runaway agent from hammering your customer database with 10,000 lookups per minute.
- **Observability**: Every tool call is logged through Tyk. You can see exactly what the AI agent accessed, when, and what data was returned. This is critical for compliance and audit.
- **Access control**: You decide which APIs are exposed as MCP tools. The AI agent can look up customers but can't modify accounts, transfer funds, or access PII beyond what the tool exposes.

#### 3. Decoupling AI from Infrastructure

The AI workflow doesn't need to know where your customer database lives, what authentication scheme it uses, or how to handle failover. Tyk AI Studio abstracts all of that behind a clean MCP interface.

This means:

- **Swap the LLM**: Move from Claude to GPT to Gemini without changing any API integration code
- **Swap the orchestrator**: Move from N8N to LangChain to a custom agent without re-integrating APIs
- **Update APIs independently**: Migrate your customer database from v1 to v2 — update the OAS in Tyk, and the AI tools update automatically
- **Multi-agent**: Multiple AI workflows can share the same MCP tools without duplicating integration work

#### 4. The OAS-to-MCP Pipeline

This is the specific technical innovation that makes the demo possible:

```
Your existing API  →  OpenAPI Spec  →  Tyk AI Studio  →  MCP Tool  →  AI Agent calls it
```

You didn't have to write any AI-specific code. You didn't build a custom integration layer. You took a standard OpenAPI spec — the same spec you already use for documentation and client generation — and Tyk turned it into an AI-callable tool in minutes.

**That's the pitch**: if you have APIs and you have OpenAPI specs, you're already 90% of the way to AI-ready infrastructure. Tyk AI Studio is the bridge.

---

## The Demo Scenario: A Bad Day at Acme National Bank

### Setting the Scene

It's Wednesday morning at Acme National Bank. Three things are happening simultaneously:

**An active phishing campaign.** The security team identified it yesterday — fraudsters are sending fake "account verification" texts mimicking Acme's branding. Customers are starting to post about it on social media, some panicking, some warning others.

**A Zelle outage.** Since yesterday afternoon, Zelle transfers have been delayed 2-4 hours due to a third-party service issue. Business customers who rely on timely payments are getting increasingly frustrated.

**A mobile app bug.** The latest app update introduced login delays of 30-60 seconds. It's been active for two days and engineering is working on a fix.

On top of these known issues, the normal stream of complaints, praise, and mentions keeps flowing:
- A private banking client is unhappy about unreturned calls from her relationship manager
- A new customer feels misled about fee-free checking
- A business customer loves the new dashboard but found a bug in bill pay
- A local community org is thanking the bank for sponsoring a cleanup event
- A parody account is making jokes about the bank replacing tellers with parrots
- A cybersecurity influencer is amplifying the phishing warnings to 100K+ followers

**20 posts. Multiple platforms. Mixed sentiment. Active crises. VIP customers in the mix.**

A human team would need 2-3 hours to properly triage all of this. The AI workflow does it in minutes.

---

## Demo Walkthrough

### Act 1: "The Flood" (Show the Problem)

Open the dashboard at http://localhost:3100.

> "Here's what the social media team sees when they walk in Wednesday morning. 20 posts overnight, all unreviewed. Some might be critical security issues. Some might be VIP customers threatening to leave. Some might be irrelevant noise. Right now, nobody knows which is which."

Point out the stats bar: 20 total posts, 0 analyzed, 0 escalations.

### Act 2: "The AI Gets to Work" (Trigger the Workflow)

Switch to N8N. Trigger the workflow.

> "Now watch what happens. The N8N workflow picks up the next batch of posts. For each one, the AI agent — powered by Claude — does something a human analyst can't: it simultaneously checks our internal systems."

> "Through Tyk AI Studio, the agent has access to our Customer Lookup API and our Known Incidents API as MCP tools. When it sees a complaint from @sarah_fintech about app login delays, it doesn't just analyze the text. It looks up Sarah Mitchell — Gold tier customer since 2019. It checks active incidents and finds the Mobile App Login Delays issue. Now it knows this is a known issue affecting an identified, valued customer."

Switch back to the dashboard. Wait for it to refresh.

> "Within seconds, the analysis is complete. The dashboard shows the results: sentiment classification, issue categories, escalation routing, and AI-drafted responses."

### Act 3: "Smart Triage" (Walk Through Results)

Click through the analyzed posts on the dashboard.

> "Look at how the AI classified these. The phishing reports are flagged as Critical, Security Concern, escalated to the security team. The high-engagement cybersecurity influencer post with 1,200 likes is also escalated — but to the PR team, because it's a reputational risk that needs coordinated messaging."

> "The Zelle complaint from James Rodriguez? The agent looked him up — Platinum tier business customer since 2017. It cross-referenced with the known Zelle outage and drafted a response that incorporates the approved public statement about the outage. And it escalated to customer support with high priority because he's a business banking client."

> "The parody account tweet about replacing tellers with parrots? Correctly classified as not banking-related, neutral sentiment, no escalation needed. The foodie tweet that happens to mention 'bank of sauces'? Filtered out. No response needed."

### Act 4: "The Human in the Loop" (Approve Responses)

Show the Draft Responses panel.

> "The AI doesn't post anything publicly. Every response is a draft that goes through human review. The social media manager can approve, edit, or reject each one."

Click Approve on a response.

> "One click and it's approved. The audit trail shows who approved it, when, and the original AI-drafted text. This is the governance story — AI handles the speed and scale, humans retain final authority."

### Act 5: "The New Threat" (Live Post)

Add a new post via curl or the API:

```bash
curl -X POST http://localhost:3100/api/social-posts \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "author_handle": "priya_invests",
    "author_name": "Priya Patel",
    "content": "@AcmeNatlBank I just received a call from someone claiming to be from your fraud department asking for my PIN. I did NOT give it to them but I am very concerned about the security of my account. Please advise IMMEDIATELY.",
    "likes": 45,
    "shares": 12,
    "comments_count": 8,
    "posted_at": "2026-04-09T16:30:00Z"
  }'
```

> "A new post just came in. Priya Patel — let's see how the system handles it."

Trigger the workflow. Wait for dashboard update.

> "The agent identified Priya as a Private Banking client — our highest tier. It classified this as Critical, Security Concern, and escalated to the security team with high severity. The drafted response assures her that Acme never asks for PINs by phone and directs her to the security hotline. This post went from ingestion to triaged, analyzed, and response-drafted in under 30 seconds."

---

## Key Talking Points

### For the CTO / Head of Engineering
- "Every API you already have can become an AI-callable tool through Tyk AI Studio. No custom integration code. Import the OpenAPI spec, get an MCP endpoint."
- "The AI agent is model-agnostic. Swap Claude for GPT, swap N8N for LangChain — the MCP tools through Tyk stay the same."
- "Full observability through the gateway. Every AI tool call is logged, rate-limited, and authenticated."

### For the CISO / Head of Risk
- "The AI never has direct database access. Everything goes through Tyk's gateway with authentication, rate limiting, and audit logging."
- "Customer PII exposure is controlled at the API level. The lookup tool returns tier and account type, not SSNs or balances."
- "Every analysis, escalation, and response is persisted with timestamps. Full audit trail for regulators."
- "Security threats are auto-escalated. A phishing report at 3am gets flagged immediately, not discovered at 9am."

### For the CMO / Head of Marketing
- "Response time drops from hours to seconds. The AI drafts professional, on-brand responses that incorporate your approved messaging for known incidents."
- "VIP customers are automatically identified and prioritized. A complaint from a private banking client gets different handling than a random mention."
- "No more missed posts. Every mention is analyzed, classified, and tracked. Nothing falls through the cracks."

### For the Head of Operations / COO
- "This replaces a 5-person team working 3 shifts with an automated pipeline that runs 24/7 and costs a fraction."
- "Scale is no longer a constraint. During a crisis when mentions spike 10x, the system keeps up. Human teams don't."
- "The dashboard gives real-time situational awareness. During an active incident, leadership can see sentiment trends, escalation volumes, and response status in one place."

---

## The Tyk AI Studio Value Proposition (Summary)

| Without Tyk AI Studio | With Tyk AI Studio |
|-----------------------|--------------------|
| Weeks to integrate each API with AI | Minutes: import OAS, get MCP tools |
| Custom auth/proxy code per integration | Gateway handles auth, rate limits, logging |
| AI has direct, ungoverned API access | Every call goes through policy-controlled gateway |
| Changing the LLM means rewriting integrations | Model-agnostic: MCP tools work with any LLM |
| No visibility into what AI accessed | Full audit trail of every tool call |
| Each AI workflow duplicates integration work | Shared MCP tools across all workflows and agents |

**The one-liner**: Tyk AI Studio turns your existing APIs into governed, AI-ready tools — no custom code, full control, instant interoperability.
