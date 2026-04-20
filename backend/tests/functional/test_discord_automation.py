import pytest
import requests
import time
import os
from bson import ObjectId
from colorama import Fore, Back, Style

def test_discord_automation_ingestion_and_extraction(base_url, admin_headers, db_conn, test_logger):
    """
    Test Scenario: Full Discord Automation Ingestion
    1. Trigger ingestion of a sample JSON transcript.
    2. Verify messages are correctly parsed and stored in 'discordconversations'.
    3. Verify Q&A proposals are extracted (via Mock Mode) and stored in 'qaproposals'.
    """
    logger = test_logger.logger
    
    # --- PHASE: Setup ---
    logger.info(f"\n{Style.BRIGHT}{Fore.BLACK}{Back.CYAN}  PHASE: Setup & Cache Clearance  ")
    logger.info(f"{Fore.CYAN}{'=' * 60}")
    
    ticket_number = "TEST-AUTOMATION-123"
    transcript_url = "bot/scraped_transcripts/20260218_1257_transcript_0035.json"
    
    logger.info(f"{Fore.WHITE}  INFO: Target Ticket: {ticket_number}")
    logger.info(f"{Fore.WHITE}  INFO: Transcript Source: {transcript_url}")

    # Clean up any existing test data
    deleted_conv = db_conn.discord_conversations.delete_many({"ticketNumber": ticket_number})
    deleted_qa = db_conn.qa_proposals.delete_many({"source": f"discord_ticket_{ticket_number}"})
    logger.info(f"{Fore.WHITE}{Style.DIM}  INFO: Cleared {deleted_conv.deleted_count} conversations and {deleted_qa.deleted_count} proposals.")

    # --- PHASE: Ingestion ---
    logger.info(f"\n{Style.BRIGHT}{Fore.BLACK}{Back.CYAN}  PHASE: Discord Ingestion Trigger  ")
    logger.info(f"{Fore.CYAN}{'=' * 60}")

    payload = {
        "ticketNumber": ticket_number,
        "fileUrl": transcript_url,
        "fileType": "json"
    }
    
    response = requests.post(f"{base_url}/discord-ingestion/trigger", json=payload, headers=admin_headers)
    
    test_logger.log_api(
        method="POST",
        url="/discord-ingestion/trigger",
        scenario="Triggering automated ingestion for a Discord transcript",
        response=response,
        payload=payload,
        expected_status=200
    )

    # --- PHASE: Verification ---
    logger.info(f"\n{Style.BRIGHT}{Fore.BLACK}{Back.CYAN}  PHASE: Asynchronous Data Verification  ")
    logger.info(f"{Fore.CYAN}{'=' * 60}")
    
    max_retries = 10
    conversation = None
    for i in range(max_retries):
        logger.info(f"{Fore.WHITE}{Style.DIM}  INFO: Polling database for conversation (Attempt {i+1}/{max_retries})...")
        time.sleep(2)
        conversation = db_conn.discord_conversations.find_one({"ticketNumber": ticket_number})
        if conversation and conversation.get("messages", []):
            logger.info(f"{Style.BRIGHT}{Fore.WHITE}Check: Conversation Record Created")
            logger.info(f"  - Status: {Fore.GREEN}PASS (Found {len(conversation['messages'])} messages)")
            break
            
    if not conversation:
        logger.error(f"{Style.BRIGHT}{Fore.RED}Check: Conversation Record Created -> FAIL (Not found)")
        pytest.fail(f"Conversation {ticket_number} was not created in DB.")
    
    # Step 3: Verify Q&A Extraction - Wait for async RAG pipeline
    proposals = []
    for i in range(max_retries):
        logger.info(f"{Fore.WHITE}{Style.DIM}  INFO: Polling database for QA Proposals (Attempt {i+1}/{max_retries})...")
        time.sleep(2)
        proposals = list(db_conn.qa_proposals.find({"source": f"discord_ticket_{ticket_number}"}))
        if len(proposals) >= 1:
            logger.info(f"{Style.BRIGHT}{Fore.WHITE}Check: QA Proposals Extracted")
            logger.info(f"  - Status: {Fore.GREEN}PASS ({len(proposals)} items extracted)")
            break

    if not proposals:
        logger.error(f"{Style.BRIGHT}{Fore.RED}Check: QA Proposals Extracted -> FAIL (0 found)")
        pytest.fail("No QA proposals were extracted")
    
    for idx, prop in enumerate(proposals):
        logger.info(f"{Fore.WHITE}{Style.DIM}  INFO: Verifying Proposal #{idx+1}: {prop.get('question')[:50]}...")
        assert "question" in prop
        assert "answer" in prop
        assert prop["status"] == "pending"
        
    logger.info(f"\n{Style.BRIGHT}{Fore.GREEN}Discord Automation Pipeline Verified Successfully!")

def test_discord_stats_update(base_url, admin_headers, test_logger):
    """
    Verify that the stats endpoint reflects the ingestion.
    """
    logger = test_logger.logger
    logger.info(f"\n{Style.BRIGHT}{Fore.BLACK}{Back.CYAN}  PHASE: Pipeline Statistics Audit  ")
    logger.info(f"{Fore.CYAN}{'=' * 60}")
    
    response = requests.get(f"{base_url}/discord-ingestion/stats", headers=admin_headers)
    
    test_logger.log_api(
        method="GET",
        url="/discord-ingestion/stats",
        scenario="Auditing Discord ingestion volumetric counts",
        response=response,
        expected_status=200
    )
    
    stats = response.json()
    success = "total" in stats and "open" in stats
    logger.info(f"{Style.BRIGHT}{Fore.WHITE}Check: Stats Schema Validity")
    logger.info(f"  - Status: {Fore.GREEN if success else Fore.RED}{'PASS' if success else 'FAIL'}")
    logger.info(f"  - Global Stats -> Total: {stats.get('total')}, Open: {stats.get('open')}, Closed: {stats.get('closed')}")
