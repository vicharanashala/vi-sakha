"""
Discord Channel Scraper - Extracts transcript URLs from Discord messages.

Output: data/transcript_urls.json with list of transcript URLs to process
"""

import requests
import json
import sys
from datetime import datetime
from pathlib import Path

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from bot.config import DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID, DOWNLOADS_DIR, DATA_DIR

headers = {
    "Authorization": f"Bot {DISCORD_BOT_TOKEN}"
}


def fetch_messages(before=None):
    """Fetch messages from Discord channel"""
    url = f"https://discord.com/api/v10/channels/{DISCORD_CHANNEL_ID}/messages?limit=100"
    if before:
        url += f"&before={before}"
    response = requests.get(url, headers=headers)
    return response.json()


def extract_transcript_urls(messages):
    """Extract transcript HTML URLs from message attachments"""
    transcript_urls = []
    
    for message in messages:
        msg_id = message.get("id")
        msg_timestamp = message.get("timestamp", "")
        
        # Check attachments for HTML transcript files
        for attachment in message.get("attachments", []):
            filename = attachment.get("filename", "")
            
            if filename.endswith(".html") and "transcript" in filename.lower():
                transcript_urls.append({
                    "message_id": msg_id,
                    "filename": filename,
                    "url": attachment["url"],
                    "size": attachment.get("size", 0),
                    "timestamp": msg_timestamp
                })
    
    return transcript_urls


def main():
    """Main function to fetch messages and extract transcript URLs"""
    
    print("Fetching messages from Discord channel...")
    
    all_messages = []
    last_message_id = None
    
    while True:
        messages = fetch_messages(last_message_id)
        
        if not messages or isinstance(messages, dict):
            if isinstance(messages, dict):
                print(f"API Error: {messages}")
            break
        
        all_messages.extend(messages)
        print(f"  Fetched {len(all_messages)} messages...")
        
        if len(messages) < 100:
            break
        
        last_message_id = messages[-1]["id"]
    
    print(f"\nTotal messages fetched: {len(all_messages)}")
    
    # Extract transcript URLs
    transcript_urls = extract_transcript_urls(all_messages)
    print(f"Found {len(transcript_urls)} transcript attachments")
    
    # Save to JSON
    DATA_DIR.mkdir(exist_ok=True)
    output_path = DATA_DIR / "transcript_urls.json"
    
    output_data = {
        "scraped_at": datetime.now().isoformat(),
        "channel_id": DISCORD_CHANNEL_ID,
        "total_messages": len(all_messages),
        "transcripts": transcript_urls
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nSaved transcript URLs to: {output_path}")
    
    # Print summary
    for i, t in enumerate(transcript_urls[:5], 1):
        print(f"  {i}. {t['filename']}")
    
    if len(transcript_urls) > 5:
        print(f"  ... and {len(transcript_urls) - 5} more")
    
    return transcript_urls


if __name__ == "__main__":
    main()
