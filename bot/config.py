"""
Configuration module for Vinternship AI Support System.

Loads settings from .env file and provides centralized config access.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file (lives at project root, one level up from bot/)
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
load_dotenv(PROJECT_ROOT / ".env")

# =============================================================================
# PATHS
# =============================================================================

BASE_DIR = Path(__file__).parent.absolute()

# Data paths
DATA_DIR = BASE_DIR / "data"
QA_DATASET_PATH = DATA_DIR / "qa_dataset.json"
SCRAPED_TRANSCRIPTS_DIR = BASE_DIR / "scraped_transcripts"
CLEANED_TRANSCRIPTS_DIR = BASE_DIR / "cleaned_transcripts"
DOWNLOADS_DIR = BASE_DIR / "downloads"

# Vector database (stays at project root — gitignored, regenerable)
VECTOR_DB_PATH = PROJECT_ROOT / "vector_db"
COLLECTION_NAME = "vinternship_faq"

# Auth
AUTH_JSON_PATH = BASE_DIR / "auth" / "auth.json"

# =============================================================================
# API KEYS (loaded from .env)
# =============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_CHANNEL_ID = os.getenv("DISCORD_CHANNEL_ID")

# Validate required keys
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in .env file")

# =============================================================================
# MODEL SETTINGS
# =============================================================================

LLM_MODEL = "claude-haiku-4-5-20251001"  # Fast model for Discord bot
EMBEDDING_MODEL = "gemini-embedding-001"  # Still using Gemini for embeddings

# =============================================================================
# RAG SETTINGS
# =============================================================================

TOP_K_RESULTS = 3

# =============================================================================
# INSTRUCTOR IDENTIFIERS
# =============================================================================

# Identified from transcript analysis - authors who reply to student tickets
INSTRUCTORS = [
    # Core support team (high frequency)
    "prkharvndn",
    "jinalgupta.",
    "nitin_fighter1379",
    "abiramk0107",
    "rishavkumar.nit",
    "riyamehtaatwork",
    "abiramk7427",
    "adityabmv",
    "mananjain01",
    "harshiji",
    "nishant_raghuvanshi",
    "girish_jain",
    "gourish0643",
    # Additional support (medium frequency)
    "imsakshivk",
    "sreehari5371",
    "yazdan_irfan",
    "nxtnilesh.",
    "a0rous",
    "koder_kartik",
    "meenakshi7731",
    "imrohitvk",
    "sudarshansudarshan",
]

SYSTEM_AUTHORS = [
    "Ticket Tool"
]
