"""
Export QA Dataset and Embeddings to MongoDB

Reads QA pairs from qa_dataset.json and embeddings from ChromaDB,
then stores everything in MongoDB for use by NestJS backend.

Collections created:
- qa_pairs: Question-answer pairs with metadata
- embeddings: Vector embeddings for semantic search

Usage:
    python bot/scripts/export_to_mongodb.py
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT / "bot"))

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import chromadb

# Load environment
load_dotenv(PROJECT_ROOT / ".env")

# Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/vinternship")
QA_DATASET_PATH = PROJECT_ROOT / "bot" / "data" / "qa_dataset.json"
VECTOR_DB_PATH = PROJECT_ROOT / "vector_db"
COLLECTION_NAME = "vinternship_faq"


def connect_mongodb():
    """Connect to MongoDB and return database reference"""
    print(f"Connecting to MongoDB: {MONGODB_URI}")
    
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        print("✓ MongoDB connection successful")
        
        # Get database name from URI or use default
        db_name = MONGODB_URI.split("/")[-1].split("?")[0] or "vinternship"
        return client[db_name]
    except ConnectionFailure as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("\nMake sure MongoDB is running:")
        print("  - Local: mongod --dbpath <path>")
        print("  - Docker: docker run -d -p 27017:27017 mongo")
        sys.exit(1)


def load_qa_dataset():
    """Load QA pairs from JSON file"""
    print(f"\nLoading QA dataset from: {QA_DATASET_PATH}")
    
    if not QA_DATASET_PATH.exists():
        print(f"✗ File not found: {QA_DATASET_PATH}")
        sys.exit(1)
    
    with open(QA_DATASET_PATH, "r", encoding="utf-8") as f:
        qa_data = json.load(f)
    
    print(f"✓ Loaded {len(qa_data)} QA pairs")
    return qa_data


def load_embeddings_from_mongodb():
    """Load embeddings from qa_pairs_v2 MongoDB collection"""
    print(f"\nLoading embeddings from MongoDB (qa_pairs_v2)...")

    try:
        from pymongo import MongoClient
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/vinternship")
        db_name = uri.split("/")[-1].split("?")[0] or "vinternship"
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        collection = client[db_name]["qa_pairs_v2"]

        docs = list(collection.find({}, {"question": 1, "answer": 1, "embedding": 1, "source": 1}))
        client.close()

        if not docs:
            print("⚠ No documents found in qa_pairs_v2")
            return None

        # Return in a shape compatible with the rest of this script
        all_data = {
            "ids": [str(d["_id"]) for d in docs],
            "embeddings": [d.get("embedding", []) for d in docs],
            "metadatas": [{"question": d.get("question", ""), "source": d.get("source", "mongo")} for d in docs],
        }
        print(f"✓ Loaded {len(docs)} embeddings from qa_pairs_v2")
        return all_data
    except Exception as e:
        print(f"✗ Error loading from MongoDB: {e}")
        return None


def create_indexes(db):
    """Create MongoDB indexes for efficient querying"""
    print("\nCreating indexes...")
    
    # QA Pairs collection indexes
    db.qa_pairs.create_index("source")
    db.qa_pairs.create_index([("question", "text"), ("answer", "text")])
    
    # Embeddings collection indexes
    db.embeddings.create_index("qa_pair_id")
    db.embeddings.create_index("source")
    
    print("✓ Indexes created")


def export_qa_pairs(db, qa_data):
    """Export QA pairs to MongoDB"""
    print("\nExporting QA pairs to MongoDB...")
    
    # Clear existing data
    db.qa_pairs.delete_many({})
    
    # Prepare documents with timestamps
    documents = []
    for i, item in enumerate(qa_data):
        doc = {
            "_id": str(i),
            "question": item["question"],
            "answer": item["answer"],
            "source": item.get("source", "unknown"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        documents.append(doc)
    
    # Bulk insert
    if documents:
        result = db.qa_pairs.insert_many(documents)
        print(f"✓ Inserted {len(result.inserted_ids)} QA pairs")
    else:
        print("✗ No QA pairs to insert")


def export_embeddings(db, chroma_data, qa_data):
    """Export embeddings to MongoDB"""
    print("\nExporting embeddings to MongoDB...")
    
    if not chroma_data:
        print("⚠ No embeddings to export. Skipping...")
        return
    
    # Clear existing data
    db.embeddings.delete_many({})
    
    # Prepare documents
    documents = []
    for i, (id_, embedding, metadata) in enumerate(zip(
        chroma_data["ids"],
        chroma_data["embeddings"],
        chroma_data["metadatas"]
    )):
        # Match with QA pair
        qa_index = int(id_) if id_.isdigit() else i
        qa_pair = qa_data[qa_index] if qa_index < len(qa_data) else {}
        
        # Convert numpy array to list for BSON serialization
        embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)
        
        doc = {
            "_id": id_,
            "qa_pair_id": id_,
            "embedding": embedding_list,  # Store as list (BSON compatible)
            "question": metadata.get("question", qa_pair.get("question", "")),
            "source": metadata.get("source", qa_pair.get("source", "unknown")),
            "dimensions": len(embedding_list),
            "createdAt": datetime.utcnow()
        }
        documents.append(doc)
    
    # Bulk insert
    if documents:
        result = db.embeddings.insert_many(documents)
        print(f"✓ Inserted {len(result.inserted_ids)} embeddings")
        print(f"  Embedding dimensions: {documents[0]['dimensions']}")
    else:
        print("✗ No embeddings to insert")


def create_metadata_collection(db, qa_data, chroma_data):
    """Create metadata collection with stats"""
    print("\nCreating metadata collection...")
    
    db.metadata.delete_many({})
    
    # Calculate embedding dimensions safely
    embedding_dims = 0
    if chroma_data and len(chroma_data.get("embeddings", [])) > 0:
        first_embedding = chroma_data["embeddings"][0]
        embedding_dims = len(first_embedding) if hasattr(first_embedding, '__len__') else 0
    
    metadata = {
        "_id": "system_info",
        "qa_pairs_count": len(qa_data),
        "embeddings_count": len(chroma_data["ids"]) if chroma_data else 0,
        "embedding_dimensions": embedding_dims,
        "embedding_model": "BAAI/bge-small-en-v1.5",
        "llm_model": "claude-haiku-4-5-20251001",
        "last_updated": datetime.utcnow(),
        "version": "1.0.0"
    }
    
    db.metadata.insert_one(metadata)
    print("✓ Metadata collection created")


def main():
    """Main export function"""
    print("=" * 60)
    print("MongoDB Data Export - Vinternship Support System")
    print("=" * 60)
    
    # Connect to MongoDB
    db = connect_mongodb()
    
    # Load data
    qa_data = load_qa_dataset()
    chroma_data = load_embeddings_from_mongodb()
    
    # Create indexes
    create_indexes(db)
    
    # Export data
    export_qa_pairs(db, qa_data)
    export_embeddings(db, chroma_data, qa_data)
    create_metadata_collection(db, qa_data, chroma_data)
    
    # Summary
    print("\n" + "=" * 60)
    print("Export Complete!")
    print("=" * 60)
    print(f"Database: {db.name}")
    print(f"Collections: qa_pairs, embeddings, metadata")
    print(f"QA Pairs: {db.qa_pairs.count_documents({})}")
    print(f"Embeddings: {db.embeddings.count_documents({})}")
    print("=" * 60)


if __name__ == "__main__":
    main()
