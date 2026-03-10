# Vinternship Backend API

NestJS backend for the Vinternship Support System.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Python data exported (QA pairs + embeddings)

## Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI
   ```

3. **Export embeddings from ChromaDB (Python)**
   ```bash
   # From project root
   python bot/scripts/export_embeddings.py
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm run start:dev
   ```

## API Endpoints

### QA Pairs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/qa-pairs` | List all QA pairs |
| GET | `/api/qa-pairs/:id` | Get single QA pair |
| GET | `/api/qa-pairs/search?q=query` | Text search |
| GET | `/api/qa-pairs/count` | Get total count |
| GET | `/api/qa-pairs/source/:source` | Filter by source |

### Embeddings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/embeddings` | List embeddings (without vectors) |
| GET | `/api/embeddings/:id` | Get embedding with vector |
| GET | `/api/embeddings/metadata` | Get dimensions/count |
| GET | `/api/embeddings/qa/:qaPairId` | Get by QA pair ID |

## Data Flow

```
ChromaDB (vector_db/)
    ↓
Python: export_embeddings.py
    ↓
JSON: bot/data/embeddings.json
    ↓
NestJS: npm run seed
    ↓
MongoDB (vinternship db)
    ↓
API endpoints
```

## Alternative: Direct Python to MongoDB

If you prefer skipping the JSON step:

```bash
# Install pymongo
pip install pymongo

# Export directly to MongoDB
python bot/scripts/export_to_mongodb.py
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start production server |
| `npm run start:dev` | Start with hot reload |
| `npm run seed` | Seed database from JSON |
| `npm run build` | Build for production |

## Collections

- `qa_pairs` - Question-answer pairs
- `embeddings` - Vector embeddings
- `metadata` - System info

## Tech Stack

- NestJS 10
- MongoDB + Mongoose
- TypeScript
