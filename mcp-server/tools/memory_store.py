"""
memory_store.py — ChromaDB semantic memory for ResearchMind MCP Server.

Provides read/write/query operations on a ChromaDB vector store.
Used by the agent to save research findings and retrieve them later
for synthesis. Supports session-scoped storage to prevent cross-session bleed.
"""

import os

# Disable ChromaDB telemetry before importing
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

import uuid
import chromadb
from typing import Optional


# Module-level client (initialized lazily)
_client: Optional[chromadb.ClientAPI] = None
_collections: dict = {}

COLLECTION_PREFIX = "research_findings"


def _get_collection_name(session_id: str = "default") -> str:
    """Generate a session-scoped collection name."""
    safe_id = session_id.replace("-", "_")[:16]
    return f"{COLLECTION_PREFIX}_{safe_id}"


def _get_collection(session_id: str = "default"):
    """Get or create a session-scoped ChromaDB collection (lazy initialization)."""
    global _client, _collections

    collection_name = _get_collection_name(session_id)

    if collection_name not in _collections:
        if _client is None:
            db_path = os.getenv("CHROMA_DB_PATH", "./chroma_data")
            _client = chromadb.PersistentClient(path=db_path)

        _collections[collection_name] = _client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    return _collections[collection_name]


async def store(
    content: str,
    metadata: Optional[dict] = None,
    doc_id: Optional[str] = None,
    session_id: str = "default",
) -> dict:
    """
    Store a piece of information in the vector memory.

    Args:
        content: The text content to store.
        metadata: Optional metadata dict (e.g., source URL, topic, type).
        doc_id: Optional custom document ID. Auto-generated if not provided.
        session_id: Session ID for scoping (default "default").

    Returns:
        A dict with keys: id, stored (bool), content_length.
    """
    collection = _get_collection(session_id)

    if not doc_id:
        doc_id = str(uuid.uuid4())

    meta = metadata or {}
    # ChromaDB requires metadata values to be str, int, float, or bool
    clean_meta = {}
    for k, v in meta.items():
        if isinstance(v, (str, int, float, bool)):
            clean_meta[k] = v
        elif isinstance(v, list):
            clean_meta[k] = ", ".join(str(item) for item in v)
        else:
            clean_meta[k] = str(v)

    collection.upsert(
        ids=[doc_id],
        documents=[content],
        metadatas=[clean_meta] if clean_meta else None,
    )

    return {
        "id": doc_id,
        "stored": True,
        "content_length": len(content),
    }


async def query(
    query_text: str,
    max_results: int = 5,
    filter_metadata: Optional[dict] = None,
    session_id: str = "default",
) -> list[dict]:
    """
    Search the memory store using semantic similarity.

    Args:
        query_text: The text to search for (semantic similarity).
        max_results: Maximum number of results to return (default 5).
        filter_metadata: Optional metadata filter dict (ChromaDB where clause).
        session_id: Session ID for scoping (default "default").

    Returns:
        A list of dicts with keys: id, content, metadata, distance.
        Results are sorted by relevance (lowest distance = most similar).
    """
    collection = _get_collection(session_id)

    if collection.count() == 0:
        return []

    max_results = min(max_results, collection.count())

    query_params = {
        "query_texts": [query_text],
        "n_results": max_results,
    }
    if filter_metadata:
        query_params["where"] = filter_metadata

    results = collection.query(**query_params)

    items = []
    if results and results["ids"]:
        for i in range(len(results["ids"][0])):
            items.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })

    return items


async def delete(doc_id: str) -> dict:
    """
    Delete a document from the memory store.

    Args:
        doc_id: The ID of the document to delete.

    Returns:
        A dict with keys: id, deleted (bool).
    """
    collection = _get_collection()

    try:
        collection.delete(ids=[doc_id])
        return {"id": doc_id, "deleted": True}
    except Exception as e:
        return {"id": doc_id, "deleted": False, "error": str(e)}


async def get_stats(session_id: str = "default") -> dict:
    """
    Get memory store statistics.

    Args:
        session_id: Session ID for scoping (default "default").

    Returns:
        A dict with keys: collection_name, document_count.
    """
    collection = _get_collection(session_id)

    return {
        "collection_name": _get_collection_name(session_id),
        "document_count": collection.count(),
    }


def reset_collection(session_id: str = "default"):
    """Drop the session collection and remove from cache."""
    global _client, _collections

    collection_name = _get_collection_name(session_id)

    if _client is not None and collection_name in _collections:
        try:
            _client.delete_collection(name=collection_name)
        except Exception:
            pass
        del _collections[collection_name]
