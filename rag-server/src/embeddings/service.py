from sentence_transformers import SentenceTransformer
from src.config.settings import EMBEDDING_MODEL

_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model

def embed_text(text: str):
    model = get_embedding_model()
    return model.encode(text, normalize_embeddings=True).tolist()

def embed_texts(texts: list[str]):
    model = get_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]
