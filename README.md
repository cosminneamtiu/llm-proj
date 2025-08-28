# Smart Librarian — Fullstack (FastAPI + Ionic React)

## Requirements
- Python 3.10+
- Node 18+ / npm
- An OpenAI API key

## 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # paste your real OPENAI_API_KEY in .env
uvicorn server:app --host 0.0.0.0 --port 8000 --reload


\