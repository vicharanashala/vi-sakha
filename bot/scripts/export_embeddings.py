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
from dotenv import load_dotenv

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT))
load_dotenv(PROJECT_ROOT / ".env")

from pymongo import MongoClient

OUTPUT_PATH = PROJECT_ROOT / "bot" / "data" / "embeddings.json"


def main():
    print("=" * 60)
    print("Export Embeddings to JSON")
    print("=" * 60)

    # Load from MongoDB qa_pairs_v2
    print("\nLoading from MongoDB (qa_pairs_v2)...")

    try:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/vinternship")
        db_name = uri.split("/")[-1].split("?")[0] or "vinternship"
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        docs = list(client[db_name]["qa_pairs_v2"].find(
            {}, {"question": 1, "answer": 1, "embedding": 1, "source": 1}
        ))
        client.close()
    except Exception as e:
        print(f"✗ Error loading from MongoDB: {e}")
        sys.exit(1)

    if not docs:
        print("✗ No documents found in qa_pairs_v2. Run rebuild_embeddings.py first.")
        sys.exit(1)

    print(f"✓ Loaded {len(docs)} embeddings")

    # Convert to JSON-serializable format
    print("\nConverting to JSON format...")

    embeddings_json = []
    for doc in docs:
        embeddings_json.append({
            "id": str(doc["_id"]),
            "embedding": doc.get("embedding", []),
            "question": doc.get("question", ""),
            "source": doc.get("source", "unknown"),
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
