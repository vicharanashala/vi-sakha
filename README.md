# Vi-Sakha - Vinternship Support System

AI-powered student query resolution system for Vinternship Discord support.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: NestJS + MongoDB Atlas
- **AI/RAG**: Python + ChromaDB + OpenAI Embeddings
- **Bot**: Discord.js

## Project Structure

```
├── backend/          # NestJS API server
├── frontend/         # React dashboard
├── bot/              # Discord bot
├── pipeline/         # Python RAG pipeline
└── vector_db/        # ChromaDB storage
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas account

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure MongoDB URI
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Python Pipeline
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

## Environment Variables

Create `.env` files in root and backend folders:

```env
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
DISCORD_BOT_TOKEN=...
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/qa-pairs` | GET | List Q&A pairs |
| `/api/qa-proposals` | GET/POST | Manage proposals |
| `/api/qa-proposals/:id/approve` | PATCH | Approve proposal |
| `/api/embeddings/search` | POST | Semantic search |

## License

MIT
