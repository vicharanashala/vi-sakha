"""
Transcript to QA - Extracts question-answer pairs from cleaned conversations.

Uses Claude LLM to analyze conversations and generate FAQ-style QA pairs.
Processes all cleaned transcripts from cleaned_transcripts/ folder.
Uses async concurrent processing for 5-10x speedup.

Usage:
    python -m bot.scraper.transcript_to_qa
"""

import anthropic
import asyncio
import json
import re
import sys
from pathlib import Path

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from bot.config import ANTHROPIC_API_KEY, LLM_MODEL, CLEANED_TRANSCRIPTS_DIR, QA_DATASET_PATH, DATA_DIR

# Async client for concurrent processing
async_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

INPUT_DIR = CLEANED_TRANSCRIPTS_DIR
OUTPUT_FILE = QA_DATASET_PATH

# Minimum conversation length to process (skip very short ones)
MIN_CONVERSATION_LENGTH = 100

# Concurrent API calls (adjust based on rate limits)
MAX_CONCURRENT = 10


def build_prompt(conversation):
    """Build the QA extraction prompt"""
    return f"""
You are analyzing a support conversation between a STUDENT and an INSTRUCTOR.

Your task is to convert the conversation into high-quality FAQ style question-answer pairs.

Important rules:

1. A single conversation may contain MULTIPLE questions.
2. Each question must produce a SEPARATE QA pair.
3. Only include questions asked by the STUDENT.
4. The answer should summarize the instructor's final response.
5. Ignore greetings, confirmations, and closing messages.
6. Combine follow-up clarifications into the same answer if needed.
7. Rewrite questions clearly in natural language.
8. Rewrite answers clearly and formally.
9. Make answers self-contained and informative.

Return ONLY valid JSON.

Format:

[
  {{
    "question": "...",
    "answer": "..."
  }}
]

Conversation:

{conversation}
"""


def parse_response(text):
    """Parse and validate the model response"""
    text = text.strip()
    
    # Remove markdown wrappers
    text = re.sub(r"```json|```", "", text).strip()

    match = re.search(r"\[.*\]", text, re.DOTALL)

    if not match:
        raise ValueError("No JSON found in model output")

    qa_pairs = json.loads(match.group(0))
    
    # Validate structure
    validated = []
    for pair in qa_pairs:
        if isinstance(pair, dict) and "question" in pair and "answer" in pair:
            validated.append({
                "question": str(pair["question"]).strip(),
                "answer": str(pair["answer"]).strip()
            })
    
    return validated


async def extract_qa_async(conversation, semaphore):
    """
    Use Claude to extract QA pairs from a conversation (async).
    
    Args:
        conversation: Cleaned conversation text
        semaphore: Asyncio semaphore for rate limiting
        
    Returns:
        List of {"question": ..., "answer": ...} dicts
    """
    async with semaphore:
        response = await async_client.messages.create(
            model=LLM_MODEL,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": build_prompt(conversation)}
            ]
        )
        return parse_response(response.content[0].text)


async def process_file_async(file_path, semaphore):
    """Process a single cleaned transcript file (async)"""
    
    with open(file_path, "r", encoding="utf-8") as f:
        conversation = f.read()
    
    # Skip very short conversations
    if len(conversation) < MIN_CONVERSATION_LENGTH:
        return file_path, [], "skipped"
    
    try:
        qa_pairs = await extract_qa_async(conversation, semaphore)
        return file_path, qa_pairs, "success"
    except Exception as e:
        return file_path, [], f"error: {e}"


async def main_async():
    """Process all cleaned transcripts concurrently and generate QA dataset"""
    
    # Check input directory
    if not INPUT_DIR.exists():
        print(f"Error: {INPUT_DIR} not found")
        print("Run bot.scraper.clean_transcripts first")
        return
    
    # Get all cleaned transcript files
    files = list(INPUT_DIR.glob("*.txt"))
    
    if not files:
        print("No cleaned transcripts found")
        return
    
    print(f"Found {len(files)} cleaned transcripts")
    print(f"Output: {OUTPUT_FILE}")
    print(f"Concurrent workers: {MAX_CONCURRENT}")
    print()
    
    # Semaphore to limit concurrent API calls
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    # Create tasks for all files
    tasks = [process_file_async(f, semaphore) for f in files]
    
    # Process with progress tracking
    all_qa = []
    processed = 0
    failed = 0
    skipped = 0
    
    print("Processing transcripts...")
    
    # Use as_completed for real-time progress
    for i, coro in enumerate(asyncio.as_completed(tasks), 1):
        file_path, qa_pairs, status = await coro
        
        if status == "success" and qa_pairs:
            # Add source file to each QA pair
            source_name = file_path.stem
            for pair in qa_pairs:
                pair["source"] = source_name
            all_qa.extend(qa_pairs)
            processed += 1
            print(f"[{i}/{len(files)}] {file_path.name}: {len(qa_pairs)} QA pairs")
        elif status == "skipped":
            skipped += 1
            print(f"[{i}/{len(files)}] {file_path.name}: skipped (too short)")
        else:
            failed += 1
            print(f"[{i}/{len(files)}] {file_path.name}: {status}")
    
    # Save QA dataset
    DATA_DIR.mkdir(exist_ok=True)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_qa, f, indent=2, ensure_ascii=False)
    
    # Summary
    print()
    print("="*50)
    print("QA Extraction Complete")
    print("="*50)
    print(f"Files processed: {processed}")
    print(f"Files skipped: {skipped}")
    print(f"Files failed: {failed}")
    print(f"Total QA pairs: {len(all_qa)}")
    print(f"Saved to: {OUTPUT_FILE}")


def main():
    """Entry point - runs the async main function"""
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
