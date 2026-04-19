import pytest
import requests

def test_list_discord_conversations_success(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/discord-ingestion/conversations
    Scenario: A user retrieves the list of conversations ingested from the Discord support channel
    Expected: 200 OK and an array of cross-platform interaction records
    """
    response = requests.get(f"{base_url}/discord-ingestion/conversations", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/discord-ingestion/conversations", 
         scenario="A user retrieves the metadata for all conversations harvested from external Discord channels", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json(), list)

def test_get_discord_conversation_detail_not_found(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/discord-ingestion/conversations/:id
    Scenario: A user attempts to retrieve details for a non-existent Discord thread ID
    Expected: 404 Not Found
    """
    response = requests.get(f"{base_url}/discord-ingestion/conversations/non-existent-thread-123", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/discord-ingestion/conversations/non-existent-thread-123", 
         scenario="A user attempts to retrieve details for a missing Discord thread identifier (Audit Fail)", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=404
    )

def test_get_discord_ingestion_stats(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/discord-ingestion/stats
    Scenario: A user retrieves the volume metrics for the Discord ingestion pipeline
    Expected: 200 OK and counters for total and open threads
    """
    response = requests.get(f"{base_url}/discord-ingestion/stats", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/discord-ingestion/stats", 
         scenario="A user retrieves performance and volume metrics for the automated Discord ingestion pipeline", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )

def test_list_conversations_filtered_by_status(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/discord-ingestion/conversations?status=open
    Scenario: A user filters the Discord chat history to only show 'open' issues
    Expected: 200 OK
    """
    response = requests.get(f"{base_url}/discord-ingestion/conversations?status=open", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/discord-ingestion/conversations", 
         scenario="A user filters the external Discord ingestion list to isolate unresolved 'open' issues", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json(), list)
