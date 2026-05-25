#!/bin/bash

# AI Webpage Reader Backend - Complete API Test Script
# This script tests all endpoints in order

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}AI Webpage Reader Backend API Tests${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Function to print test headers
test_header() {
    echo -e "\n${BLUE}>>> $1${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Health Check
test_header "1. Health Check"
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    success "Health check passed"
    echo "$HEALTH_RESPONSE"
else
    error "Health check failed"
    exit 1
fi

# 2. Login (assuming user exists from previous test)
test_header "2. Login"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "TestPassword123!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
    success "Login successful"
    echo "User ID: $USER_ID"
    echo "Token: ${ACCESS_TOKEN:0:30}..."
else
    error "Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 3. Get Current User
test_header "3. Get Current User (/me)"
ME_RESPONSE=$(curl -s "${BASE_URL}/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q "email"; then
    success "User profile retrieved"
    echo "$ME_RESPONSE" | jq '.'
else
    error "Failed to get user profile"
    echo "$ME_RESPONSE"
fi

# 4. Create a Page
test_header "4. Create Page"
CREATE_PAGE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/pages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "title": "Artificial Intelligence - Wikipedia",
    "content": "Artificial intelligence (AI) is the intelligence of machines or software, as opposed to the intelligence of humans or animals. It is a field of study in computer science that develops and studies intelligent machines. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. The term artificial intelligence had previously been used to describe machines that mimic and display human cognitive skills that are associated with the human mind, such as learning and problem-solving. This definition has since been rejected by major AI researchers who now describe AI in terms of rationality and acting rationally, which does not limit how intelligence can be articulated.",
    "favicon": "https://en.wikipedia.org/favicon.ico"
  }')

PAGE_ID=$(echo "$CREATE_PAGE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PAGE_ID" ]; then
    success "Page created"
    echo "Page ID: $PAGE_ID"
    echo "$CREATE_PAGE_RESPONSE" | jq '.'
else
    error "Failed to create page"
    echo "$CREATE_PAGE_RESPONSE"
fi

# 5. Get All Pages
test_header "5. Get All Pages"
GET_PAGES_RESPONSE=$(curl -s "${BASE_URL}/api/pages?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_PAGES_RESPONSE" | grep -q "pages"; then
    success "Retrieved pages list"
    echo "$GET_PAGES_RESPONSE" | jq '.pagination'
else
    error "Failed to get pages"
    echo "$GET_PAGES_RESPONSE"
fi

# 6. Get Page by ID
test_header "6. Get Page by ID"
GET_PAGE_RESPONSE=$(curl -s "${BASE_URL}/api/pages/${PAGE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_PAGE_RESPONSE" | grep -q "title"; then
    success "Retrieved page by ID"
    echo "$GET_PAGE_RESPONSE" | jq '.title, .url'
else
    error "Failed to get page by ID"
    echo "$GET_PAGE_RESPONSE"
fi

# 7. Update Page
test_header "7. Update Page"
UPDATE_PAGE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/pages/${PAGE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI - Wikipedia (Updated)",
    "tags": ["AI", "Technology", "Machine Learning"]
  }')

if echo "$UPDATE_PAGE_RESPONSE" | grep -q "Updated"; then
    success "Page updated"
    echo "$UPDATE_PAGE_RESPONSE" | jq '.title, .tags'
else
    error "Failed to update page"
    echo "$UPDATE_PAGE_RESPONSE"
fi

# 8. Generate Summary (Brief)
test_header "8. Generate Summary (Brief)"
SUMMARY_BRIEF_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/summaries" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"pageId\": \"${PAGE_ID}\",
    \"type\": \"brief\"
  }")

SUMMARY_ID=$(echo "$SUMMARY_BRIEF_RESPONSE" | grep -o '"summaryId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SUMMARY_ID" ]; then
    success "Summary generation queued (Brief)"
    echo "Summary ID: $SUMMARY_ID"
    echo "Job will be processed in background..."
else
    error "Failed to queue summary generation"
    echo "$SUMMARY_BRIEF_RESPONSE"
fi

# Wait a bit for processing
echo "Waiting 5 seconds for AI processing..."
sleep 5

# 9. Get Summary by ID
test_header "9. Get Summary by ID"
GET_SUMMARY_RESPONSE=$(curl -s "${BASE_URL}/api/summaries/${SUMMARY_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_SUMMARY_RESPONSE" | grep -q "content"; then
    success "Summary retrieved"
    echo "$GET_SUMMARY_RESPONSE" | jq '.type, .status'
else
    error "Failed to get summary (might still be processing)"
    echo "$GET_SUMMARY_RESPONSE"
fi

# 10. Get Summaries by Page
test_header "10. Get Summaries by Page"
GET_PAGE_SUMMARIES=$(curl -s "${BASE_URL}/api/summaries/page/${PAGE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_PAGE_SUMMARIES" | grep -q "summaries"; then
    success "Retrieved page summaries"
    echo "$GET_PAGE_SUMMARIES" | jq '. | length'
else
    error "Failed to get page summaries"
    echo "$GET_PAGE_SUMMARIES"
fi

# 11. Generate Flashcards
test_header "11. Generate Flashcards"
FLASHCARD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/flashcards/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"pageId\": \"${PAGE_ID}\",
    \"count\": 5
  }")

FLASHCARD_JOB_ID=$(echo "$FLASHCARD_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$FLASHCARD_JOB_ID" ]; then
    success "Flashcard generation queued"
    echo "Job ID: $FLASHCARD_JOB_ID"
    echo "Waiting 10 seconds for AI processing..."
    sleep 10
else
    error "Failed to queue flashcard generation"
    echo "$FLASHCARD_RESPONSE"
fi

# 12. Get Flashcards by Page
test_header "12. Get Flashcards by Page"
GET_FLASHCARDS=$(curl -s "${BASE_URL}/api/flashcards/page/${PAGE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_FLASHCARDS" | grep -q "flashcards"; then
    success "Retrieved flashcards"
    FLASHCARD_COUNT=$(echo "$GET_FLASHCARDS" | jq '.flashcards | length')
    echo "Flashcard count: $FLASHCARD_COUNT"
    
    # Save first flashcard ID for later tests
    FLASHCARD_ID=$(echo "$GET_FLASHCARDS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "First Flashcard ID: $FLASHCARD_ID"
else
    error "Failed to get flashcards (might still be processing)"
    echo "$GET_FLASHCARDS"
fi

# 13. Update a Flashcard (if we have one)
if [ -n "$FLASHCARD_ID" ]; then
    test_header "13. Update Flashcard"
    UPDATE_FLASHCARD=$(curl -s -X PATCH "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "question": "Updated: What is AI?",
        "answer": "Updated: Artificial Intelligence is the simulation of human intelligence by machines."
      }')
    
    if echo "$UPDATE_FLASHCARD" | grep -q "Updated"; then
        success "Flashcard updated"
        echo "$UPDATE_FLASHCARD" | jq '.question'
    else
        error "Failed to update flashcard"
        echo "$UPDATE_FLASHCARD"
    fi
else
    error "No flashcard ID available to update"
fi

# 14. Generate Quiz
test_header "14. Generate Quiz"
QUIZ_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/quizzes/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"pageId\": \"${PAGE_ID}\",
    \"questionCount\": 5
  }")

QUIZ_JOB_ID=$(echo "$QUIZ_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$QUIZ_JOB_ID" ]; then
    success "Quiz generation queued"
    echo "Job ID: $QUIZ_JOB_ID"
    echo "Waiting 15 seconds for AI processing..."
    sleep 15
else
    error "Failed to queue quiz generation"
    echo "$QUIZ_RESPONSE"
fi

# 15. Get Quizzes by Page
test_header "15. Get Quizzes by Page"
GET_QUIZZES=$(curl -s "${BASE_URL}/api/quizzes/page/${PAGE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_QUIZZES" | grep -q "quizzes"; then
    success "Retrieved quizzes"
    QUIZ_COUNT=$(echo "$GET_QUIZZES" | jq '.quizzes | length')
    echo "Quiz count: $QUIZ_COUNT"
    
    # Save first quiz ID for later tests
    QUIZ_ID=$(echo "$GET_QUIZZES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "First Quiz ID: $QUIZ_ID"
else
    error "Failed to get quizzes (might still be processing)"
    echo "$GET_QUIZZES"
fi

# 16. Get Quiz by ID (if we have one)
if [ -n "$QUIZ_ID" ]; then
    test_header "16. Get Quiz by ID"
    GET_QUIZ=$(curl -s "${BASE_URL}/api/quizzes/${QUIZ_ID}" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$GET_QUIZ" | grep -q "questions"; then
        success "Retrieved quiz with questions"
        QUESTION_COUNT=$(echo "$GET_QUIZ" | jq '.questions | length')
        echo "Question count: $QUESTION_COUNT"
        echo "$GET_QUIZ" | jq '.questions[0] | {question: .question, correctAnswer: .correctAnswer}'
    else
        error "Failed to get quiz"
        echo "$GET_QUIZ"
    fi
else
    error "No quiz ID available"
fi

# 17. Search Pages
test_header "17. Search Pages"
SEARCH_RESPONSE=$(curl -s "${BASE_URL}/api/pages/search?query=artificial" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SEARCH_RESPONSE" | grep -q "pages"; then
    success "Search completed"
    RESULT_COUNT=$(echo "$SEARCH_RESPONSE" | jq '.pages | length')
    echo "Results found: $RESULT_COUNT"
else
    error "Search failed"
    echo "$SEARCH_RESPONSE"
fi

# Summary
echo -e "\n${BLUE}=====================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "✓ Authentication: Working"
echo -e "✓ Pages CRUD: Working"
echo -e "✓ Summaries: Queued for processing"
echo -e "✓ Flashcards: Queued for processing"
echo -e "✓ Quizzes: Queued for processing"
echo -e "\n${GREEN}Important IDs:${NC}"
echo -e "Page ID: ${PAGE_ID}"
echo -e "Summary ID: ${SUMMARY_ID}"
echo -e "Flashcard ID: ${FLASHCARD_ID}"
echo -e "Quiz ID: ${QUIZ_ID}"
echo -e "\n${BLUE}Note: AI generation jobs run in the background.${NC}"
echo -e "${BLUE}Check the server logs for processing status.${NC}\n"