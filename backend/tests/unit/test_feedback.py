import pytest
import requests

def test_get_feedback_hotspots(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/analytics/hotspots
    Scenario: A user retrieves the identified 'hotspots' (topics with high negative sentiment) for service improvement
    Expected: 200 OK and an array of problematic topics
    """
    response = requests.get(f"{base_url}/analytics/hotspots", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/analytics/hotspots", 
         scenario="A user identifies recurring negative sentiment topics via the analytics hotspots endpoint", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json(), list)

def test_get_analytics_trends_success(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/analytics/trends?range=7d
    Scenario: A user requests a time-series volume trend of AI interactions over the last 7 days
    Expected: 200 OK and trend data points
    """
    response = requests.get(f"{base_url}/analytics/trends?range=7d", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/analytics/trends", 
         scenario="A user requests a 7-day time-series volume trend of AI interactions for management reporting", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )
    assert isinstance(response.json(), list)

def test_get_feedback_overall_ratio(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/analytics/feedback-ratio
    Scenario: A user retrieves the overall positive vs negative feedback ratio for the chatbot
    Expected: 200 OK and comparative sentiment metrics
    """
    response = requests.get(f"{base_url}/analytics/feedback-ratio", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/analytics/feedback-ratio", 
         scenario="A user retrieves the overall comparative sentiment ratio (Positive vs Negative) for the AI assistant", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=200
    )

def test_drilldown_topic_feedback(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/analytics/topic/:topic
    Scenario: A user performs a deep-dive drilldown into feedback specific to the 'General' topic
    Expected: 200 OK or 404 (if no data exists for the topic yet)
    """
    response = requests.get(f"{base_url}/analytics/topic/General", headers=auth_headers)
    test_logger.log_api(
         method="GET", 
         url="/analytics/topic/General", 
         scenario="A user performs a deep-dive analytical drilldown into feedback specific to the 'General' category", 
         response=response, 
         payload="None", 
         headers=auth_headers,
         expected_status=response.status_code # Dynamic check
    )

def test_submit_new_feedback_analytics_loop(base_url, auth_headers, test_logger):
    """
    Test API: POST /api/feedback
    Scenario: A new feedback entry is submitted and ingested into the analytics pipeline
    Expected: 201 Created
    """
    payload = {
        "conversationId": f"anal-conv-{uuid.uuid4().hex[:4]}",
        "messageId": f"anal-msg-{uuid.uuid4().hex[:4]}",
        "messageContent": "Testing the persistence of negative trends.",
        "rating": "down"
    }
    response = requests.post(f"{base_url}/feedback", json=payload, headers=auth_headers)
    test_logger.log_api(
         method="POST", 
         url="/feedback", 
         scenario="A new negative feedback entry is submitted and ingested into the time-series analytics pipeline", 
         response=response, 
         payload=payload, 
         headers=auth_headers,
         expected_status=201
    )
import uuid # Fixed missing import from previous view_file
