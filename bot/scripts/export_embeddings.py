"""
Export Embeddings from ChromaDB to JSON

Exports embeddings to JSON format for NestJS backend to read.

Usage:
    python bot/scripts/export_embeddings.py
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT / "bot"))

import chromadb

# Configuration
VECTOR_DB_PATH = PROJECT_ROOT / "vector_db"
COLLECTION_NAME = "vinternship_faq"
OUTPUT_PATH = PROJECT_ROOT / "bot" / "data" / "embeddings.json"


def main():
    print("=" * 60)
    print("Export Embeddings to JSON")
    print("=" * 60)
    
    # Load from ChromaDB
    print(f"\nLoading from ChromaDB: {VECTOR_DB_PATH}")
    
    if not VECTOR_DB_PATH.exists():
        print(f"✗ Vector DB not found: {VECTOR_DB_PATH}")
        print("Run: python bot/rag/vector_db.py first")
        sys.exit(1)
    
    try:
        chroma_client = chromadb.PersistentClient(path=str(VECTOR_DB_PATH))
        collection = chroma_client.get_collection(COLLECTION_NAME)
        
        # Get all data
        all_data = collection.get(
            include=["documents", "metadatas", "embeddings"]
        )
        
        print(f"✓ Loaded {len(all_data['ids'])} embeddings")
        
    except Exception as e:
        print(f"✗ Error loading ChromaDB: {e}")
        sys.exit(1)
    
    # Convert to JSON-serializable format
    print("\nConverting to JSON format...")
    
    embeddings_json = []
    for i, (id_, embedding, metadata) in enumerate(zip(
        all_data["ids"],
        all_data["embeddings"],
        all_data["metadatas"]
    )):
        embeddings_json.append({
            "id": id_,
            "embedding": embedding,  # Already a list
            "question": metadata.get("question", ""),
            "source": metadata.get("source", "unknown")
        })
    
    # Save to JSON
    print(f"\nSaving to: {OUTPUT_PATH}")
    
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(embeddings_json, f, indent=2)
    
    file_size = OUTPUT_PATH.stat().st_size / (1024 * 1024)  # MB
    
    print(f"✓ Saved {len(embeddings_json)} embeddings")
    print(f"  File size: {file_size:.2f} MB")
    print(f"  Dimensions: {len(embeddings_json[0]['embedding'])}")
    
    print("\n" + "=" * 60)
    print("Export Complete!")
    print("=" * 60)
    print(f"Now run: cd backend && npm run seed")
    print("=" * 60)


if __name__ == "__main__":
    main()
