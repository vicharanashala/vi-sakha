# Backend API - Extensive Test Case Documentation

This document describes the extensive test cases implemented for the backend API suite, following the high-fidelity audit and logging standards.

## 1. Unit Test Suite (`tests/unit/`)

### Authentication (`test_auth.py`)
- **Successful Registration**: Verifies that a new student can create an account with valid credentials.
- **Login Verification**: Ensures registered students can obtain a JWT for subsequent requests.
- **Duplicate Registration Guard**: Prevents multiple accounts with the same email address.
- **Invalid Credentials Protection**: Blocks access for incorrect passwords.
- **Field Validation**: Enforces minimum password lengths and required field constraints.

### Administrative Governance (`test_admin.py`)
- **User Listing**: Admin-only retrieval of the complete user database.
- **RBAC Guards**: Ensures standard students cannot access administrative endpoints (Forbidden 403).
- **Role Promotion**: Dynamic elevation of user permissions (e.g., Student -> Lab Member).
- **Account Deactivation**: Soft-deletion toggle to restrict access for problematic accounts.
- **Error Handling**: Graceful failure for non-existent user IDs.

### AI Chat & RAG (`test_chat.py`)
- **Conversation Threading**: Creation and persistence of multiple distinct chat threads.
- **RAG Interaction**: Verifies the AI's ability to respond to natural language queries with context.
- **History Retrieval**: Ensures users can access past messages within a specific conversation.
- **Unauthorized Thread Access**: Prevents users from reading other users' private conversations.

### Ticket Management (`test_tickets.py`)
- **Ticket Creation**: Standard submission of support issues.
- **Evidence Handling**: High-fidelity verification of base64 screenshot ingestion and storage.
- **Thread Appending**: Functionality for students to add follow-up comments to open tickets.
- **Data Validation**: Ensuring tickets contain necessary fields like subject and reason.

### Knowledge Base Contribution (`test_knowledge.py`)
- **Q&A Proposal**: Standard users suggesting new entries for the knowledge cluster.
- **Admin Review Pipeline**: Formal rejection or approval of candidate knowledge items.
- **Governance Audit**: Capturing the identity of the administrator who performs the review.

### Analytics & Feedback (`test_feedback.py`)
- **Sentiment Tracking**: Persistence of 'up' and 'down' ratings for AI responses.
- **Hotspot Identification**: Aggregation of negative feedback by topic for service improvement.
- **Trend Analysis**: 7-day time-series volume reporting for interaction metrics.
- **Category Deep-dive**: Analytical drilldowns into specific feedback topics (e.g., 'General').

### Discord Ingestion (`test_discord.py`)
- **Thread Harvesting**: Audit of conversations ingested from external Discord support channels.
- **Pipeline Statistics**: Volume tracking for total vs. open threads harvested.
- **Unresolved Issue Filtering**: Metadata retrieval for threads requiring immediate attention.

## 2. Functional Journey Suite (`tests/functional/`)

### Comprehensive Workflows
- **Student RAG Journey**: Full end-to-end lifecycle from conversation start to help request to model feedback.
- **Ticket Evidence Journey**: End-to-end bug reporting including multi-step screenshot evidence and follow-up interaction.
- **Admin Lifecycle Journey**: Full governance loop from user registration to role promotion to final offboarding/deactivation.
- **Knowledge Contribution**: Multi-step quality assurance loop (Proposal -> Rejection -> Correction -> Approval).
- **Executive Analytics Audit**: Cross-module investigative flow reviewing trends, hotspots, and sentiment ratios.

## 3. High-Fidelity Audit Format
Every test case above undergoes the same rigorous auditing process in the terminal:
1. **Scenario Description**: Concise, human-readable business context.
2. **Endpoint Targeting**: Explicit page URL being tested.
3. **Input Audit**: Full transparency of Request Method, JSON Body, and Auth Headers.
4. **Outcome Verification**: Comparison of Expected vs. Actual HTTP Status and JSON response.
5. **Result Visualization**: Color-coded success/failure indicator.
