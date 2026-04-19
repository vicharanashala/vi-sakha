import pytest
import requests
import uuid
import time

def test_functional_student_rag_feedback_journey(base_url, auth_headers, test_logger):
    """
    Scenario: A student initiates a new conversation, asks a technical question, receives an AI response, 
              and provides positive feedback to help train the model.
    """
    # 1. Create Conversation
    payload_conv = {"title": "Onboarding Help"}
    res_conv = requests.post(f"{base_url}/chat/conversations", json=payload_conv, headers=auth_headers)
    test_logger.log_api(
        method="POST", 
        url="/chat/conversations", 
        scenario="Step 1: Student initiates a new AI conversation for onboarding guidance", 
        response=res_conv, 
        payload=payload_conv, 
        headers=auth_headers,
        expected_status=201
    )
    conv_id = res_conv.json()["conversationId"]
    
    # 2. Ask Question
    payload_msg = {"conversationId": conv_id, "content": "What are the rules for the internship?"}
    res_msg = requests.post(f"{base_url}/chat/message", json=payload_msg, headers=auth_headers)
    test_logger.log_api(
        method="POST", 
        url="/chat/message", 
        scenario="Step 2: Student submits a natural language query regarding internship policies", 
        response=res_msg, 
        payload=payload_msg, 
        headers=auth_headers,
        expected_status=200
    )
    msg_data = res_msg.json()["assistantMessage"]
    msg_id = msg_data["id"]
    msg_content = msg_data["content"]
    
    # 3. Provide Feedback
    payload_fb = {
        "conversationId": conv_id, 
        "messageId": msg_id, 
        "messageContent": msg_content, 
        "rating": "up"
    }
    response = requests.post(f"{base_url}/feedback", json=payload_fb, headers=auth_headers)
    test_logger.log_api(
        method="POST", 
        url="/feedback", 
        scenario="Step 3: Student confirms the AI response was helpful by submitting positive feedback", 
        response=response, 
        payload=payload_fb, 
        headers=auth_headers,
        expected_status=201
    )

def test_functional_ticket_evidence_journey(base_url, auth_headers, test_logger):
    """
    Scenario: A student encounters a platform issue, creates a support ticket with screenshot evidence, 
              and later appends a follow-up message with reproduction steps.
    """
    # 1. Create Ticket with Screenshot
    mock_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    payload_ticket = {
        "studentName": "Journey User",
        "subject": "Platform Crash",
        "reason": "The system crashes immediately upon login.",
        "screenshots": [{"fileName": "error.png", "mimeType": "image/png", "dataUrl": mock_img}]
    }
    res_ticket = requests.post(f"{base_url}/tickets", json=payload_ticket, headers=auth_headers)
    test_logger.log_api(
        method="POST", 
        url="/tickets", 
        scenario="Step 1: Student creates a high-priority support ticket with attached visual evidence", 
        response=res_ticket, 
        payload=payload_ticket, 
        headers=auth_headers,
        expected_status=201
    )
    ticket_id = res_ticket.json()["id"]
    
    # 2. Add Message to Thread
    payload_msg = {"message": "I have reproduced this issue on Google Chrome (Version 122)."}
    response = requests.patch(f"{base_url}/tickets/{ticket_id}/messages", json=payload_msg, headers=auth_headers)
    test_logger.log_api(
        method="PATCH", 
        url=f"/tickets/{ticket_id}/messages", 
        scenario="Step 2: Student appends technical reproduction details to the ongoing ticket thread", 
        response=response, 
        payload=payload_msg, 
        headers=auth_headers,
        expected_status=200
    )

def test_functional_admin_governance_journey(base_url, admin_headers, test_logger):
    """
    Scenario: An administrator performs a full user lifecycle governance workflow: 
              registering a temporary user, promoting them to lab member, and finally deactivating the account.
    """
    # 1. Register a student
    student_email = f"gov_{uuid.uuid4().hex[:4]}@example.com"
    reg_payload = {"email": student_email, "password": "Password123!", "name": "Governance Test"}
    res_reg = requests.post(f"{base_url}/auth/register", json=reg_payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/register", 
        scenario="Step 1: Administrator registers a new temporary user identity for governance testing", 
        response=res_reg, 
        payload=reg_payload, 
        headers="None",
        expected_status=201
    )
    student_id = res_reg.json()["user"]["id"]
    
    # 2. Promote to Lab Member
    payload_role = {"role": "lab_member"}
    res_role = requests.patch(f"{base_url}/admin/users/{student_id}/role", json=payload_role, headers=admin_headers)
    test_logger.log_api(
        method="PATCH", 
        url=f"/admin/users/{student_id}/role", 
        scenario="Step 2: Administrator promotes the temporary user to the 'Lab Member' role", 
        response=res_role, 
        payload=payload_role, 
        headers=admin_headers,
        expected_status=200
    )
    
    # 3. Deactivate
    payload_status = {"isActive": False}
    response = requests.patch(f"{base_url}/admin/users/{student_id}/status", json=payload_status, headers=admin_headers)
    test_logger.log_api(
        method="PATCH", 
        url=f"/admin/users/{student_id}/status", 
        scenario="Step 3: Administrator deactivates the user account as part of the offboarding workflow", 
        response=response, 
        payload=payload_status, 
        headers=admin_headers,
        expected_status=200
    )

def test_functional_knowledge_contribution_lifecycle(base_url, admin_headers, test_logger):
    """
    Scenario: A user proposes a new knowledge item, it is initially rejected by an admin, 
              corrected, resubmitted, and finally approved for extraction into the knowledge base.
    """
    # 1. First Proposal
    payload_prop = {"question": "How to contribute?", "answer": "Follow US11 guidelines carefully."}
    res_prop = requests.post(f"{base_url}/qa-proposals", json=payload_prop, headers=admin_headers)
    test_logger.log_api(
        method="POST", 
        url="/qa-proposals", 
        scenario="Step 1: User submits a new candidate Q&A proposal for the knowledge base", 
        response=res_prop, 
        payload=payload_prop, 
        headers=admin_headers,
        expected_status=201
    )
    prop_id = res_prop.json()["data"]["_id"]
    
    # 2. Reject
    payload_rej = {"reason": "Formatting issues."}
    res_rej = requests.patch(f"{base_url}/qa-proposals/{prop_id}/reject", json=payload_rej, headers=admin_headers)
    test_logger.log_api(
        method="PATCH", 
        url=f"/qa-proposals/{prop_id}/reject", 
        scenario="Step 2: Administrator rejects the proposal citing specific quality/formatting concerns", 
        response=res_rej, 
        payload=payload_rej, 
        headers=admin_headers,
        expected_status=200
    )
    
    # 3. Approve (Correction Simulation)
    response = requests.patch(f"{base_url}/qa-proposals/{prop_id}/approve", headers=admin_headers)
    test_logger.log_api(
        method="PATCH", 
        url=f"/qa-proposals/{prop_id}/approve", 
        scenario="Step 3: After minor corrections, the administrator performs a final approval and extraction", 
        response=response, 
        payload="None", 
        headers=admin_headers,
        expected_status=200
    )

def test_functional_analytics_insight_flow(base_url, auth_headers, test_logger):
    """
    Scenario: An administrator performs a full investigative audit of system analytics, 
              reviewing trends, sentiment hotspots, and final feedback ratios.
    """
    # 1. Check Trends
    res_trends = requests.get(f"{base_url}/analytics/trends", headers=auth_headers)
    test_logger.log_api(
        method="GET", 
        url="/analytics/trends", 
        scenario="Step 1: Administrator reviews time-series interaction trends for capacity planning", 
        response=res_trends, 
        payload="None", 
        headers=auth_headers,
        expected_status=200
    )
    
    # 2. Check Hotspots
    res_hot = requests.get(f"{base_url}/analytics/hotspots", headers=auth_headers)
    test_logger.log_api(
        method="GET", 
        url="/analytics/hotspots", 
        scenario="Step 2: Administrator identifies negative sentiment hotspots to pinpoint service gaps", 
        response=res_hot, 
        payload="None", 
        headers=auth_headers,
        expected_status=200
    )
    
    # 3. Final Ratio Audit
    response = requests.get(f"{base_url}/analytics/feedback-ratio", headers=auth_headers)
    test_logger.log_api(
        method="GET", 
        url="/analytics/feedback-ratio", 
        scenario="Step 3: Administrator performs a final audit of the overall positive/negative feedback ratio", 
        response=response, 
        payload="None", 
        headers=auth_headers,
        expected_status=200
    )
