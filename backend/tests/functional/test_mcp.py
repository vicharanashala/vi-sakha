import pytest
import requests
import os
import json

# Assuming the backend is running on localhost:3000 during CI/CD
BASE_URL = "http://localhost:3000/api"

# Fetch API Key from environment for secure testing
API_KEY = os.getenv("VSAKHA_TEST_API_KEY")

@pytest.fixture
def auth_headers():
    if not API_KEY:
        pytest.fail("VSAKHA_TEST_API_KEY environment variable is not set. Functional tests require authentication.")
    return {"x-api-key": API_KEY}

def test_mcp_query(auth_headers):
    """Test the unified /mcp/query endpoint."""
    payload = {
        "query": "How do I start the project?",
        "context_sources": ["conversations", "qa_pairs"]
    }
    
    print("\n🔍 Sending MCP Query: 'How do I start the project?'")
    try:
        response = requests.post(f"{BASE_URL}/mcp/query", json=payload, headers=auth_headers, timeout=20)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        
        # Verbose Logging for User
        print("\n--- [ MCP AI RESPONSE ] ---")
        print(f"🤖 Answer: {data.get('answer', 'N/A')[:200]}...")
        print(f"🔗 References Found: {len(data.get('references', []))}")
        print(f"📊 Status: {data.get('status')}")
        print("---------------------------\n")

        assert "answer" in data, "Response should have an answer field"
        assert "references" in data, "Response should have references"
        assert "status" in data, "Response should have status"
        assert data["status"] in ["answered", "escalated"]
        
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at localhost:3000. Skipping functional test.")

def test_chat_message(auth_headers):
    """Test backward compatibility of the /chat/message endpoint."""
    payload = {
        "content": "What is the timeline for completion?"
    }
    
    print("🔍 Sending Chat Message: 'What is the timeline for completion?'")
    try:
        response = requests.post(f"{BASE_URL}/chat/message", json=payload, headers=auth_headers, timeout=20)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        
        # Verbose Logging for User
        print("\n--- [ CHAT AI RESPONSE ] ---")
        assistant_text = data.get('assistantMessage', {}).get('content', 'N/A')
        print(f"🤖 Assistant: {assistant_text[:200]}...")
        print(f"🆔 Conversation ID: {data.get('conversationId')}")
        print("----------------------------\n")

        assert "assistantMessage" in data
        assert "conversationId" in data
        
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at localhost:3000. Skipping functional test.")
