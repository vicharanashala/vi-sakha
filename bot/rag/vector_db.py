"""
Vector DB - Creates embeddings and stores them in ChromaDB.

Uses sentence-transformers (local, free) for embeddings.
Processes QA pairs in batches for efficiency.

Usage:
    python -m bot.rag.vector_db
"""

from sentence_transformers import SentenceTransformer
import chromadb
import json
import sys
from pathlib import Path

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from bot.config import VECTOR_DB_PATH, COLLECTION_NAME, QA_DATASET_PATH

# Local embedding model (free, no API needed)
EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"  # 1024 dimensions, top RAG quality
BATCH_SIZE = 32  # Process in batches for efficiency


def main():
    """Build the vector database from QA dataset"""
    print(f"Loading embedding model: {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)

    # Persistent Chroma DB
    chroma_client = chromadb.PersistentClient(path=str(VECTOR_DB_PATH))

    # Delete existing collection and recreate (to avoid duplicates on re-run)
    try:
        chroma_client.delete_collection(name=COLLECTION_NAME)
    except:
        pass

    collection = chroma_client.create_collection(name=COLLECTION_NAME)

    # Load QA dataset
    with open(QA_DATASET_PATH, "r", encoding="utf-8") as f:
        qa_data = json.load(f)

    print(f"Processing {len(qa_data)} QA pairs...")

    # Prepare all texts for batch embedding
    texts = [f"Question: {item['question']}\nAnswer: {item['answer']}" for item in qa_data]

    # Generate embeddings in batches
    all_embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True)

    # Add to ChromaDB
    for i, (item, embedding) in enumerate(zip(qa_data, all_embeddings)):
        collection.add(
            ids=[str(i)],
            embeddings=[embedding.tolist()],
            documents=[item["answer"]],
            metadatas=[{
                "question": item["question"],
                "source": item.get("source", "unknown")
            }]
        )

    print()
    print("Vector database created successfully")
    print(f"Total vectors: {collection.count()}")
    print(f"Embedding dimensions: {len(all_embeddings[0])}")


if __name__ == "__main__":
    main()
