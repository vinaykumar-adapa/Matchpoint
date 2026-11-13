# 🎯 MatchPoint — AI Career Intelligence & Application Pipeline

**MatchPoint** is a full-stack semantic resume matcher, career role advisor, and job tracking platform built with **FastAPI**, **PostgreSQL (`pgvector`)**, **React**, and **Docker**. Unlike basic keyword filters, MatchPoint uses dense vector embeddings to understand context, measure resume-to-job compatibility, surface skill gaps, and organize applications across a 5-stage pipeline.

---

## ✨ Key Features

- **🔐 Secure Multi-User Authentication:** User registration and login powered by JWT (JSON Web Tokens) and `bcrypt` password hashing with isolated user data.
- **📄 Resume Vector Engine:** Parses uploaded PDF resumes, extracts technical skills automatically, and generates 384-dimensional embeddings (`all-MiniLM-L6-v2`) stored in PostgreSQL `pgvector`.
- **✨ Skill → Role Finder:** Evaluates natural-language skill descriptions against software & AI role blueprints, ranking top career matches and highlighting **missing skills** to bridge gaps.
- **🔍 Live Job Description (JD) Matcher:** Compares any pasted job posting against the user's active resume using cosine similarity and keyword overlap scoring, with one-click saving to the tracker[cite: 13].
- **📊 5-Stage Application Pipeline:** Interactive Kanban-style status board (`WISHLIST` → `APPLIED` → `INTERVIEWING` → `OFFER` → `REJECTED`) persisted in PostgreSQL[cite: 13].

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.11, FastAPI, Uvicorn, SQLAlchemy (Async), AsyncPG |
| **AI & Vector Search** | PostgreSQL 16 + `pgvector`, `sentence-transformers` (`all-MiniLM-L6-v2`), NumPy, `pypdf` |
| **Frontend** | React (Vite), Tailwind CSS, Axios, Lucide React |
| **Security & DevOps** | JWT (`python-jose`), `passlib` (`bcrypt`), Docker, Docker Compose |

---

## 📂 Project Structure

```text
matchpoint/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── embedder.py      # Sentence-transformer vector generator
│   │   │   └── parser.py        # PDF text extraction & skill scanner
│   │   ├── auth.py              # JWT creation, verification & password hashing
│   │   ├── config.py            # Environment & database configuration
│   │   ├── database.py          # Async SQLAlchemy & pgvector session setup
│   │   ├── main.py              # FastAPI routes & semantic matching endpoints
│   │   ├── models.py            # PostgreSQL ORM models (User, Resume, Job, Application)
│   │   └── schemas.py           # Pydantic request/response validation schemas
│   ├── Dockerfile               # Backend container configuration
│   ├── requirements.txt         # Python dependencies
│   └── seed_jobs.py             # Optional sample job seeding script
├── frontend/
│   ├── src/
│   │   ├── api.js               # Axios client with automatic JWT interceptor
│   │   ├── App.jsx              # Main dashboard, Role Finder, JD Matcher & Pipeline UI
│   │   └── main.jsx             # React entry point
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite bundler configuration
├── docker-compose.yml           # Orchestrates PostgreSQL (pgvector) & FastAPI backend
├── .gitignore                   # Excludes virtual environments, node_modules & secrets
└── README.md                    # Project documentation

🚀 How to Run Locally
Prerequisites
Docker Desktop installed and running

Node.js (v18+) installed

1. Clone the Repository
2. Start the Database & FastAPI Backend
Bash
docker compose up --build -d

(Optional) Seed sample job postings into PostgreSQL:

Bash
docker exec -it matchpoint-backend python seed_jobs.py
Interactive API Docs (Swagger UI): http://127.0.0.1:8000/docs

3. Start the React Frontend
Bash
cd frontend
npm install
npm run dev
⭐ Support
If you found MatchPoint useful or inspiring for your own AI/backend projects, consider giving this repository a Star ⭐ on GitHub!