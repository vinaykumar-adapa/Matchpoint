import asyncio
from app.database import AsyncSessionLocal
from app.models import Job
from app.services.embedder import generate_embedding

JOBS = [
    {
        "title": "Junior Python Developer",
        "company": "Infosys",
        "description": "Looking for entry-level backend engineers skilled in Python, FastAPI, relational databases, and clean Git workflows.",
        "skills": ["Python", "FastAPI", "SQL", "Git"]
    },
    {
        "title": "Backend Software Engineer",
        "company": "Swiggy",
        "description": "Develop high-throughput REST APIs using FastAPI, async connection pooling with AsyncPG, and PostgreSQL database optimizations.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "AsyncPG", "Docker"]
    },
    {
        "title": "Full Stack Engineer (Python/React)",
        "company": "TCS Digital",
        "description": "Work across React frontends and Python FastAPI backends, building modern web applications with Docker and Linux.",
        "skills": ["Python", "React", "JavaScript", "FastAPI", "Docker", "Linux"]
    }
]

async def seed():
    async with AsyncSessionLocal() as session:
        for item in JOBS:
            content = f"{item['title']} {item['description']} {' '.join(item['skills'])}"
            embedding = generate_embedding(content)
            job = Job(
                title=item["title"],
                company=item["company"],
                description=item["description"],
                required_skills=item["skills"],
                embedding=embedding
            )
            session.add(job)
        await session.commit()
        print("Jobs seeded successfully with vector embeddings.")

if __name__ == "__main__":
    asyncio.run(seed())