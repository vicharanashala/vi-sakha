"""
RAG API Service - FastAPI wrapper for the chatbot.

Run with: uvicorn bot.rag.api:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid

from chatbot import ChatSession, validate_input, preprocess_query, retrieve_context, generate_answer

app = FastAPI(
    title="Vi-Sakha RAG API",
    description="RAG chatbot API for Vinternship support",
    version="1.0.0"
)

# CORS for NestJS backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (for production, use Redis)
sessions: Dict[str, ChatSession] = {}

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class Source(BaseModel):
    question: str
    answer: str
    score: float
    source: str

class ChatResponse(BaseModel):
    answer: str
    confidence: float
    sources: List[Source]
    status: str  # 'answered' | 'escalated' | 'error'
    session_id: str
    response_time_ms: int

class HealthResponse(BaseModel):
    status: str
    version: str

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the RAG chatbot.
    
    - Creates a new session if session_id not provided
    - Returns answer with confidence score and sources
    """
    start_time = time.time()
    
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    
    if session_id not in sessions:
        sessions[session_id] = ChatSession()
    
    session = sessions[session_id]
    
    # If conversation history provided, restore it
    if request.conversation_history:
        session.history = request.conversation_history
    
    try:
        # Validate input
        is_valid, error_msg = validate_input(request.message)
        if not is_valid:
            return ChatResponse(
                answer=error_msg,
                confidence=0.0,
                sources=[],
                status="error",
                session_id=session_id,
                response_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Preprocess
        clean_question = preprocess_query(request.message)
        
        # Retrieve context
        context, results, max_score = retrieve_context(clean_question)
        
        # Generate response
        answer = generate_answer(
            clean_question,
            context,
            max_score,
            session.history
        )
        
        # Update session history
        session.history.append({"role": "user", "content": request.message})
        session.history.append({"role": "assistant", "content": answer})
        session.query_count += 1
        
        # Build sources list
        sources = [
            Source(
                question=r.get("question", ""),
                answer=r.get("answer", ""),
                score=r.get("score", 0.0),
                source=r.get("source", "unknown")
            )
            for r in results
        ]
        
        # Determine status
        status = "answered" if max_score >= 0.45 else "escalated"
        
        response_time = int((time.time() - start_time) * 1000)
        
        return ChatResponse(
            answer=answer,
            confidence=max_score,
            sources=sources,
            status=status,
            session_id=session_id,
            response_time_ms=response_time
        )
        
    except Exception as e:
        return ChatResponse(
            answer=f"An error occurred while processing your request. Please try again.",
            confidence=0.0,
            sources=[],
            status="error",
            session_id=session_id,
            response_time_ms=int((time.time() - start_time) * 1000)
        )


@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear a chat session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared"}
    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/sessions/{session_id}/history")
async def get_session_history(session_id: str):
    """Get conversation history for a session"""
    if session_id in sessions:
        return {"history": sessions[session_id].history}
    raise HTTPException(status_code=404, detail="Session not found")


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Pre-load models on startup"""
    print("Vi-Sakha RAG API starting...")
    # Trigger lazy loading of models
    from chatbot import get_embed_model, get_claude, get_collection
    print("Pre-loading embedding model...")
    get_embed_model()
    print("Connecting to vector database...")
    get_collection()
    print("RAG API ready!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
