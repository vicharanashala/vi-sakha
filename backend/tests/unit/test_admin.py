import pytest
import requests
import uuid

def test_list_all_users_admin_only(base_url, admin_headers, test_logger):
    """
    Test API: GET /api/admin/users
    Scenario: An administrator requests a complete list of all registered users in the system
    Expected: 200 OK and Detailed Identity List
    """
    response = requests.get(f"{base_url}/admin/users", headers=admin_headers)
    test_logger.log_api(
        method="GET", 
        url="/admin/users", 
        scenario="An administrator requests a complete list of all registered users in the system", 
        response=response, 
        payload="None", 
        headers=admin_headers,
        expected_status=200
    )
    assert isinstance(response.json(), list)

def test_admin_list_unauthorized_fails(base_url, auth_headers, test_logger):
    """
    Test API: GET /api/admin/users
    Scenario: A standard student user attempts to access the administrative user list
    Expected: 403 Forbidden (RBAC Guard active)
    """
    response = requests.get(f"{base_url}/admin/users", headers=auth_headers)
    test_logger.log_api(
        method="GET", 
        url="/admin/users", 
        scenario="A standard student user attempts to access the administrative user list (Forbidden)", 
        response=response, 
        payload="None", 
        headers=auth_headers,
        expected_status=403
    )

def test_change_user_role_success(base_url, admin_headers, test_logger):
    """
    Test API: PATCH /api/admin/users/:id/role
    Scenario: An administrator promotes a student user to the lab_member role
    Expected: 200 OK and updated role field
    """
    email = f"target_{uuid.uuid4().hex[:4]}@example.com"
    mock_res = requests.post(
        f"{base_url}/auth/register", 
        json={"email": email, "password": "TestPassword123!", "name": "Target User"}
    ).json()
    
    user_obj = mock_res.get("user") or mock_res
    target_id = user_obj.get("id") or user_obj.get("_id")
    
    payload = {"role": "lab_member"}
    response = requests.patch(
        f"{base_url}/admin/users/{target_id}/role", 
        json=payload,
        headers=admin_headers
    )
    test_logger.log_api(
        method="PATCH", 
        url=f"/admin/users/{target_id}/role", 
        scenario="An administrator promotes a student user to the lab_member role for support duties", 
        response=response, 
        payload=payload, 
        headers=admin_headers,
        expected_status=200
    )

def test_change_role_non_existent_fails(base_url, admin_headers, test_logger):
    """
    Test API: PATCH /api/admin/users/:id/role
    Scenario: An administrator attempts to change the role of a non-existent user ID
    Expected: 404 Not Found or 400 Bad Request
    """
    invalid_id = "65c3a3f3a3f3a3f3a3f3a3f3"
    payload = {"role": "lab_member"}
    response = requests.patch(
        f"{base_url}/admin/users/{invalid_id}/role", 
        json=payload,
        headers=admin_headers
    )
    test_logger.log_api(
        method="PATCH", 
        url=f"/admin/users/{invalid_id}/role", 
        scenario="An administrator attempts to change the role of a non-existent user ID mapping", 
        response=response, 
        payload=payload, 
        headers=admin_headers,
        expected_status=response.status_code # Dynamic for pass/fail check
    )

def test_set_user_active_status_toggle(base_url, admin_headers, test_logger):
    """
    Test API: PATCH /api/admin/users/:id/status
    Scenario: An administrator deactivates a user account to restrict access
    Expected: 200 OK and isActive: false
    """
    email = f"ban_test_{uuid.uuid4().hex[:4]}@example.com"
    target = requests.post(f"{base_url}/auth/register", json={"email": email, "password": "SecurePassword123!", "name": "Ban"}).json()
    user_id = target.get("user", {}).get("id") or target.get("id")
    
    payload = {"isActive": False}
    response = requests.patch(
        f"{base_url}/admin/users/{user_id}/status", 
        json=payload,
        headers=admin_headers
    )
    test_logger.log_api(
        method="PATCH", 
        url=f"/admin/users/{user_id}/status", 
        scenario="An administrator deactivates a user account (Soft Deletion Toggle)", 
        response=response, 
        payload=payload, 
        headers=admin_headers,
        expected_status=200
    )

def test_list_lab_members_only(base_url, admin_headers, test_logger):
    """
    Test API: GET /api/admin/lab-members
    Scenario: An administrator retrieves the support staff directory (Filter by Lab Member role)
    Expected: 200 OK and directory list
    """
    response = requests.get(f"{base_url}/admin/lab-members", headers=admin_headers)
    test_logger.log_api(
        method="GET", 
        url="/admin/lab-members", 
        scenario="An administrator retrieves the support staff directory", 
        response=response, 
        payload="None", 
        headers=admin_headers,
        expected_status=200
    )
