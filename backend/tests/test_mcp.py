import pytest
import requests

# Assuming the backend is running on localhost:3000 during CI/CD
BASE_URL = "http://localhost:3000/api"

def test_mcp_query():
    """Test the unified /mcp/query endpoint."""
    payload = {
        "query": "How do I start the project?",
        "context_sources": ["conversations", "qa_pairs"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/mcp/query", json=payload, timeout=20)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "answer" in data, "Response should have an answer field"
        assert "references" in data, "Response should have references"
        assert "status" in data, "Response should have status"
        
        # Status should be 'answered' or 'escalated'
        assert data["status"] in ["answered", "escalated"]
        
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at localhost:3000. Skipping functional test.")

def test_chat_message():
    """Test backward compatibility of the /chat/message endpoint."""
    payload = {
        "content": "What is the timeline for completion?"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/message", json=payload, timeout=20)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "assistantMessage" in data
        assert "conversationId" in data
        
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at localhost:3000. Skipping functional test.")
