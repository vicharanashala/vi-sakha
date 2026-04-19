import pytest
import requests

def test_lookup_qa_pairs_list(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/qa-pairs
    Scenario: A user requests a paginated list of all verified Q&A pairs in the knowledge base
    Expected: 200 OK and a structured search result with record counts
    """
    response = requests.get(f"{base_url}/qa-pairs?limit=10&skip=0", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/qa-pairs", 
         scenario="A user requests a paginated list of all verified Q&A pairs for the knowledge base view", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json()["data"], list)

def test_search_knowledge_base_success(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/qa-pairs/search?q=deadline
    Scenario: A user performs a semantic search query for 'deadline' within the knowledge base
    Expected: 200 OK and relevant matching data nodes
    """
    response = requests.get(f"{base_url}/qa-pairs/search?q=deadline&limit=5", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/qa-pairs/search", 
         scenario="A user performs a semantic keyword search for 'deadline' in the RAG knowledge base", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json()["data"], list)

def test_qa_pairs_invalid_source_empty(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/qa-pairs/source/:source
    Scenario: A user attempts to filter the knowledge base by a non-existent source identifier
    Expected: 200 OK with an empty data set returned
    """
    response = requests.get(f"{base_url}/qa-pairs/source/unknown_source_type", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/qa-pairs/source/unknown_source_type", 
         scenario="A user filters the knowledge base by a non-existent source identifier (Empty Response)", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert response.json()["data"] == []

def test_create_qa_proposal_success(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/qa-proposals
    Scenario: A lab member submits a new Q&A proposal for administrative extraction/review
    Expected: 201 Created and pending status assignment
    """
    payload = {
        "question": "Expansion Proposal?",
        "answer": "Yes, we are expanding coverage for US11.",
        "category": "Operational"
    }
    response = requests.post(f"{base_url}/qa-proposals", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/qa-proposals", 
         scenario="A lab member submits a new candidate Q&A proposal for administrative extraction/review", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )
    assert response.json()["data"]["status"] == "pending"

def test_proposal_rejection_audit(base_url, admin_headers, test_logger):
    """
    Test API: PATCH /api/qa-proposals/:id/reject
    Scenario: An administrator rejects a Q&A proposal due to redundancy or quality issues
    Expected: 200 OK and updated status to 'rejected'
    """
    prop_res = requests.post(
        f"{base_url}/qa-proposals", 
        json={"question": "Duplicate Entry?", "answer": "Remove me."}, 
        headers=admin_headers # Created by Admin for speed
    ).json()
    prop_id = prop_res["data"]["_id"]
    
    payload = {"reason": "A duplicate knowledge entry already exists for this topic."}
    response = requests.patch(f"{base_url}/qa-proposals/{prop_id}/reject", json=payload, headers=admin_headers)
    test_logger.log_api(
         method="PATCH", 
         url=f"/qa-proposals/{prop_id}/reject", 
         scenario="An administrator rejects a Q&A proposal with a specific reason for the audit trail", 
         response=response, 
         payload=payload, 
         headers=admin_headers,
         expected_status=200
    )
    assert response.json()["data"]["status"] == "rejected"

def test_approve_qa_proposal_workflow(base_url, admin_headers, test_logger):
    """
    Test API: PATCH /api/qa-proposals/:id/approve
    Scenario: An administrator approves a Q&A proposal for extraction into the active knowledge base
    Expected: 200 OK and memorization event trigger
    """
    prop_res = requests.post(
        f"{base_url}/qa-proposals", 
        json={"question": "Valid Extraction?", "answer": "Yes, approve for RAG."}, 
        headers=admin_headers
    ).json()
    prop_id = prop_res["data"]["_id"]
    
    response = requests.patch(f"{base_url}/qa-proposals/{prop_id}/approve", headers=admin_headers)
    test_logger.log_api(
         method="PATCH", 
         url=f"/qa-proposals/{prop_id}/approve", 
         scenario="An administrator approves a Q&A proposal for final extraction and memorization", 
         response=response, 
         payload="None", 
         headers=admin_headers,
         expected_status=200
    )

def test_get_proposal_stats(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/qa-proposals/stats
    Scenario: A user retrieves the volume counts of pending and approved Q&A proposals
    Expected: 200 OK with accurate pipeline counters
    """
    response = requests.get(f"{base_url}/qa-proposals/stats", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/qa-proposals/stats", 
         scenario="A user retrieves the administrative volume metrics for the proposal pipeline", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
