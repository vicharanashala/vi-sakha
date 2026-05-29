"""
Rebuild embeddings pipeline using BAAI/bge-small-en-v1.5.

Merges data from:
  1. Local bot/data/qa_dataset.json
  2. LibreChat MongoDB (faq_boocamp.questions + faq_bootcamp.questions)

Deduplicates by question text, generates 384-dim embeddings, and stores
results in the personal MongoDB under the `qa_pairs_v2` collection.

Usage:
    python -m bot.scripts.rebuild_embeddings          # append / skip existing
    python -m bot.scripts.rebuild_embeddings --refresh  # clear and rebuild
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths & env
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
load_dotenv(ENV_FILE)

QA_DATASET_PATH = PROJECT_ROOT / "bot" / "data" / "qa_dataset.json"

MONGODB_URI = os.getenv("MONGODB_URI")
LIBRECHAT_MONGODB_URI = os.getenv("LIBRECHAT_MONGODB_URI")

TARGET_COLLECTION = "qa_pairs_v2"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
BATCH_SIZE = 32


# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------

def load_local_qa() -> list[dict]:
    """Load Q&A pairs from bot/data/qa_dataset.json."""
    if not QA_DATASET_PATH.exists():
        print(f"[warn] {QA_DATASET_PATH} not found — skipping local data")
        return []

    with open(QA_DATASET_PATH, encoding="utf-8") as f:
        data = json.load(f)

    records = []
    for item in data:
        q = (item.get("question") or "").strip()
        a = (item.get("answer") or "").strip()
        if q and a:
            records.append({
                "question": q,
                "answer": a,
                "category": item.get("category") or item.get("topic") or "General",
                "source": "local",
            })

    print(f"[local] loaded {len(records)} records from qa_dataset.json")
    return records


def load_mongo_qa() -> list[dict]:
    """Load Q&A pairs from both faq_boocamp and faq_bootcamp LibreChat databases."""
    if not LIBRECHAT_MONGODB_URI:
        print("[warn] LIBRECHAT_MONGODB_URI not set — skipping LibreChat data")
        return []

    try:
        from pymongo import MongoClient
    except ImportError:
        print("[warn] pymongo not installed — skipping LibreChat data")
        return []

    client = MongoClient(LIBRECHAT_MONGODB_URI, serverSelectionTimeoutMS=5000)
    records = []

    # Both spellings of the database name
    for db_name in ("faq_boocamp", "faq_bootcamp"):
        try:
            db = client[db_name]
            docs = list(db["questions"].find({}))
            for doc in docs:
                q = (doc.get("question") or "").strip()
                a = (doc.get("answer") or "").strip()
                if q and a:
                    records.append({
                        "question": q,
                        "answer": a,
                        "category": doc.get("category") or doc.get("topic") or "General",
                        "source": "mongo",
                    })
            print(f"[mongo] {db_name}.questions — {len(docs)} docs fetched")
        except Exception as exc:
            print(f"[warn] could not read {db_name}.questions: {exc}")

    client.close()
    print(f"[mongo] total records from LibreChat: {len(records)}")
    return records


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def deduplicate(records: list[dict]) -> list[dict]:
    """Deduplicate by lowercased/stripped question text. First occurrence wins."""
    seen: set[str] = set()
    unique = []
    for rec in records:
        key = rec["question"].lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(rec)
    removed = len(records) - len(unique)
    print(f"[dedup] {len(unique)} unique records ({removed} duplicates removed)")
    return unique


# ---------------------------------------------------------------------------
# Embedding generation
# ---------------------------------------------------------------------------

def generate_embeddings(records: list[dict]) -> list[list[float]]:
    """Generate 384-dim BGE-small embeddings for each record."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("[error] sentence-transformers not installed. Run: pip install sentence-transformers")
        sys.exit(1)

    print(f"[embed] loading model {EMBEDDING_MODEL} ...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    texts = [f"{r['question']} {r['answer']}" for r in records]
    print(f"[embed] encoding {len(texts)} texts (batch_size={BATCH_SIZE}) ...")

    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    print(f"[embed] done — shape {embeddings.shape}")
    return embeddings.tolist()


# ---------------------------------------------------------------------------
# MongoDB storage
# ---------------------------------------------------------------------------

def store_to_mongodb(records: list[dict], embeddings: list[list[float]], refresh: bool) -> None:
    if not MONGODB_URI:
        print("[error] MONGODB_URI not set")
        sys.exit(1)

    try:
        from pymongo import MongoClient, UpdateOne
    except ImportError:
        print("[error] pymongo not installed. Run: pip install pymongo")
        sys.exit(1)

    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    db_name = client.get_default_database().name if "/" in MONGODB_URI.rstrip("/").split("@")[-1] else "vinternship"

    # Resolve db name from URI (path after last /)
    uri_path = MONGODB_URI.split("/")[-1].split("?")[0]
    db_name = uri_path if uri_path else "vinternship"

    db = client[db_name]
    collection = db[TARGET_COLLECTION]

    if refresh:
        deleted = collection.delete_many({}).deleted_count
        print(f"[store] --refresh: cleared {deleted} existing documents from {TARGET_COLLECTION}")

    now = datetime.now(timezone.utc)
    dimensions = len(embeddings[0]) if embeddings else 0

    ops = []
    for rec, emb in zip(records, embeddings):
        doc = {
            "question": rec["question"],
            "answer": rec["answer"],
            "category": rec["category"],
            "embedding": emb,
            "source": rec["source"],
            "model": EMBEDDING_MODEL,
            "dimensions": dimensions,
            "created_at": now,
        }
        ops.append(
            UpdateOne(
                {"question": rec["question"]},
                {"$setOnInsert": doc},
                upsert=True,
            )
        )

    if ops:
        result = collection.bulk_write(ops, ordered=False)
        print(
            f"[store] upserted {result.upserted_count} new, "
            f"matched {result.matched_count} existing "
            f"in {db_name}.{TARGET_COLLECTION}"
        )
    else:
        print("[store] no records to write")

    client.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild Q&A embeddings (bge-small-en-v1.5)")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Clear existing qa_pairs_v2 documents before rebuilding",
    )
    args = parser.parse_args()

    print("=== rebuild_embeddings.py ===")
    print(f"model      : {EMBEDDING_MODEL}")
    print(f"collection : {TARGET_COLLECTION}")
    print(f"refresh    : {args.refresh}")
    print()

    # 1. Load data
    local_records = load_local_qa()
    mongo_records = load_mongo_qa()

    all_records = local_records + mongo_records
    if not all_records:
        print("[error] no records loaded from any source — aborting")
        sys.exit(1)

    # 2. Deduplicate (local wins over mongo for same question)
    unique_records = deduplicate(all_records)

    # 3. Generate embeddings
    embeddings = generate_embeddings(unique_records)

    # 4. Store to MongoDB
    store_to_mongodb(unique_records, embeddings, refresh=args.refresh)

    print("\n[done] rebuild complete")


if __name__ == "__main__":
    main()
