import pytest
import requests
import uuid
import logging
import sys
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from colorama import Fore, Style, init

# Initialize colorama for cross-platform color support
init(autoreset=True)

# Load environment variables
load_dotenv()

# Configure comprehensive logging for test visibility
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s', # Clean format for terminal
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("api-tests")

BASE_URL = "http://localhost:3000/api"

class APIVerifier:
    """
    Advanced logging utility to match official marking screenshot.
    Uses Colorama for high-fidelity terminal reporting.
    """
    def __init__(self, logger):
        self.logger = logger

    def log_api(self, method, url, scenario, response, payload=None, headers=None, expected_status=None, expected_json=None):
        status_pass = (response.status_code == expected_status) if expected_status else True
        
        # Determine success
        result_text = "Success" if status_pass else "Failure"
        result_color = Fore.GREEN if status_pass else Fore.RED

        # 1. Scenario Description (Title)
        self.logger.info(f"\n{Style.BRIGHT}{Fore.CYAN}{scenario}")
        
        # 2. Page being tested
        self.logger.info(f"{Fore.WHITE}Page being tested: {Fore.YELLOW}{url}")
        
        # 3. Inputs
        self.logger.info(f"{Fore.MAGENTA}Inputs:")
        self.logger.info(f"  - Request Method: {method}")
        self.logger.info(f"  - JSON: {payload if payload else '{}'}")
        self.logger.info(f"  - Header: {headers if headers else 'Default'}")
        
        # 4. Expected Output
        self.logger.info(f"{Fore.BLUE}Expected Output:")
        if expected_status:
            self.logger.info(f"  - HTTP Status Code: {expected_status}")
        if expected_json:
            self.logger.info(f"  - JSON: {expected_json}")
            
        # 5. Actual Output
        self.logger.info(f"{Fore.CYAN}Actual Output:")
        self.logger.info(f"  - HTTP Status Code: {response.status_code}")
        try:
            actual_json = response.json()
            # Truncate large JSON for terminal readability
            json_str = str(actual_json)
            if len(json_str) > 500:
                json_str = json_str[:500] + "..."
            self.logger.info(f"  - JSON: {json_str}")
        except:
            self.logger.info(f"  - JSON: N/A")
            
        # 6. Result
        self.logger.info(f"{Style.BRIGHT}Result: {result_color}{result_text}")
        self.logger.info(f"{Fore.BLACK}{Style.DIM}" + "-" * 60)
        
        # Assertions for Pytest
        if expected_status:
            assert response.status_code == expected_status, f"Expected {expected_status} but got {response.status_code}"

@pytest.fixture(scope="session")
def test_logger():
    return APIVerifier(logger)

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

@pytest.fixture(scope="session")
def db_conn():
    """
    Direct MongoDB connection for administrative permission injection (Role Promotion).
    """
    uri = os.getenv("MONGODB_URI")
    client = MongoClient(uri)
    # Extract DB name from URI or use default
    db = client.get_default_database()
    yield db
    client.close()

@pytest.fixture(scope="session")
def test_user_token(base_url):
    """
    Registers a fresh test user and returns their JWT token.
    """
    unique_id = str(uuid.uuid4())[:8]
    email = f"test_{unique_id}@example.com"
    password = "TestPassword123!"
    
    reg_response = requests.post(
        f"{base_url}/auth/register",
        json={"email": email, "password": password, "name": f"Test User {unique_id}"}
    )
    
    if reg_response.status_code == 201:
        return reg_response.json().get("access_token")
    
    login_response = requests.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password}
    )
    return login_response.json().get("access_token")

@pytest.fixture(scope="session")
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}

@pytest.fixture(scope="session")
def admin_headers(base_url, db_conn):
    """
    Official Admin authentication fixture.
    Promotes user to ADMIN directly in DB to bypass hook removal in source.
    """
    unique_id = uuid.uuid4().hex[:6]
    email = f"admin_{unique_id}@example.com"
    password = "TestPassword123!"
    
    # 1. Register as regular user
    requests.post(
        f"{base_url}/auth/register",
        json={"email": email, "password": password, "name": "System Admin"}
    )
    
    # 2. Promote via direct DB update
    db_conn.users.update_one({"email": email}, {"$set": {"role": "admin"}})
    
    # 3. Login to get token with Admin role claims
    login_res = requests.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password}
    )
    token = login_res.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}
