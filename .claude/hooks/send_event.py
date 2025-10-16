#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "anthropic",
#     "python-dotenv",
# ]
# ///

"""
Multi-Agent Observability Hook Script
Sends Claude Code hook events to the observability server.
"""

import json
import sys
import os
import argparse
import urllib.request
import urllib.error
from datetime import datetime

# Optional: Import summarizer if available (requires additional setup)
try:
    from utils.summarizer import generate_event_summary
    HAS_SUMMARIZER = True
except ImportError:
    HAS_SUMMARIZER = False
    def generate_event_summary(event_data):
        """Placeholder when summarizer is not available"""
        return None

# Environment variables for configuration
SERVER_URL = os.getenv("OBSERVABILITY_SERVER_URL", "http://localhost:4000/events")
AUTH_TOKEN = os.getenv("OBSERVABILITY_AUTH_TOKEN", "")
ALLOWED_TRANSCRIPT_DIR = os.getenv("ALLOWED_TRANSCRIPT_DIR", os.path.expanduser("~/.config/claude"))

def send_event_to_server(event_data, server_url=None):
    """Send event data to the observability server."""
    try:
        # Use configured server URL if not provided
        url = server_url if server_url else SERVER_URL

        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Claude-Code-Hook/1.0'
        }
        if AUTH_TOKEN:
            headers['Authorization'] = f'Bearer {AUTH_TOKEN}'

        # Prepare the request
        req = urllib.request.Request(
            url,
            data=json.dumps(event_data).encode('utf-8'),
            headers=headers
        )
        
        # Send the request
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                return True
            else:
                print(f"Server returned status: {response.status}", file=sys.stderr)
                return False
                
    except urllib.error.URLError as e:
        print(f"Failed to send event: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return False

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Send Claude Code hook events to observability server')
    parser.add_argument('--source-app', required=True, help='Source application name')
    parser.add_argument('--event-type', required=True, help='Hook event type (PreToolUse, PostToolUse, etc.)')
    parser.add_argument('--server-url', default='http://localhost:4000/events', help='Server URL')
    parser.add_argument('--add-chat', action='store_true', help='Include chat transcript if available')
    parser.add_argument('--summarize', action='store_true', help='Generate AI summary of the event')
    
    args = parser.parse_args()
    
    try:
        # Read hook data from stdin
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON input: {e}", file=sys.stderr)
        input_data = {}  # Safe default
        sys.exit(0)  # Exit cleanly per line 119 principle
    
    # Prepare event data for server
    event_data = {
        'source_app': args.source_app,
        'session_id': input_data.get('session_id', 'unknown'),
        'hook_event_type': args.event_type,
        'payload': input_data,
        'timestamp': int(datetime.now().timestamp() * 1000)
    }
    
    # Handle --add-chat option
    if args.add_chat and 'transcript_path' in input_data:
        transcript_path = input_data['transcript_path']
        try:
            # Validate path is within allowed directory
            real_path = os.path.realpath(transcript_path)
            allowed_dir = os.path.realpath(ALLOWED_TRANSCRIPT_DIR)

            if not real_path.startswith(allowed_dir):
                print(f"Transcript path outside allowed directory: {transcript_path}", file=sys.stderr)
            else:
                # Read .jsonl file and convert to JSON array
                chat_data = []
                with open(real_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                chat_data.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass  # Skip invalid lines

                # Add chat to event data
                event_data['chat'] = chat_data
        except (OSError, IOError) as e:
            print(f"Failed to read transcript: {e}", file=sys.stderr)
    
    # Generate summary if requested
    if args.summarize:
        summary = generate_event_summary(event_data)
        if summary:
            event_data['summary'] = summary
        # Continue even if summary generation fails
    
    # Send to server
    success = send_event_to_server(event_data, args.server_url)
    
    # Always exit with 0 to not block Claude Code operations
    sys.exit(0)

if __name__ == '__main__':
    main()