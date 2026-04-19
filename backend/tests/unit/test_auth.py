import pytest
import requests
import uuid

def test_user_registration_success(base_url, test_logger):
    """
    Test API: POST /api/auth/register
    Scenario: A new user registers for the first time with valid credentials
    Expected: 201 Created and session tokens
    """
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": email,
        "password": "SecurePassword123!",
        "name": "Auth Test User"
    }
    response = requests.post(f"{base_url}/auth/register", json=payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/register", 
        scenario="A new user registers for the first time with valid credentials", 
        response=response, 
        payload=payload, 
        headers="None",
        expected_status=201
    )

def test_registration_invalid_email(base_url, test_logger):
    """
    Test API: POST /api/auth/register
    Scenario: A user attempts to register with a malformed email address
    Expected: 400 Bad Request
    """
    payload = {"email": "invalid-email-format", "password": "TestPassword123!", "name": "Fail"}
    response = requests.post(f"{base_url}/auth/register", json=payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/register", 
        scenario="A user attempts to register with a malformed email address", 
        response=response, 
        payload=payload, 
        headers="None",
        expected_status=400
    )

def test_registration_short_password(base_url, test_logger):
    """
    Test API: POST /api/auth/register
    Scenario: A user attempts to register with a password that is too short
    Expected: 400 Bad Request
    """
    payload = {"email": "short@pass.com", "password": "123", "name": "Fail"}
    response = requests.post(f"{base_url}/auth/register", json=payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/register", 
        scenario="A user attempts to register with a password that is too short (min 6 chars)", 
        response=response, 
        payload=payload, 
        headers="None",
        expected_status=400
    )

def test_user_login_success(base_url, test_logger):
    """
    Test API: POST /api/auth/login
    Scenario: An existing user logs in with the correct credentials
    Expected: 201 Created and new JWT access token
    """
    email = f"login_{uuid.uuid4().hex[:4]}@example.com"
    password = "CorrectPass1!"
    requests.post(f"{base_url}/auth/register", json={"email": email, "password": password, "name": "Login User"})
    
    payload = {"email": email, "password": password}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/login", 
        scenario="An existing user logs in with the correct credentials", 
        response=response, 
        payload=payload, 
        headers="None",
        expected_status=201
    )

def test_login_unauthorized_user(base_url, test_logger):
    """
    Test API: POST /api/auth/login
    Scenario: A user attempts to login with an unregistered email address
    Expected: 401 Unauthorized
    """
    payload = {"email": "ghost_user@void.com", "password": "any_password"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    test_logger.log_api(
        method="POST", 
        url="/auth/login", 
        scenario="A user attempts to login with an unregistered email address", 
        response=response, 
        payload=payload, 
        headers="None",
        expected_status=401
    )

def test_get_current_profile_audit(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/auth/me
    Scenario: An authenticated user retrieves their own profile details
    Expected: 200 OK with role and identity metadata
    """
    response = requests.get(f"{base_url}/auth/me", headers=auth_headers)
    test_logger.log_api(
        method="GET", 
        url="/auth/me", 
        scenario="An authenticated user retrieves their own profile details using a Bearer token", 
        response=response, 
        payload="None", 
        headers=auth_headers,
        expected_status=200
    )

def test_get_profile_unauthorized(base_url, test_logger):
    """
    Test API: GET /api/auth/me
    Scenario: An anonymous user attempts to access a protected profile endpoint
    Expected: 401 Unauthorized
    """
    response = requests.get(f"{base_url}/auth/me")
    test_logger.log_api(
        method="GET", 
        url="/auth/me", 
        scenario="An anonymous user attempts to access a protected profile endpoint without a token", 
        response=response, 
        payload="None", 
        headers="None",
        expected_status=401
    )
