"""
Transcript Scraper - Downloads and parses HTML transcripts from Discord CDN.

The HTML files contain base64-encoded JSON transcript data.
No browser needed - uses direct HTTP download and parsing.

Reads URLs from data/transcript_urls.json (output of discord_channel.py)
Downloads each HTML, extracts base64 data, decodes to JSON
Saves each transcript as JSON in scraped_transcripts/ folder

Usage:
    python -m bot.scraper.transcript_scraper           # Process all URLs
    python -m bot.scraper.transcript_scraper --limit 5 # Process only 5 URLs
"""

import json
import re
import base64
import time
import sys
from datetime import datetime
from pathlib import Path

import requests

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from bot.config import DATA_DIR, BASE_DIR

# Output directory for scraped transcripts
SCRAPED_TRANSCRIPTS_DIR = BASE_DIR / "scraped_transcripts"
TRANSCRIPT_URLS_FILE = DATA_DIR / "transcript_urls.json"

# Track processed transcripts to avoid duplicates
PROCESSED_LOG_FILE = DATA_DIR / "processed_transcripts.json"


def load_processed_log():
    """Load list of already processed transcript filenames"""
    try:
        with open(PROCESSED_LOG_FILE, "r") as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def save_processed_log(processed):
    """Save list of processed transcript filenames"""
    DATA_DIR.mkdir(exist_ok=True)
    with open(PROCESSED_LOG_FILE, "w") as f:
        json.dump(list(processed), f, indent=2)


def generate_output_filename(original_filename, timestamp):
    """Generate output filename with timestamp prefix"""
    # Parse timestamp like "2026-02-28T08:51:00.000000+00:00"
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        date_prefix = dt.strftime("%Y%m%d_%H%M")
    except:
        date_prefix = datetime.now().strftime("%Y%m%d_%H%M")
    
    # Extract transcript number from filename like "transcript-closed-0178.html"
    match = re.search(r'transcript[^\d]*(\d+)', original_filename, re.IGNORECASE)
    if match:
        transcript_num = match.group(1)
        return f"{date_prefix}_transcript_{transcript_num}.json"
    
    # Fallback: use cleaned filename
    base_name = Path(original_filename).stem
    return f"{date_prefix}_{base_name}.json"


def download_and_parse_transcript(url):
    """
    Download HTML file and extract transcript data.
    
    The HTML contains base64-encoded JSON in JavaScript variables:
    - let messages = "base64data";
    - let channel = "base64data";
    - let server = "base64data";
    
    Returns: Dict with messages, channel info, server info, or None if failed
    """
    try:
        # Download HTML content
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        html_content = response.text
        
        # Extract base64-encoded messages variable
        messages_match = re.search(r'let messages\s*=\s*"([A-Za-z0-9+/=]+)"', html_content)
        if not messages_match:
            print(f"    Could not find messages data in HTML")
            return None
        
        messages_b64 = messages_match.group(1)
        
        # Decode base64 to JSON
        try:
            messages_json = base64.b64decode(messages_b64).decode('utf-8')
            messages = json.loads(messages_json)
        except Exception as e:
            print(f"    Failed to decode messages: {e}")
            return None
        
        # Extract channel info (optional)
        channel_info = None
        channel_match = re.search(r'let channel\s*=\s*"([A-Za-z0-9+/=]+)"', html_content)
        if channel_match:
            try:
                channel_json = base64.b64decode(channel_match.group(1)).decode('utf-8')
                channel_info = json.loads(channel_json)
            except:
                pass
        
        # Extract server info (optional)
        server_info = None
        server_match = re.search(r'let server\s*=\s*"([A-Za-z0-9+/=]+)"', html_content)
        if server_match:
            try:
                server_json = base64.b64decode(server_match.group(1)).decode('utf-8')
                server_info = json.loads(server_json)
            except:
                pass
        
        # Structure the output
        structured_messages = []
        for i, msg in enumerate(messages):
            structured_messages.append({
                "index": i + 1,
                "author": msg.get("username"),
                "user_id": msg.get("user_id"),
                "is_bot": msg.get("bot", False),
                "content": msg.get("content", ""),
                "embeds": msg.get("embeds", []),
                "created": msg.get("created"),
                "edited": msg.get("edited")
            })
        
        return {
            "messages": structured_messages,
            "channel": channel_info,
            "server": server_info,
            "message_count": len(structured_messages)
        }
    
    except requests.RequestException as e:
        print(f"    Download failed: {e}")
        return None
    except Exception as e:
        print(f"    Error parsing: {e}")
        return None


def process_transcripts(limit=None, skip_processed=True):
    """
    Process all transcript URLs from transcript_urls.json
    
    Args:
        limit: Maximum number of transcripts to process (None = all)
        skip_processed: Skip already processed transcripts
    
    Returns:
        Dict with processing statistics
    """
    # Load transcript URLs
    if not TRANSCRIPT_URLS_FILE.exists():
        print(f"Error: {TRANSCRIPT_URLS_FILE} not found")
        print("Run bot.scraper.discord_channel first to extract transcript URLs from Discord")
        return {"error": "No transcript URLs file"}
    
    with open(TRANSCRIPT_URLS_FILE, "r") as f:
        data = json.load(f)
    
    transcripts = data.get("transcripts", [])
    print(f"Found {len(transcripts)} transcript URLs")
    
    # Load processed log
    processed = load_processed_log() if skip_processed else set()
    
    # Filter out already processed
    to_process = [t for t in transcripts if t["filename"] not in processed]
    
    if skip_processed:
        print(f"Already processed: {len(transcripts) - len(to_process)}")
        print(f"To process: {len(to_process)}")
    
    if limit:
        to_process = to_process[:limit]
        print(f"Limited to: {limit}")
    
    if not to_process:
        print("No new transcripts to process")
        return {"processed": 0, "skipped": len(transcripts)}
    
    # Create output directory
    SCRAPED_TRANSCRIPTS_DIR.mkdir(exist_ok=True)
    
    # Statistics
    stats = {
        "processed": 0,
        "failed": 0,
        "skipped": len(transcripts) - len(to_process),
        "files": []
    }
    
    print("\nStarting download...")
    
    # Process each transcript
    for i, transcript in enumerate(to_process, 1):
        filename = transcript["filename"]
        url = transcript["url"]
        timestamp = transcript.get("timestamp", "")
        
        print(f"\n[{i}/{len(to_process)}] Processing: {filename}")
        
        # Download and parse
        result = download_and_parse_transcript(url)
        
        if result:
            # Generate output filename
            output_name = generate_output_filename(filename, timestamp)
            output_path = SCRAPED_TRANSCRIPTS_DIR / output_name
            
            # Save JSON
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"    Saved: {output_name} ({result['message_count']} messages)")
            
            # Mark as processed
            processed.add(filename)
            stats["processed"] += 1
            stats["files"].append(str(output_path))
        else:
            print(f"    Failed to parse")
            stats["failed"] += 1
        
        # Small delay to be nice to the server
        time.sleep(0.5)
    
    # Save processed log
    save_processed_log(processed)
    
    # Print summary
    print("\n" + "="*50)
    print("Scraping Complete")
    print("="*50)
    print(f"Processed: {stats['processed']}")
    print(f"Failed: {stats['failed']}")
    print(f"Skipped (already done): {stats['skipped']}")
    print(f"\nOutput directory: {SCRAPED_TRANSCRIPTS_DIR}")
    
    return stats


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Scrape Ticket Tool transcripts")
    parser.add_argument("--limit", type=int, help="Max transcripts to process")
    parser.add_argument("--all", action="store_true", help="Reprocess all (ignore processed log)")
    
    args = parser.parse_args()
    
    process_transcripts(
        limit=args.limit,
        skip_processed=not args.all
    )


if __name__ == "__main__":
    main()
