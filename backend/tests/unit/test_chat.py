import pytest
import requests
import json

def test_create_conversation_success(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/chat/conversations
    Scenario: A student initiates a new AI chat session with a specific topic title
    Expected: 201 Created and unique conversation identifier
    """
    payload = {"title": "New Chat Session"}
    response = requests.post(f"{base_url}/chat/conversations", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/chat/conversations", 
         scenario="A student initiates a new AI chat session with a specific topic title", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )

def test_send_message_and_get_ai_response(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/chat/message
    Scenario: A student sends a natural language query to the RAG-enabled chatbot
    Expected: 200 OK and an AI-generated assistant message response
    """
    conv_res = requests.post(f"{base_url}/chat/conversations", json={"title": "RAG Test"}, headers=auth_headers).json()
    conv_id = conv_res["conversationId"]
    
    payload = {"conversationId": conv_id, "content": "How do I start my internship?"}
    response = requests.post(f"{base_url}/chat/message", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/chat/message", 
         scenario="A student sends a natural language query to the RAG-enabled chatbot for guidance", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=200
    )
    assert "content" in response.json()["assistantMessage"]

def test_chat_message_empty_text_fails(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/chat/message
    Scenario: A student attempts to send an empty message body to the chatbot
    Expected: 400 Bad Request (Validation fail)
    """
    payload = {"conversationId": "dummy-conv-id", "content": ""}
    response = requests.post(f"{base_url}/chat/message", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/chat/message", 
         scenario="A student attempts to send an empty message body to the chatbot (Validation Error)", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=400
    )

def test_send_feedback_up_success(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/feedback
    Scenario: A student provides a positive 'up' rating for an AI-generated response
    Expected: 201 Created and logged sentiment
    """
    conv_id = requests.post(f"{base_url}/chat/conversations", json={"title": "Feedback Test"}, headers=auth_headers).json()["conversationId"]
    msg_res = requests.post(f"{base_url}/chat/message", json={"conversationId": conv_id, "content": "What is 2+2?"}, headers=auth_headers).json()
    msg_id = msg_res["assistantMessage"]["id"]
    msg_content = msg_res["assistantMessage"]["content"]
    
    payload = {
        "conversationId": conv_id,
        "messageId": msg_id,
        "messageContent": msg_content,
        "rating": "up"
    }
    response = requests.post(f"{base_url}/feedback", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/feedback", 
         scenario="A student provides a positive 'up' rating for an AI-generated assistant response", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )

def test_get_chat_stats_audit(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/chat/stats
    Scenario: A user retrieves high-level analytics concerning AI performance and usage
    Expected: 200 OK with session and confidence metrics
    """
    response = requests.get(f"{base_url}/chat/stats", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/chat/stats", 
         scenario="A user retrieves high-level analytics concerning AI interaction performance", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )

def test_get_conversations_filtered_unpacked(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/chat/conversations
    Scenario: A student requests their chat history with pagination limits
    Expected: 200 OK and a list of conversation objects
    """
    response = requests.get(f"{base_url}/chat/conversations?limit=10", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/chat/conversations", 
         scenario="A student requests their paginated chat history for the dashboard", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json()["conversations"], list)

def test_resolve_conversation_escalation(base_url, auth_headers, test_logger):
    """
    Test API: PATCH /api/chat/conversations/:id/resolve
    Scenario: A student marks a chatbot conversation as resolved/closed
    Expected: 200 OK
    """
    conv_id = requests.post(f"{base_url}/chat/conversations", json={"title": "Resolve Test"}, headers=auth_headers).json()["conversationId"]
    response = requests.patch(f"{base_url}/chat/conversations/{conv_id}/resolve", headers=auth_headers)
    test_logger.log_api(
         method="PATCH", 
         url=f"/chat/conversations/{conv_id}/resolve", 
         scenario="A student marks an ongoing chatbot conversation as resolved to close the session", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )

def test_INVALID_feedback_rating_demo(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/feedback
    Scenario: A student attempts to submit an unsupported rating type (e.g., 'neutral')
    Expected: 400 Bad Request (Enum Constraint)
    """
    payload = {
        "conversationId": "dummy-id",
        "messageId": "msg-id",
        "messageContent": "Bad logic.",
        "rating": "neutral"
    }
    response = requests.post(f"{base_url}/feedback", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/feedback", 
         scenario="A student attempts to submit an unsupported rating value (Enum Constraint Failure)", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=400
    )
