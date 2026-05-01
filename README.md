# 🧠 ResearchMind

> An autonomous AI research agent powered by a custom open-source MCP server. Searches the web, reads papers, synthesizes findings, and produces structured reports with citations — all streamed to a live UI in real time.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://researchmind.vercel.app)
[![MCP Server](https://img.shields.io/badge/MCP_Server-Open_Source-green)](./mcp-server)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

## ✨ Features

- **🔍 Autonomous Research** — Enter a topic, the agent decomposes it into sub-questions and researches each one independently
- **🌐 Multi-Source Search** — Web search (Brave API) + academic papers (arXiv) + PDF extraction
- **🧠 Semantic Memory** — ChromaDB-powered memory stores and retrieves findings across the research session
- **📝 Cited Reports** — Produces structured Markdown reports with inline citations and bibliography
- **⚡ Real-Time Streaming** — Watch the agent think step-by-step via Server-Sent Events
- **🔧 Open-Source MCP Server** — 7 research tools any agent can use ([see the MCP server →](./mcp-server))

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│  Dashboard → AgentThinking (SSE) → Report → History  │
└──────────────────────┬──────────────────────────────┘
                       │ SSE Stream
┌──────────────────────┴──────────────────────────────┐
│                FastAPI Backend                        │
│  POST /research → Plan → Execute → Synthesize        │
└──────────────────────┬──────────────────────────────┘
                       │ MCP Tool Calls
┌──────────────────────┴──────────────────────────────┐
│              MCP Server (FastMCP 3.0)                │
│  web_search │ web_reader │ arxiv_search │ pdf_reader │
│  summarizer │ memory_store │ citation_tracker        │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- API Keys:
  - [Brave Search](https://brave.com/search/api/) (free: 2,000/month)
  - [Google AI Studio](https://aistudio.google.com/app/apikey) (free tier)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/researchmind.git
cd researchmind

# Copy env and add your keys
cp .env.example .env

# Install Python dependencies
pip install -r requirements.txt

# Start the backend
uvicorn backend.main:app --reload --port 8000

# In another terminal — start the frontend
cd frontend
npm install
npm run dev
```

### Or use Docker

```bash
cp .env.example .env
# Edit .env with your keys
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) and start researching!

## 📁 Project Structure

```
researchmind/
├── mcp-server/          # ⭐ Open-source MCP server (7 research tools)
│   ├── server.py        # FastMCP 3.0 entry point
│   ├── tools/           # Individual tool implementations
│   └── README.md        # Standalone docs for the MCP server
├── agent/               # Research agent core
│   ├── planner.py       # Topic → sub-questions (Gemini)
│   ├── executor.py      # Tool call loop with retry/fallback
│   ├── synthesizer.py   # Findings → structured report
│   └── memory.py        # ChromaDB interface
├── backend/             # FastAPI backend
│   ├── main.py          # App entry + CORS
│   ├── routes/          # API routes (research, history, health)
│   ├── models.py        # SQLAlchemy models
│   └── stream.py        # SSE helpers
├── frontend/            # Next.js 14 frontend
│   ├── app/             # App Router pages
│   └── components/      # AgentThinking, Report, SourcePanel
├── docker-compose.yml   # One-command local setup
└── requirements.txt     # Python dependencies
```

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, SQLAlchemy |
| MCP Server | FastMCP 3.0 |
| LLM | Gemini 2.0 Flash (free tier) |
| Vector DB | ChromaDB |
| Search | Brave Search API, arXiv API |
| Database | SQLite (dev) → PostgreSQL (prod) |

## 📡 API

### `POST /api/research`

Start a new research session. Returns an SSE stream.

```bash
curl -N http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "latest advances in quantum computing"}'
```

**SSE Events:** `plan` → `tool_start` → `tool_result` → `finding` → `report` → `done`

### `GET /api/history`

List past research sessions.

### `GET /api/report/{id}`

Get a specific research report.

### `GET /api/health`

Service health check.

## 🤝 Contributing

Contributions welcome! The MCP server is designed to be extended — add new tools by creating a new file in `mcp-server/tools/` and registering it in `server.py`.

## 📄 License

MIT

---

*Built with ❤️ as a demonstration of autonomous AI agent architecture, MCP server implementation, and real-time streaming UI.*
