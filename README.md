# 🧠 ResearchMind

> An autonomous AI research agent that decomposes complex topics, searches the web and academic papers, and synthesizes comprehensive cited reports — all streamed live to a real-time UI.

[![GitHub](https://img.shields.io/badge/GitHub-Research--Mind-181717?logo=github)](https://github.com/code-infected/Research-Mind)
[![MCP Server](https://img.shields.io/badge/MCP_Server-Open_Source-00D9FF)](./mcp-server)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## ✨ Features

- **🔍 Autonomous Research** — Enter any topic. The agent decomposes it into sub-questions and researches each one independently using multiple sources.
- **🌐 Multi-Source Search** — Web search (Tavily / DuckDuckGo fallback) + academic papers (arXiv) + PDF extraction
- **🧠 Semantic Memory** — ChromaDB-powered vector memory stores and retrieves findings across the research session for cross-referencing
- **📝 In-Depth Cited Reports** — Produces structured Markdown reports (1,500–3,000 words) with inline citations `[1]`, bibliography, and thematic analysis
- **⚡ Real-Time Streaming** — Watch the agent think step-by-step via Server-Sent Events (SSE) with a live timeline UI
- **🔧 Open-Source MCP Server** — 7 modular research tools any MCP-compatible agent can use ([see the MCP server →](./mcp-server))
- **🔐 Authentication** — Clerk-based auth with per-user session isolation
- **📊 Research History** — Browse, filter, and revisit past research sessions and reports

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                    │
│   Dashboard → AgentTimeline (SSE) → ReportView → History │
└───────────────────────┬──────────────────────────────────┘
                        │ SSE Stream (via API proxy routes)
┌───────────────────────┴──────────────────────────────────┐
│                   FastAPI Backend                          │
│   POST /research → Plan → Execute → Synthesize → Save     │
│   GET  /history  → List sessions                          │
│   GET  /report   → Fetch archived report                  │
└───────────────────────┬──────────────────────────────────┘
                        │ MCP Tool Calls
┌───────────────────────┴──────────────────────────────────┐
│                MCP Server (FastMCP 3.0)                    │
│   web_search │ web_reader │ arxiv_search │ pdf_reader      │
│   summarizer │ memory_store │ citation_tracker             │
└──────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
    ChromaDB        PostgreSQL       LiteLLM
   (vectors)       (sessions)    (multi-provider)
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- At least one LLM API key (see below)

### 1. Clone & Configure

```bash
git clone https://github.com/code-infected/Research-Mind.git
cd Research-Mind

# Copy the env template and fill in your API keys
cp .env.example .env
```

### 2. Set Up API Keys

Edit `.env` with your keys. You only need **one** LLM provider:

| Key | Required | Free Tier | Get it at |
|-----|----------|-----------|-----------|
| `GROQ_API_KEY` | ✅ Recommended | Yes (generous) | [console.groq.com](https://console.groq.com) |
| `TAVILY_API_KEY` | Optional | Yes (1,000/mo) | [tavily.com](https://tavily.com) |
| `DATABASE_URL` | Optional | Yes | [supabase.com](https://supabase.com) |
| `OPENROUTER_API_KEY` | Optional | Yes | [openrouter.ai](https://openrouter.ai) |
| `GOOGLE_API_KEY` | Optional | Yes | [aistudio.google.com](https://aistudio.google.com) |

> **Note:** If no `TAVILY_API_KEY` is set, web search falls back to DuckDuckGo (free, no key needed).
> If no `DATABASE_URL` is set, research still works but sessions won't persist.

### 3. Install & Run

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the backend (terminal 1)
uvicorn backend.main:app --reload --port 8000

# Install frontend dependencies and start (terminal 2)
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** and start researching!

### Or Use Docker

```bash
cp .env.example .env
# Edit .env with your keys
docker compose up
```

## 📁 Project Structure

```
Research-Mind/
├── mcp-server/              # ⭐ Open-source MCP server (7 research tools)
│   ├── server.py            # FastMCP 3.0 entry point with tool registration
│   ├── tools/               # Individual tool implementations
│   │   ├── web_search.py    # Tavily / DuckDuckGo search
│   │   ├── web_reader.py    # Webpage content extraction
│   │   ├── arxiv_search.py  # Academic paper search
│   │   ├── pdf_reader.py    # PDF content extraction
│   │   ├── summarizer.py    # LLM-powered content summarization
│   │   ├── memory_store.py  # ChromaDB vector memory
│   │   └── citation_tracker.py  # Citation management
│   └── README.md            # Standalone MCP server documentation
├── agent/                   # Research agent orchestration
│   ├── planner.py           # Topic → sub-questions decomposition
│   ├── executor.py          # Tool call loop with retry/fallback
│   ├── synthesizer.py       # Findings → structured report with citations
│   ├── llm.py              # LiteLLM wrapper (multi-provider support)
│   └── config.py           # Agent configuration
├── backend/                 # FastAPI backend
│   ├── main.py             # App entry, CORS, lifespan
│   ├── routes/             # API routes (research, history, health)
│   ├── models.py           # SQLAlchemy models (User, Session, Report)
│   ├── database.py         # PostgreSQL connection
│   └── auth.py             # Clerk JWT authentication
├── frontend/               # Next.js 14 frontend
│   ├── src/app/            # App Router pages
│   │   ├── page.tsx        # Main research dashboard
│   │   ├── history/        # Session history browser
│   │   ├── research/       # Report viewer
│   │   └── settings/       # Configuration info
│   └── src/components/     # UI components
│       ├── AgentTimeline.tsx    # Real-time research event feed
│       ├── ReportView.tsx      # Markdown report renderer
│       ├── TerminalInput.tsx   # Research submission form
│       ├── SourceList.tsx      # Live source discovery panel
│       └── layout/             # Navbar, sidebar, mobile nav
├── docker-compose.yml      # One-command local setup
├── Dockerfile              # Backend container
└── requirements.txt        # Python dependencies (pinned)
```

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, React Markdown |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2 |
| **MCP Server** | FastMCP 3.0 (7 tools) |
| **LLM** | LiteLLM — supports Groq, OpenRouter, Anthropic, Google Gemini |
| **Vector DB** | ChromaDB (semantic memory) |
| **Search** | Tavily API (primary), DuckDuckGo (fallback), arXiv API |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Clerk (JWT-based) |
| **Deployment** | Docker Compose, Vercel (frontend), any cloud (backend) |

## 📡 API Reference

### `POST /api/research`

Start a new research session. Returns an SSE stream of agent events.

```bash
curl -N http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "latest advances in quantum computing",
    "max_sub_questions": 5,
    "include_arxiv": true
  }'
```

**SSE Event Flow:**

```
event: plan       → Sub-questions generated, session created
event: status     → Agent working on question N
event: tool_start → Tool invoked (web_search, summarizer, etc.)
event: tool_result→ Tool returned data
event: finding    → Source processed and stored
event: report     → Final synthesized report with metadata
event: done       → Research complete
event: error      → Error occurred (with details)
```

### `GET /api/history`

List past research sessions (paginated, filtered by authenticated user).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Results per page (1–100) |
| `offset` | int | 0 | Pagination offset |

### `GET /api/report/{session_id}`

Fetch a specific research session and its full report.

### `GET /api/health`

Service health check — returns backend status and database connectivity.

## ⚙️ Configuration

All configuration is via environment variables. Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `groq` | LLM provider (groq, openrouter, anthropic, google) |
| `LLM_MODEL` | `groq/llama-3.3-70b-versatile` | Model identifier (LiteLLM format) |
| `LLM_FALLBACK_MODELS` | — | Comma-separated fallback model chain |
| `MAX_SUB_QUESTIONS` | `5` | Number of sub-questions per research (2–8) |
| `MAX_SOURCES_PER_QUESTION` | `3` | Sources to read per sub-question |
| `MAX_TOOL_CALLS_PER_QUESTION` | `5` | Tool call budget per sub-question |
| `REPORT_MAX_TOKENS` | `8192` | Max tokens for report generation |
| `MAX_REPORT_LENGTH` | `15000` | Max report length in characters |

## 🤝 Contributing

Contributions welcome! Some areas where help is appreciated:

- **New MCP tools** — Add tools in `mcp-server/tools/` and register in `server.py`
- **LLM providers** — LiteLLM supports 100+ providers; test and document new ones
- **UI improvements** — The frontend uses Tailwind CSS with a "Cold Precision" dark theme
- **Report quality** — Improve the synthesis prompt in `agent/synthesizer.py`

```bash
# Fork the repo
git clone https://github.com/your-username/Research-Mind.git

# Create a feature branch
git checkout -b feature/your-feature

# Make changes and test
uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev

# Submit a PR
git push origin feature/your-feature
```

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/code-infected">@code-infected</a> — demonstrating autonomous AI agent architecture, MCP server implementation, and real-time streaming UI.
</p>
