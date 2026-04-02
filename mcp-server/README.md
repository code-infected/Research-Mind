# ResearchMind MCP Server

A custom Model Context Protocol (MCP) server that powers an autonomous AI research agent. This server provides 7 core tools for web searching, document reading, report synthesis, and memory storage.

## Features

- **Web Search**: Uses the Brave Search API to find precise relevant pages.
- **Web Content Reader**: Extracts clean text from web pages with intelligent length truncation.
- **arXiv Paper Search**: Queries the academic arXiv database for peer-reviewed papers.
- **PDF Extraction**: Reads and extracts text chunks from PDF research papers.
- **Content Summarization**: Uses an LLM to generate concise, focused summaries of long-form text.
- **Persistent Memory**: Saves and queries research findings using a local ChromaDB vector database.
- **Citation Tracking**: Automatically tracks sources and generates bibliographies.

## Getting Started

### Prerequisites

- Python 3.10+
- [FastMCP](https://github.com/jlowin/fastmcp) for exposing endpoints
- API Keys: 
  - Anthropic (for summarization)
  - Brave Search (for web search)

### Installation

1. Clone the repository and navigate to `mcp-server`:
```bash
git clone https://github.com/yourusername/researchmind-mcp.git
cd researchmind-mcp
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables in `.env`:
```env
ANTHROPIC_API_KEY=your_key
BRAVE_API_KEY=your_key
CHROMA_DB_PATH=./chroma_data
```

### Running the Server

Start the FastMCP server standard out interface:

```bash
python server.py
```

## How to use with your Agent

Once running, the tools are exposed via the MCP standard. You can connect any MCP-compatible client (like Claude Desktop or a custom Python agent) to use these capabilities autonomously!
