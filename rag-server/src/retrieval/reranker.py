from sentence_transformers import CrossEncoder
from src.config.settings import RERANKER_MODEL

_reranker_model = None

def get_reranker_model():
    global _reranker_model
    if _reranker_model is None:
        try:
            _reranker_model = CrossEncoder(RERANKER_MODEL)
        except Exception as e:
            print(f"⚠️ Reranker load failed (likely corrupted cache): {e}")
            print("🚀 Self-healing: Programmatically clearing corrupted local cache...")
            try:
                from pathlib import Path
                import shutil
                cache_dir = Path.home() / ".cache" / "huggingface" / "hub" / f"models--{RERANKER_MODEL.replace('/', '--')}"
                if cache_dir.exists():
                    shutil.rmtree(cache_dir)
                    print(f"🧹 Corrupted cache directory cleared: {cache_dir}")
            except Exception as clean_err:
                print(f"❌ Failed to clear cache directory: {clean_err}")
            _reranker_model = CrossEncoder(RERANKER_MODEL)
    return _reranker_model

def rerank_query(query: str, documents: list[str], top_n: int = 5):
    model = get_reranker_model()
    pairs = [[query, doc] for doc in documents]
    scores = model.predict(pairs)
    results = [{"index": i, "score": float(s)} for i, s in enumerate(scores)]
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]
