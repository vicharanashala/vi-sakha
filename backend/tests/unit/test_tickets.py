import pytest
import requests
import uuid

def test_create_ticket_success(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/tickets
    Scenario: A student creates a support ticket with a name, subject, and reason
    Expected: 201 Created and unique ticket identification
    """
    payload = {"studentName": "Test User", "subject": "System Bug", "reason": "The system is currently offline."}
    response = requests.post(f"{base_url}/tickets", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/tickets", 
         scenario="A student creates a new support ticket with valid mandatory fields", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )

def test_create_ticket_missing_name_fails(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/tickets
    Scenario: A student attempts to create a ticket without providing a studentName
    Expected: 400 Bad Request (Validation failure)
    """
    payload = {"subject": "Missing Name"}
    response = requests.post(f"{base_url}/tickets", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/tickets", 
         scenario="A student attempts to create a ticket missing the mandatory studentName field", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=400
    )

def test_create_ticket_with_screenshots_success(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/tickets
    Scenario: A student attaches base64-encoded screenshots as evidence to a new ticket
    Expected: 201 Created with media processing
    """
    mock_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    payload = {
        "studentName": "Viz User",
        "subject": "UI Layout Issue",
        "reason": "Screenshots of the distorted layout are attached.",
        "screenshots": [
            {
                "fileName": "test_screenshot.png",
                "mimeType": "image/png",
                "dataUrl": mock_img
            }
        ]
    }
    response = requests.post(f"{base_url}/tickets", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/tickets", 
         scenario="A student attaches base64 screenshots as evidence to a new support ticket", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )

def test_get_ticket_by_id_and_filters(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/tickets/:id
    Scenario: A student retrieves the current status and history of an individual ticket
    Expected: 200 OK
    """
    create_res = requests.post(
        f"{base_url}/tickets", 
        json={"studentName": "Lookup User", "subject": "Status Check", "reason": "Testing individual retrieval"},
        headers=auth_headers
    ).json()
    ticket_id = create_res["id"]
    
    response = requests.get(f"{base_url}/tickets/{ticket_id}", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url=f"/tickets/{ticket_id}", 
         scenario="A student retrieves the current status and history of an individual ticket by ID", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert response.json()["id"] == ticket_id

def test_list_tickets_role_filtering(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/tickets
    Scenario: A user requests a filtered list of tickets based on their 'open' status
    Expected: 200 OK and a list of matching ticket objects
    """
    response = requests.get(f"{base_url}/tickets?status=open", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/tickets", 
         scenario="A user requests a filtered list of tickets based on the 'open' status flag", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json(), list)

def test_add_ticket_message_success(base_url, auth_headers, test_logger):
    """
    Test API: PATCH /api/tickets/:id/messages
    Scenario: A student appends a new message thread to an existing ticket for follow-up
    Expected: 200 OK and updated message timeline
    """
    create_res = requests.post(
        f"{base_url}/tickets", 
        json={"studentName": "Thread User", "subject": "Follow-up", "reason": "Testing message threads"},
        headers=auth_headers
    ).json()
    ticket_id = create_res["id"]
    
    payload = {"message": "Adding additional documentation for the technical team."}
    response = requests.patch(f"{base_url}/tickets/{ticket_id}/messages", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="PATCH", 
         url=f"/tickets/{ticket_id}/messages", 
         scenario="A student appends a new follow-up message to an existing support ticket thread", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=200
    )

def test_resolve_ticket_unauthorized_fails(base_url, auth_headers, test_logger):
    """
    Test API: PATCH /api/tickets/:id/resolve
    Scenario: A student attempts to mark a ticket as resolved (Permission restricted to Admin/LabMember)
    Expected: 403 Forbidden (RBAC Rule Enforcement)
    """
    create_res = requests.post(
        f"{base_url}/tickets", 
        json={"studentName": "Guard Test", "subject": "Security", "reason": "Testing resolve restriction"},
        headers=auth_headers
    ).json()
    ticket_id = create_res["id"]
    
    payload = {"resolutionNote": "Attempted resolution by student."}
    response = requests.patch(f"{base_url}/tickets/{ticket_id}/resolve", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="PATCH", 
         url=f"/tickets/{ticket_id}/resolve", 
         scenario="A student attempts to resolve a ticket without administrative permissions (Forbidden)", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=403
    )
