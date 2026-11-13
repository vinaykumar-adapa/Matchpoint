import numpy as np
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.database import engine, Base, get_db
from app import models, schemas, auth
from app.services import parser, embedder

app = FastAPI(title="MatchPoint API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Role Blueprints for Real-Time Career Role Suggestion
ROLE_PROFILES = [
    {
        "role": "Python Backend Developer",
        "summary": "Build scalable asynchronous REST APIs, database schemas, authentication, and server-side services using Python, FastAPI, and PostgreSQL.",
        "core_skills": ["Python", "FastAPI", "PostgreSQL", "SQL", "AsyncPG", "Docker", "Git", "REST API", "Pytest"]
    },
    {
        "role": "Full-Stack Software Engineer",
        "summary": "Develop end-to-end web applications combining modern React frontends with Python backend APIs and relational databases.",
        "core_skills": ["Python", "FastAPI", "React", "JavaScript", "TypeScript", "PostgreSQL", "HTML", "CSS", "Tailwind CSS", "Docker", "Git"]
    },
    {
        "role": "AI Systems & Agentic Engineer",
        "summary": "Architect LLM tool-calling servers, Model Context Protocol (MCP) integrations, RAG pipelines, and semantic vector search engines.",
        "core_skills": ["Python", "FastAPI", "Model Context Protocol", "LangChain", "RAG", "pgvector", "PostgreSQL", "Docker", "REST API"]
    },
    {
        "role": "Backend & Distributed Systems Engineer",
        "summary": "Design high-throughput microservices, asynchronous background task queues, caching layers, and containerized deployments.",
        "core_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker", "Microservices", "Linux", "CI/CD"]
    },
    {
        "role": "Cloud & DevOps Associate Engineer",
        "summary": "Manage cloud infrastructure, Linux servers, container orchestration, automated CI/CD testing pipelines, and deployment security.",
        "core_skills": ["AWS", "Docker", "Kubernetes", "Linux", "Git", "GitHub Actions", "CI/CD", "Python"]
    },
    {
        "role": "Machine Learning Engineer",
        "summary": "Train, evaluate, and deploy predictive ML and computer vision models into production APIs.",
        "core_skills": ["Python", "Machine Learning", "Scikit-learn", "TensorFlow", "PyTorch", "OpenCV", "FastAPI", "Docker", "SQL"]
    }
]

def cosine_sim(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom != 0 else 0.0

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(Base.metadata.create_all)

# --- AUTH ROUTES ---
@app.post("/api/auth/register")
async def register(user_data: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        email=user_data.email,
        hashed_password=auth.hash_password(user_data.password)
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
async def login(credentials: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == credentials.email))
    user = result.scalars().first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# --- RESUME ROUTES ---
@app.post("/api/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    raw_text = parser.extract_text_from_pdf(contents)
    skills = parser.extract_skills(raw_text)
    vector_embed = embedder.generate_embedding(raw_text)

    resume = models.Resume(
        user_id=current_user.id,
        filename=file.filename,
        raw_text=raw_text,
        skills=skills,
        embedding=vector_embed
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return {"id": resume.id, "skills": skills, "filename": resume.filename}

@app.get("/api/resumes/latest")
async def get_latest_resume(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_query = await db.execute(
        select(models.Resume)
        .where(models.Resume.user_id == current_user.id)
        .order_by(models.Resume.uploaded_at.desc())
    )
    resume = res_query.scalars().first()
    if not resume:
        return None
    return {"id": resume.id, "filename": resume.filename, "skills": resume.skills}

# --- FEATURE 1: DESCRIBE SKILLS -> SUGGEST ROLES & MISSING SKILLS ---
@app.post("/api/roles/suggest")
async def suggest_roles(
    payload: schemas.SkillSuggestRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    user_skills = parser.extract_skills(payload.description)
    user_vec = embedder.generate_embedding(payload.description)
    user_skills_set = set(user_skills)

    suggestions = []
    for item in ROLE_PROFILES:
        role_text = f"{item['role']} {item['summary']} {' '.join(item['core_skills'])}"
        role_vec = embedder.generate_embedding(role_text)
        semantic_score = cosine_sim(user_vec, role_vec)

        core_set = set(item["core_skills"])
        matched = sorted(list(core_set.intersection(user_skills_set)))
        missing = sorted(list(core_set - user_skills_set))

        skill_ratio = len(matched) / len(core_set) if core_set else 0
        combined_score = round(((semantic_score * 0.6) + (skill_ratio * 0.4)) * 100, 1)

        suggestions.append({
            "role": item["role"],
            "summary": item["summary"],
            "fit_score": min(combined_score, 99.0),
            "matched_skills": matched,
            "missing_skills": missing
        })

    suggestions.sort(key=lambda x: x["fit_score"], reverse=True)
    return {"detected_skills": user_skills, "roles": suggestions}

# --- FEATURE 2: REAL-TIME RESUME VS JOB DESCRIPTION MATCHER ---
@app.post("/api/jobs/analyze-jd")
async def analyze_job_description(
    payload: schemas.JDMatchRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_query = await db.execute(
        select(models.Resume)
        .where(models.Resume.user_id == current_user.id)
        .order_by(models.Resume.uploaded_at.desc())
    )
    resume = res_query.scalars().first()
    if not resume:
        raise HTTPException(status_code=400, detail="Please upload your PDF resume first to compare against a job description.")

    jd_full_text = f"{payload.job_title} at {payload.company}. {payload.job_description}"
    jd_vec = embedder.generate_embedding(jd_full_text)
    jd_skills = parser.extract_skills(jd_full_text)

    semantic_score = cosine_sim(list(resume.embedding), jd_vec)
    user_skills_set = set(resume.skills)
    jd_skills_set = set(jd_skills)

    matched_skills = sorted(list(jd_skills_set.intersection(user_skills_set)))
    missing_skills = sorted(list(jd_skills_set - user_skills_set))

    keyword_ratio = (len(matched_skills) / len(jd_skills_set)) if jd_skills_set else semantic_score
    ats_score = round(((semantic_score * 0.55) + (keyword_ratio * 0.45)) * 100, 1)

    saved_job_id = None
    if payload.save_to_board:
        new_job = models.Job(
            title=payload.job_title,
            company=payload.company,
            description=payload.job_description,
            required_skills=jd_skills,
            embedding=jd_vec
        )
        db.add(new_job)
        await db.commit()
        await db.refresh(new_job)
        saved_job_id = new_job.id

        new_app = models.Application(user_id=current_user.id, job_id=new_job.id, status="WISHLIST")
        db.add(new_app)
        await db.commit()

    return {
        "job_title": payload.job_title,
        "company": payload.company,
        "ats_score": min(ats_score, 99.0),
        "semantic_similarity": round(semantic_score * 100, 1),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "saved_to_tracker": payload.save_to_board,
        "job_id": saved_job_id
    }

# --- VECTOR MATCHING & APPLICATIONS ---
@app.get("/api/jobs/matched")
async def get_matched_jobs(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_query = await db.execute(
        select(models.Resume)
        .where(models.Resume.user_id == current_user.id)
        .order_by(models.Resume.uploaded_at.desc())
    )
    resume = res_query.scalars().first()
    if not resume:
        return []

    query = text("""
        SELECT id, title, company, description, required_skills,
               1 - (embedding <=> :resume_vec) AS similarity_score
        FROM jobs
        ORDER BY similarity_score DESC
        LIMIT 10;
    """)
    result = await db.execute(query, {"resume_vec": str(resume.embedding)})
    
    matches = []
    user_skills_set = set(resume.skills)
    for row in result:
        job_skills = set(row.required_skills)
        matched_skills = list(job_skills.intersection(user_skills_set))
        missing_skills = list(job_skills - user_skills_set)
        matches.append({
            "id": row.id,
            "title": row.title,
            "company": row.company,
            "description": row.description,
            "match_score": round(float(row.similarity_score) * 100, 1),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills
        })
    return matches

@app.post("/api/applications")
async def create_application(
    job_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(models.Application).where(
            models.Application.user_id == current_user.id,
            models.Application.job_id == job_id
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Job already in tracker")

    new_app = models.Application(user_id=current_user.id, job_id=job_id, status="WISHLIST")
    db.add(new_app)
    await db.commit()
    return {"message": "Added to tracker"}

@app.get("/api/applications")
async def get_applications(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Application, models.Job).join(models.Job).where(models.Application.user_id == current_user.id)
    result = await db.execute(query)
    apps = []
    for app_row, job_row in result:
        apps.append({
            "id": app_row.id,
            "status": app_row.status,
            "job_id": job_row.id,
            "title": job_row.title,
            "company": job_row.company
        })
    return apps

@app.patch("/api/applications/{app_id}/status")
async def update_application_status(
    app_id: int,
    status_update: schemas.StatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Application).where(
            models.Application.id == app_id, 
            models.Application.user_id == current_user.id
        )
    )
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found")
    
    application.status = status_update.status
    await db.commit()
    return {"message": "Status updated successfully"}