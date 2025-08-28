import os, json
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import chromadb
from openai import OpenAI

# --- Load env (.env in current/back dirs) ---
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
FULL_SUMMARIES_PATH = os.path.join(DATA_DIR, "full_summaries.json")
BOOK_SUMMARIES_PATH = os.path.join(DATA_DIR, "book_summaries.json")

DEFAULT_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is missing. Put it in backend/.env")

client = OpenAI(api_key=OPENAI_API_KEY)

# --- Load data files loudly (fail clear if invalid) ---
with open(FULL_SUMMARIES_PATH, "r", encoding="utf-8") as f:
    FULL_SUMMARIES: Dict[str, str] = json.load(f)
with open(BOOK_SUMMARIES_PATH, "r", encoding="utf-8") as f:
    BOOKS: List[Dict[str, Any]] = json.load(f)

# --- Chroma: persistent client, NO embedding_function (we pass embeddings ourselves) ---
chroma_client = chromadb.PersistentClient(path=DB_PATH)
collection = chroma_client.get_or_create_collection(
    name="book_summaries",
    metadata={"hnsw:space": "cosine"}
)

# --- Helpers ---
def _coerce_meta_value(v):
    """Chroma metadata must be scalar (str/int/float/bool/None)."""
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    if isinstance(v, (list, tuple)):
        return ", ".join(map(str, v))
    return str(v)

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Call OpenAI embeddings for a batch of texts."""
    resp = client.embeddings.create(
        model=EMBED_MODEL,
        input=texts
    )
    # Order is preserved
    return [d.embedding for d in resp.data]

def seed_if_empty() -> int:
    """Seed Chroma with documents + precomputed embeddings if empty."""
    count = collection.count() or 0
    if count > 0:
        return count

    ids, docs, metas = [], [], []
    for i, b in enumerate(BOOKS):
        themes_str = ", ".join(b.get("themes", []))
        ids.append(f"book-{i}")
        docs.append(f"Title: {b['title']}\nSummary: {b['short_summary']}\nThemes: {themes_str}")
        metas.append({
            "title": _coerce_meta_value(b["title"]),
            "themes": _coerce_meta_value(b.get("themes"))
        })

    # Precompute embeddings explicitly
    try:
        doc_embeddings = embed_texts(docs)
    except Exception as e:
        raise RuntimeError(f"Embedding create failed. Check OPENAI_API_KEY / network. Underlying error: {e}")

    # Upsert with embeddings
    collection.upsert(
        ids=ids,
        documents=docs,
        metadatas=metas,
        embeddings=doc_embeddings
    )
    return len(ids)

def get_summary_by_title(title: str) -> str:
    return FULL_SUMMARIES.get(title, "No full summary available for the requested title.")

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_summary_by_title",
            "description": "Return the full, long-form summary for an exact book title.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Exact book title (e.g., '1984')"}
                },
                "required": ["title"],
                "additionalProperties": False
            }
        }
    }
]

SYSTEM_PROMPT = """You are Smart Librarian, a helpful AI that recommends exactly ONE best-fitting book based on the user's interests.
You will receive a list of candidate books (title, short summary, themes).
- Choose ONE title and explain why it fits (2–4 sentences).
- THEN call the tool get_summary_by_title with the exact chosen title.
- After the tool returns, produce a final response including:
    1) A short recommendation (title + brief reasoning)
    2) 'Full summary:' followed by the tool's summary.
Keep it warm and concise.
"""

def retrieve_candidates(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """Query using precomputed embedding for the user query."""
    q_emb = embed_texts([query])[0]
    res = collection.query(query_embeddings=[q_emb], n_results=k)
    out = []
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    for doc, meta in zip(docs, metas):
        out.append({"document": doc, "metadata": meta})
    return out

def recommend_and_summarize(user_query: str) -> Dict[str, Any]:
    cands = retrieve_candidates(user_query, k=5)
    bullets = [f"- {c['metadata']['title']}: {c['document']}" for c in cands]

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"My interests: {user_query}"},
        {"role": "user", "content": "Candidates:\n" + "\n".join(bullets)}
    ]

    first = client.chat.completions.create(
        model=DEFAULT_CHAT_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.3,
    )

    reply = first.choices[0].message
    tool_calls = getattr(reply, "tool_calls", None)

    messages.append({
        "role": "assistant",
        "content": reply.content or "",
        "tool_calls": [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments
                }
            }
            for tc in (tool_calls or [])
        ]
    })

    final_text = reply.content or ""
    chosen_title = None
    full_summary = None

    if tool_calls:
        import json as _json
        for tc in tool_calls:
            args = _json.loads(tc.function.arguments or "{}")
            if tc.function.name == "get_summary_by_title":
                chosen_title = args.get("title")
                tool_output = get_summary_by_title(chosen_title)
                full_summary = tool_output
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.function.name,
                    "content": tool_output
                })

        second = client.chat.completions.create(
            model=DEFAULT_CHAT_MODEL,
            messages=messages,
            tools=TOOLS,
            temperature=0.2
        )
        final_text = second.choices[0].message.content

    # Fallback: infer title if no tool call happened
    if not chosen_title:
        for c in cands:
            t = c["metadata"]["title"]
            if t.lower() in (final_text or "").lower():
                chosen_title = t
                full_summary = get_summary_by_title(t)
                break

    return {
        "message": final_text,
        "chosen_title": chosen_title,
        "full_summary": full_summary
    }

# --- FastAPI app & routes ---
class QueryIn(BaseModel):
    query: str

app = FastAPI(title="Smart Librarian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/seed")
def api_seed():
    try:
        n = seed_if_empty()
        return {"ok": True, "count": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/api/seed failed: {e}")

@app.post("/api/recommend")
def api_recommend(body: QueryIn):
    try:
        seed_if_empty()
        return recommend_and_summarize(body.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/api/recommend failed: {e}")

@app.get("/api/health")
def api_health():
    return {"ok": True}

@app.get("/api/debug")
def api_debug():
    """Optional debug endpoint to validate env/files quickly."""
    return {
        "has_key": bool(OPENAI_API_KEY),
        "models_env": DEFAULT_CHAT_MODEL,
        "embed_model": EMBED_MODEL,
        "books_count": len(BOOKS),
        "db_count": collection.count(),
    }
