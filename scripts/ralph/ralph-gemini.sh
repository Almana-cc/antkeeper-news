#!/bin/bash
# Ralph - Autonomous AI Agent Loop for Gemini CLI
# Runs Gemini repeatedly until all PRD tasks are complete

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MAX_ITERATIONS=${MAX_ITERATIONS:-10}
DELAY_SECONDS=${DELAY_SECONDS:-2}

# File paths
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
PROMPT_FILE="prompt.md"
LAST_BRANCH_FILE=".last-branch"
ARCHIVE_DIR="archive"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ralph - Gemini Agent Loop${NC}"
echo -e "${BLUE}========================================${NC}"

# Check required files exist
if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}Error: $PRD_FILE not found${NC}"
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: $PROMPT_FILE not found${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq"
    exit 1
fi

# Check if gemini CLI is installed
if ! command -v gemini &> /dev/null; then
    echo -e "${RED}Error: gemini CLI is required but not installed${NC}"
    echo "Install with: npm install -g @google/gemini-cli"
    exit 1
fi

# Get current branch from PRD
CURRENT_BRANCH=$(jq -r '.branchName' "$PRD_FILE")
echo -e "${YELLOW}Branch: $CURRENT_BRANCH${NC}"

# Archive previous run if branch changed
if [ -f "$LAST_BRANCH_FILE" ]; then
    LAST_BRANCH=$(cat "$LAST_BRANCH_FILE")
    if [ "$LAST_BRANCH" != "$CURRENT_BRANCH" ]; then
        echo -e "${YELLOW}Branch changed from $LAST_BRANCH to $CURRENT_BRANCH${NC}"
        echo -e "${YELLOW}Archiving previous run...${NC}"

        mkdir -p "$ARCHIVE_DIR"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        ARCHIVE_NAME="${LAST_BRANCH//\//_}_${TIMESTAMP}"
        mkdir -p "$ARCHIVE_DIR/$ARCHIVE_NAME"

        [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_DIR/$ARCHIVE_NAME/"
        [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_DIR/$ARCHIVE_NAME/"

        # Reset progress for new branch
        echo "" > "$PROGRESS_FILE"
        echo -e "${GREEN}Archived to: $ARCHIVE_DIR/$ARCHIVE_NAME${NC}"
    fi
fi

# Save current branch
echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"

# Show current PRD status
echo -e "\n${BLUE}PRD Status:${NC}"
jq -r '.userStories[] | "  \(.id): \(.title) - \(if .passes then "DONE" else "TODO" end)"' "$PRD_FILE"

echo -e "\n${BLUE}Starting Ralph loop (max $MAX_ITERATIONS iterations)...${NC}\n"

# Main loop
for ((i=1; i<=MAX_ITERATIONS; i++)); do
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Iteration $i of $MAX_ITERATIONS${NC}"
    echo -e "${YELLOW}========================================${NC}"

    # Build the full prompt with context
    FULL_PROMPT="$(cat "$PROMPT_FILE")

---
## Current PRD State
\`\`\`json
$(cat "$PRD_FILE")
\`\`\`

## Progress Log
\`\`\`
$(cat "$PROGRESS_FILE" 2>/dev/null || echo "No previous progress")
\`\`\`
"

    # Write prompt to temp file (handles large prompts better)
    TEMP_PROMPT=$(mktemp)
    echo "$FULL_PROMPT" > "$TEMP_PROMPT"

    # Run Gemini with --yolo for auto-approving tools
    echo -e "${BLUE}Running Gemini...${NC}"
    OUTPUT=$(gemini --yolo < "$TEMP_PROMPT" 2>&1) || true
    rm -f "$TEMP_PROMPT"

    echo "$OUTPUT"

    # Check for all-complete signal
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo -e "\n${GREEN}========================================${NC}"
        echo -e "${GREEN}  All stories complete!${NC}"
        echo -e "${GREEN}========================================${NC}"

        # Final PRD status
        echo -e "\n${BLUE}Final PRD Status:${NC}"
        jq -r '.userStories[] | "  \(.id): \(.title) - \(if .passes then "DONE" else "TODO" end)"' "$PRD_FILE"

        exit 0
    fi

    # Check for single-story-done signal (continue loop)
    if echo "$OUTPUT" | grep -q "<promise>STORY_DONE</promise>"; then
        echo -e "\n${GREEN}Story completed, continuing to next...${NC}"
    fi

    # Check remaining stories
    REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    echo -e "\n${YELLOW}Remaining stories: $REMAINING${NC}"

    if [ "$REMAINING" -eq 0 ]; then
        echo -e "\n${GREEN}All stories marked as complete!${NC}"
        exit 0
    fi

    # Delay before next iteration
    if [ $i -lt $MAX_ITERATIONS ]; then
        echo -e "${BLUE}Waiting ${DELAY_SECONDS}s before next iteration...${NC}\n"
        sleep $DELAY_SECONDS
    fi
done

echo -e "\n${RED}========================================${NC}"
echo -e "${RED}  Max iterations reached ($MAX_ITERATIONS)${NC}"
echo -e "${RED}========================================${NC}"

# Show remaining stories
echo -e "\n${YELLOW}Incomplete stories:${NC}"
jq -r '.userStories[] | select(.passes == false) | "  \(.id): \(.title)"' "$PRD_FILE"

exit 1
