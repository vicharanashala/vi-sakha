import json
import re
import sys
from pathlib import Path

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from bot.config import INSTRUCTORS, SYSTEM_AUTHORS, CLEANED_TRANSCRIPTS_DIR, BASE_DIR

# Input: scraped transcripts from transcript_scraper.py
SCRAPED_TRANSCRIPTS_DIR = BASE_DIR / "scraped_transcripts"

# Legacy single file input (for backward compatibility)
LEGACY_INPUT_FILE = BASE_DIR / "transcript_output.json"

OUTPUT_DIR = CLEANED_TRANSCRIPTS_DIR


def clean_text(text):
    """Remove mentions, links, and extra whitespace"""
    
    # Remove Discord-style mentions: <@123>, <@!123>, <@&123>, <#123>
    text = re.sub(r'<@[!&]?\d+>', '', text)       # user/role mentions
    text = re.sub(r'<#\d+>', '', text)            # channel mentions
    
    # Remove any leftover angle bracket pairs
    text = re.sub(r'<\s*>', '', text)
    
    text = re.sub(r'@\w+', '', text)              # remove @mentions
    text = re.sub(r'http\S+', '', text)           # remove links
    text = re.sub(r'\n+', ' ', text)              # remove newlines
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def extract_student_from_ticket(text):
    """Extract the student user ID from Ticket Tool's first message"""
    
    # Pattern: Discord mention format <@USER_ID>
    match = re.search(r'<@!?(\d+)>', text)
    if match:
        return match.group(1)  # Return user ID to lookup later
    
    # Fallback: @username format
    match = re.search(r'@(\w+)', text)
    if match:
        return match.group(1)
    
    return None


def find_username_by_id(messages, user_id):
    """Find the actual username from message list by user_id"""
    for msg in messages:
        if msg.get("user_id") == user_id:
            return msg.get("author")
    return None


def extract_reason_from_ticket(text):
    """Extract the student's issue from Ticket Tool message"""
    
    # Find "Reason :" and extract until TicketTool.xyz or end
    match = re.search(r'Reason\s*:\s*(.+?)(?:TicketTool\.xyz|Ticket\s*Tool|$)', text, re.DOTALL | re.IGNORECASE)
    
    if match:
        reason = match.group(1).strip()
        reason = clean_text(reason)
        return reason
    
    return None


def get_role(author, student_username=None):
    """Assign role based on author"""
    
    # Check if this is the student who opened the ticket
    if student_username and author.lower() == student_username.lower():
        return "Student"
    
    # Check if in instructors list
    if author in INSTRUCTORS:
        return "Instructor"
    
    # Default to Student for unknown authors
    return "Student"


def is_filler_message(text, role=None):
    """Check if message is just a filler/confirmation that adds no value"""
    
    text_lower = text.lower().strip()
    
    # Don't filter Yes/No from instructors - these are often substantive answers
    if role == "Instructor":
        filler_patterns = [
            r'^(ok|okay|thanks?|thank you|thankyou)[\.,!]*\s*(ma\'?am|sir)?[\.,!]*$',
            r'^(is your issue (resolved|clear))\s*\??$',
            r'^(closing this ticket|ticket closed).*$',
            r'^(we hope this|hope this helps).*$',
        ]
    else:
        # For students, also filter simple confirmations
        filler_patterns = [
            r'^(yes|ok|okay|thanks?|thank you|thankyou)[\.,!]*\s*(ma\'?am|sir)?[\.,!]*$',
            r'^(is your issue (resolved|clear))\s*\??$',
            r'^(closing this ticket|ticket closed).*$',
            r'^(we hope this|hope this helps).*$',
        ]
    
    for pattern in filler_patterns:
        if re.match(pattern, text_lower):
            return True
    
    return False


def remove_trailing_filler(text):
    """Remove filler phrases from the end of messages"""
    
    trailing_patterns = [
        r'\s*is your issue (resolved|clear)( now)?\s*\??\s*$',
        r'\s*we hope this (will make|makes) your doubts? clear\.?\s*$',
        r'\s*(as the issue has been resolved\s*)?closing this ticket\.?\s*$',
        r'\s*hope this helps\.?\s*$',
        r'\s*just this one and i am clear\.?\s*$',
        r'\s*thank you (very much|so much)?,?\s*(sir|ma\'?am)?\.?\s*$',
    ]
    
    # Apply patterns repeatedly until no more changes
    changed = True
    while changed:
        original = text
        for pattern in trailing_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        changed = (text != original)
    
    return text.strip()


def preprocess_transcript(data):
    """Process raw transcript data into clean messages"""
    
    cleaned_messages = []
    student_username = None
    student_user_id = None
    
    # First pass: find student user ID from first message
    for msg in data:
        if msg.get("index") == 1 and msg.get("author") == "Ticket Tool":
            content = msg.get("content", "")
            student_user_id = extract_student_from_ticket(content)
            # Look up actual username
            if student_user_id:
                student_username = find_username_by_id(data, student_user_id)
            break
    
    for msg in data:
        author = msg.get("author", "")
        index = msg.get("index", 0)
        
        # Handle different content formats
        content = msg.get("content", "")
        if isinstance(content, list):
            text = " ".join(content)
        else:
            text = str(content)
        
        # Get embeds (for Ticket Tool's Reason)
        embeds = msg.get("embeds", [])
        
        # HANDLE FIRST MESSAGE (Ticket Tool contains student issue)
        if index == 1 and author == "Ticket Tool":
            
            # Try to get Reason from embeds first (new format)
            student_issue = None
            for embed in embeds:
                desc = embed.get("description", "")
                if "Reason" in desc:
                    student_issue = extract_reason_from_ticket(desc)
                    break
            
            # Fallback to text content (old format)
            if not student_issue:
                student_issue = extract_reason_from_ticket(text)
            
            if student_issue and len(student_issue) > 10:
                cleaned_messages.append({
                    "role": "Student",
                    "author": student_username or "unknown",
                    "text": student_issue
                })
            
            continue
        
        # Skip system messages
        if author in SYSTEM_AUTHORS:
            continue
        
        text = clean_text(text)
        
        role = get_role(author, student_username)
        
        # Skip very short messages (but allow short instructor answers like "No", "Yes")
        if len(text) < 2:
            continue
        if len(text) < 5 and role != "Instructor":
            continue
        
        # Skip filler messages (role-aware)
        if is_filler_message(text, role):
            continue
        
        cleaned_messages.append({
            "role": role,
            "author": author,
            "text": text
        })
    
    return cleaned_messages


def merge_messages(messages):
    """
    Merge consecutive messages from same role.
    Tracks all unique authors when merging.
    """
    
    if not messages:
        return []
    
    merged = []
    current = messages[0].copy()
    current["authors"] = {current.get("author", "unknown")}

    for msg in messages[1:]:

        if msg["role"] == current["role"]:
            current["text"] += " " + msg["text"]
            current["authors"].add(msg.get("author", "unknown"))
        else:
            merged.append(current)
            current = msg.copy()
            current["authors"] = {current.get("author", "unknown")}

    merged.append(current)
    
    # Clean trailing filler from all messages
    for msg in merged:
        msg["text"] = remove_trailing_filler(msg["text"])

    return merged


def build_clean_conversation(messages):
    """Build formatted conversation string with usernames"""
    
    conversation = []

    for msg in messages:
        # Get authors (could be single or multiple if merged)
        authors = msg.get("authors", {msg.get("author", "unknown")})
        authors_str = ", ".join(sorted(authors))
        
        line = f"{msg['role']} ({authors_str}): {msg['text']}"
        conversation.append(line)

    return "\n\n".join(conversation)  # Double newline for readability


def process_single_transcript(input_path, output_path):
    """
    Process a single transcript file.
    
    Args:
        input_path: Path to scraped transcript JSON
        output_path: Path to save cleaned conversation
    
    Returns:
        Number of messages in cleaned conversation, or 0 if failed
    """
    try:
        with open(input_path, encoding="utf-8") as f:
            data = json.load(f)
        
        # Handle new scraped format with nested messages
        if isinstance(data, dict) and "messages" in data:
            messages_data = data["messages"]
        elif isinstance(data, list):
            messages_data = data
        else:
            print(f"  Unknown format in {input_path}")
            return 0
        
        cleaned = preprocess_transcript(messages_data)
        
        if not cleaned:
            return 0
        
        merged = merge_messages(cleaned)
        conversation = build_clean_conversation(merged)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(conversation)
        
        return len(merged)
    
    except Exception as e:
        print(f"  Error processing {input_path}: {e}")
        return 0


def process_all_transcripts():
    """
    Process all scraped transcripts from scraped_transcripts/ folder.
    
    Returns:
        Dict with processing statistics
    """
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    stats = {
        "processed": 0,
        "failed": 0,
        "total_messages": 0
    }
    
    # Check if scraped_transcripts directory exists
    if not SCRAPED_TRANSCRIPTS_DIR.exists():
        print(f"No scraped transcripts folder found: {SCRAPED_TRANSCRIPTS_DIR}")
        print("Run bot.scraper.transcript_scraper first")
        return stats
    
    # Get all JSON files
    transcript_files = list(SCRAPED_TRANSCRIPTS_DIR.glob("*.json"))
    
    if not transcript_files:
        print("No scraped transcripts found")
        return stats
    
    print(f"Found {len(transcript_files)} scraped transcripts")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    for input_path in transcript_files:
        # Generate output filename (change .json to .txt)
        output_name = input_path.stem + ".txt"
        output_path = OUTPUT_DIR / output_name
        
        msg_count = process_single_transcript(input_path, output_path)
        
        if msg_count > 0:
            print(f"  [OK] {input_path.name} -> {output_name} ({msg_count} messages)")
            stats["processed"] += 1
            stats["total_messages"] += msg_count
        else:
            print(f"  [SKIP] {input_path.name} (no valid messages)")
            stats["failed"] += 1
    
    print()
    print("="*50)
    print(f"Processed: {stats['processed']}")
    print(f"Failed: {stats['failed']}")
    print(f"Total messages: {stats['total_messages']}")
    
    return stats


def main():
    """Main function - process scraped transcripts or legacy single file"""
    
    # Check for scraped transcripts first (new pipeline)
    if SCRAPED_TRANSCRIPTS_DIR.exists() and any(SCRAPED_TRANSCRIPTS_DIR.glob("*.json")):
        print("Processing scraped transcripts...")
        process_all_transcripts()
    
    # Fallback to legacy single file
    elif LEGACY_INPUT_FILE.exists():
        print(f"Processing legacy file: {LEGACY_INPUT_FILE}")
        
        OUTPUT_DIR.mkdir(exist_ok=True)
        output_path = OUTPUT_DIR / "cleaned_conversation.txt"
        
        msg_count = process_single_transcript(LEGACY_INPUT_FILE, output_path)
        
        if msg_count > 0:
            print(f"Clean transcript saved → {output_path}")
            print(f"Total messages: {msg_count}")
        else:
            print("No messages to process")
    
    else:
        print("No transcripts found to process")
        print(f"  Expected: {SCRAPED_TRANSCRIPTS_DIR}/*.json")
        print(f"  Or: {LEGACY_INPUT_FILE}")


if __name__ == "__main__":
    main()
