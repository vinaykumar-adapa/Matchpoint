FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" sqlalchemy asyncpg pgvector \
    pydantic pydantic-settings email-validator \
    "python-jose[cryptography]" "passlib[bcrypt]" "bcrypt==4.0.1" \
    python-multipart pypdf sentence-transformers

RUN pip install --no-cache-dir greenlet

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
