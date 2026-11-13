import io
import re
from pypdf import PdfReader

# Master list of technical skills to extract
TECH_SKILLS = [
    "Python", "FastAPI", "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB",
    "SQL", "AsyncPG", "SQLAlchemy", "Redis", "Docker", "Kubernetes", "Git",
    "GitHub", "CI/CD", "GitHub Actions", "AWS", "Linux", "REST API", "GraphQL",
    "Microservices", "Celery", "Pytest", "React", "Next.js", "JavaScript",
    "TypeScript", "Node.js", "HTML", "CSS", "Tailwind CSS", "Machine Learning",
    "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "OpenCV",
    "LangChain", "RAG", "pgvector", "Model Context Protocol", "System Design"
]

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + " "
    return text

def extract_skills(text: str) -> list[str]:
    found_skills = []
    text_lower = text.lower()
    for skill in TECH_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    return sorted(list(set(found_skills)))