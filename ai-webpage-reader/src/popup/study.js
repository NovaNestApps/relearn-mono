/**
 * Study Mode Script
 * Spaced repetition flashcard study with know/don't know tracking
 */

// DOM Elements
const elements = {
  backBtn: document.getElementById('backBtn'),
  summaryTitle: document.getElementById('summaryTitle'),
  progressText: document.getElementById('progressText'),
  progressStats: document.getElementById('progressStats'),
  progressFill: document.getElementById('progressFill'),
  flashcardContainer: document.getElementById('flashcardContainer'),
  flashcardInner: document.getElementById('flashcardInner'),
  cardFront: document.getElementById('cardFront'),
  cardBack: document.getElementById('cardBack'),
  cardTags: document.getElementById('cardTags'),
  actionButtons: document.getElementById('actionButtons'),
  navButtons: document.getElementById('navButtons'),
  dontKnowBtn: document.getElementById('dontKnowBtn'),
  knowBtn: document.getElementById('knowBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  completionScreen: document.getElementById('completionScreen'),
  totalCards: document.getElementById('totalCards'),
  knownCards: document.getElementById('knownCards'),
  unknownCards: document.getElementById('unknownCards'),
  reviewAgainBtn: document.getElementById('reviewAgainBtn'),
  finishBtn: document.getElementById('finishBtn'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

// State
let summaryId = null;
let summary = null;
let flashcards = [];
let currentIndex = 0;
let isFlipped = false;
let studyStats = {
  known: 0,
  dontKnow: 0,
  reviewed: []
};

/**
 * Initialize study mode
 */
async function initialize() {
  console.log('🎓 Study mode initializing...');

  // Get summary ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  summaryId = urlParams.get('summaryId');

  if (!summaryId) {
    alert('No summary ID provided');
    window.close();
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load flashcards
  await loadFlashcards();

  console.log('✅ Study mode ready');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Back button
  elements.backBtn.addEventListener('click', () => {
    if (confirm('Exit study mode? Your progress will not be saved.')) {
      const url = chrome.runtime.getURL(`src/popup/details.html?id=${summaryId}`);
      chrome.tabs.update({ url: url });
    }
  });

  // Flashcard flip
  elements.flashcardContainer.addEventListener('click', flipCard);

  // Action buttons
  elements.dontKnowBtn.addEventListener('click', () => markCard(false));
  elements.knowBtn.addEventListener('click', () => markCard(true));

  // Navigation buttons
  elements.prevBtn.addEventListener('click', previousCard);
  elements.nextBtn.addEventListener('click', nextCard);

  // Completion actions
  elements.reviewAgainBtn.addEventListener('click', reviewAgain);
  elements.finishBtn.addEventListener('click', finishStudy);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(e) {
  if (elements.completionScreen.classList.contains('hidden')) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (isFlipped) {
        // Card is flipped, do nothing (user should use know/don't know buttons)
      } else {
        flipCard();
      }
    } else if (e.key === 'ArrowLeft' && !elements.prevBtn.disabled) {
      e.preventDefault();
      previousCard();
    } else if (e.key === 'ArrowRight' && !elements.nextBtn.disabled) {
      e.preventDefault();
      nextCard();
    } else if (isFlipped) {
      if (e.key === '1' || e.key === 'x') {
        e.preventDefault();
        markCard(false); // Don't know
      } else if (e.key === '2' || e.key === 'c') {
        e.preventDefault();
        markCard(true); // Know
      }
    }
  }
}

/**
 * Load flashcards
 */
async function loadFlashcards() {
  try {
    elements.loadingOverlay.classList.remove('hidden');

    // Get summary from storage
    summary = await StorageManager.getSummary(summaryId);

    if (!summary) {
      throw new Error('Summary not found');
    }

    flashcards = summary.flashcards || [];

    if (flashcards.length === 0) {
      throw new Error('No flashcards found');
    }

    // Shuffle flashcards for variety
    flashcards = shuffleArray([...flashcards]);

    // Update title
    elements.summaryTitle.textContent = summary.title;

    // Initialize study stats
    studyStats.reviewed = new Array(flashcards.length).fill(null);

    // Show first card
    showCard(0);

    elements.loadingOverlay.classList.add('hidden');

    console.log(`✅ Loaded ${flashcards.length} flashcards`);
  } catch (error) {
    console.error('Failed to load flashcards:', error);
    alert('Failed to load flashcards: ' + error.message);
    window.close();
  }
}

/**
 * Shuffle array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Show card at index
 */
function showCard(index) {
  currentIndex = index;
  isFlipped = false;

  const card = flashcards[index];

  // Update card content
  elements.cardFront.textContent = card.front;
  elements.cardBack.textContent = card.back;

  // Update tags
  elements.cardTags.innerHTML = '';
  if (card.tags && card.tags.length > 0) {
    card.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      elements.cardTags.appendChild(tagEl);
    });
  }

  // Reset flip state
  elements.flashcardContainer.classList.remove('flipped');

  // Show/hide appropriate buttons
  elements.actionButtons.classList.add('hidden');
  elements.navButtons.classList.remove('hidden');

  // Update navigation buttons
  elements.prevBtn.disabled = index === 0;
  elements.nextBtn.disabled = false;

  // Update progress
  updateProgress();
}

/**
 * Flip card
 */
function flipCard() {
  if (isFlipped) return; // Don't flip back

  isFlipped = true;
  elements.flashcardContainer.classList.add('flipped');

  // Show action buttons, hide nav buttons
  setTimeout(() => {
    elements.actionButtons.classList.remove('hidden');
    elements.navButtons.classList.add('hidden');
  }, 300);
}

/**
 * Mark card as known or not known
 */
function markCard(known) {
  // Record the result
  studyStats.reviewed[currentIndex] = known;

  if (known) {
    studyStats.known++;
  } else {
    studyStats.dontKnow++;
  }

  // Update flashcard in storage with spaced repetition data
  const card = flashcards[currentIndex];
  card.lastReviewed = new Date().toISOString();
  
  if (known) {
    card.correctCount = (card.correctCount || 0) + 1;
  } else {
    card.incorrectCount = (card.incorrectCount || 0) + 1;
  }

  // Save to storage
  saveProgress();

  // Move to next card or show completion
  if (currentIndex < flashcards.length - 1) {
    showCard(currentIndex + 1);
  } else {
    showCompletion();
  }
}

/**
 * Previous card
 */
function previousCard() {
  if (currentIndex > 0) {
    showCard(currentIndex - 1);
  }
}

/**
 * Next card
 */
function nextCard() {
  if (currentIndex < flashcards.length - 1) {
    showCard(currentIndex + 1);
  }
}

/**
 * Update progress bar
 */
function updateProgress() {
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  elements.progressFill.style.width = `${progress}%`;
  
  elements.progressText.textContent = `Card ${currentIndex + 1} of ${flashcards.length}`;
  elements.progressStats.textContent = `Know: ${studyStats.known} | Don't Know: ${studyStats.dontKnow}`;
}

/**
 * Save progress to storage
 */
async function saveProgress() {
  try {
    // Update the summary with new flashcard stats
    const updatedFlashcards = flashcards.map((card, idx) => {
      // Find original card by matching front text
      const originalCard = summary.flashcards.find(c => c.front === card.front);
      return originalCard ? { ...originalCard, ...card } : card;
    });

    await StorageManager.updateSummary(summaryId, {
      flashcards: updatedFlashcards
    });

    console.log('✅ Progress saved');
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

/**
 * Show completion screen
 */
function showCompletion() {
  elements.totalCards.textContent = flashcards.length;
  elements.knownCards.textContent = studyStats.known;
  elements.unknownCards.textContent = studyStats.dontKnow;

  elements.completionScreen.classList.remove('hidden');

  console.log('🎉 Study session complete:', studyStats);
}

/**
 * Review again (only cards marked as don't know)
 */
function reviewAgain() {
  // Filter cards that were marked as don't know
  const cardsToReview = [];
  studyStats.reviewed.forEach((known, idx) => {
    if (known === false) {
      cardsToReview.push(flashcards[idx]);
    }
  });

  if (cardsToReview.length === 0) {
    alert('Great! You know all the cards. Nothing to review.');
    return;
  }

  // Reset state
  flashcards = shuffleArray(cardsToReview);
  currentIndex = 0;
  studyStats = {
    known: 0,
    dontKnow: 0,
    reviewed: new Array(flashcards.length).fill(null)
  };

  // Hide completion screen
  elements.completionScreen.classList.add('hidden');

  // Show first card
  showCard(0);
}

/**
 * Finish study and return to details
 */
function finishStudy() {
  const url = chrome.runtime.getURL(`src/popup/details.html?id=${summaryId}`);
  window.location.href = url;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);