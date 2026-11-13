from sentence_transformers import SentenceTransformer

# Load once into memory
model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embedding(text: str) -> list[float]:
    # Clean whitespace and encode
    cleaned = " ".join(text.split())
    embedding = model.encode(cleaned)
    return embedding.tolist()