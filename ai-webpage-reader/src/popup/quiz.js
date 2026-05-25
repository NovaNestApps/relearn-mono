/**
 * Quiz Mode Script
 * Interactive quiz with instant feedback, hints, and progress tracking
 */

// DOM Elements
const elements = {
  backBtn: document.getElementById('backBtn'),
  quizTitle: document.getElementById('quizTitle'),
  summaryTitle: document.getElementById('summaryTitle'),
  progressText: document.getElementById('progressText'),
  progressScore: document.getElementById('progressScore'),
  progressFill: document.getElementById('progressFill'),
  questionNumber: document.getElementById('questionNumber'),
  questionDifficulty: document.getElementById('questionDifficulty'),
  questionPoints: document.getElementById('questionPoints'),
  questionText: document.getElementById('questionText'),
  hintBtn: document.getElementById('hintBtn'),
  hintDisplay: document.getElementById('hintDisplay'),
  hintText: document.getElementById('hintText'),
  answerOptions: document.getElementById('answerOptions'),
  shortAnswerSection: document.getElementById('shortAnswerSection'),
  shortAnswerInput: document.getElementById('shortAnswerInput'),
  feedback: document.getElementById('feedback'),
  feedbackIcon: document.getElementById('feedbackIcon'),
  feedbackTitle: document.getElementById('feedbackTitle'),
  feedbackText: document.getElementById('feedbackText'),
  prevQuestionBtn: document.getElementById('prevQuestionBtn'),
  submitAnswerBtn: document.getElementById('submitAnswerBtn'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  resultsScreen: document.getElementById('resultsScreen'),
  resultsIcon: document.getElementById('resultsIcon'),
  resultsTitle: document.getElementById('resultsTitle'),
  scoreCircle: document.getElementById('scoreCircle'),
  scorePercentage: document.getElementById('scorePercentage'),
  scoreFraction: document.getElementById('scoreFraction'),
  correctCount: document.getElementById('correctCount'),
  incorrectCount: document.getElementById('incorrectCount'),
  timeSpent: document.getElementById('timeSpent'),
  reviewAnswersBtn: document.getElementById('reviewAnswersBtn'),
  finishQuizBtn: document.getElementById('finishQuizBtn'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

// State
let summaryId = null;
let quizIndex = null;
let summary = null;
let quiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let startTime = null;
let isAnswered = false;

/**
 * Initialize quiz mode
 */
async function initialize() {
  console.log('📝 Quiz mode initializing...');

  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  summaryId = urlParams.get('summaryId');
  quizIndex = parseInt(urlParams.get('quizIndex'));

  if (!summaryId || quizIndex === null) {
    alert('Invalid quiz parameters');
    window.close();
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load quiz
  await loadQuiz();

  // Start timer
  startTime = Date.now();

  console.log('✅ Quiz mode ready');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Back button
  elements.backBtn.addEventListener('click', () => {
    if (confirm('Exit quiz? Your progress will not be saved.')) {
      const url = chrome.runtime.getURL(`src/popup/details.html?id=${summaryId}`);
      chrome.tabs.update({ url: url });
    }
  });

  // Hint button
  elements.hintBtn.addEventListener('click', showHint);

  // Navigation buttons
  elements.prevQuestionBtn.addEventListener('click', previousQuestion);
  elements.submitAnswerBtn.addEventListener('click', submitAnswer);
  elements.nextQuestionBtn.addEventListener('click', nextQuestion);

  // Results actions
  elements.reviewAnswersBtn.addEventListener('click', reviewAnswers);
  elements.finishQuizBtn.addEventListener('click', finishQuiz);

  // Short answer input
  elements.shortAnswerInput.addEventListener('input', () => {
    const hasAnswer = elements.shortAnswerInput.value.trim().length > 0;
    elements.submitAnswerBtn.disabled = !hasAnswer;
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(e) {
  if (elements.resultsScreen.classList.contains('hidden')) {
    if (e.key === 'Enter' && !elements.submitAnswerBtn.disabled && !isAnswered) {
      e.preventDefault();
      submitAnswer();
    } else if (e.key === 'Enter' && !elements.nextQuestionBtn.classList.contains('hidden')) {
      e.preventDefault();
      nextQuestion();
    } else if (e.key === 'h' && !elements.hintBtn.classList.contains('hidden')) {
      e.preventDefault();
      showHint();
    }
  }
}

/**
 * Load quiz
 */
async function loadQuiz() {
  try {
    elements.loadingOverlay.classList.remove('hidden');

    // Get summary from storage
    summary = await StorageManager.getSummary(summaryId);

    if (!summary) {
      throw new Error('Summary not found');
    }

    const quizzes = summary.quizzes || [];
    
    if (quizIndex < 0 || quizIndex >= quizzes.length) {
      throw new Error('Quiz not found');
    }

    quiz = quizzes[quizIndex];

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('No questions found in quiz');
    }

    // Initialize user answers array
    userAnswers = new Array(quiz.questions.length).fill(null);

    // Update titles
    elements.quizTitle.textContent = quiz.title;
    elements.summaryTitle.textContent = summary.title;

    // Show first question
    showQuestion(0);

    elements.loadingOverlay.classList.add('hidden');

    console.log(`✅ Loaded quiz with ${quiz.questions.length} questions`);
  } catch (error) {
    console.error('Failed to load quiz:', error);
    alert('Failed to load quiz: ' + error.message);
    window.close();
  }
}

/**
 * Show question at index
 */
function showQuestion(index) {
  currentQuestionIndex = index;
  isAnswered = userAnswers[index] !== null;

  const question = quiz.questions[index];

  // Update question info
  elements.questionNumber.textContent = `Question ${index + 1}`;
  elements.questionDifficulty.textContent = (question.difficulty || 'medium').toUpperCase();
  elements.questionDifficulty.className = `question-difficulty ${question.difficulty || 'medium'}`;
  elements.questionPoints.textContent = `${question.points || 1} pts`;
  elements.questionText.textContent = question.question;

  // Show hint button if hint exists
  if (question.hint) {
    elements.hintBtn.classList.remove('hidden');
    elements.hintText.textContent = question.hint;
  } else {
    elements.hintBtn.classList.add('hidden');
  }

  // Hide hint display
  elements.hintDisplay.classList.add('hidden');

  // Render based on question type
  renderQuestion(question);

  // Update navigation
  updateNavigation();

  // Update progress
  updateProgress();

  // If already answered, show feedback
  if (isAnswered) {
    showFeedback(userAnswers[index].isCorrect);
  } else {
    elements.feedback.classList.add('hidden');
  }
}

/**
 * Render question based on type
 */
function renderQuestion(question) {
  // Reset all question types
  elements.answerOptions.innerHTML = '';
  elements.answerOptions.classList.add('hidden');
  elements.shortAnswerSection.classList.add('hidden');
  elements.submitAnswerBtn.disabled = true;

  if (question.type === 'multiple-choice') {
    renderMultipleChoice(question);
  } else if (question.type === 'true-false') {
    renderTrueFalse(question);
  } else if (question.type === 'short-answer') {
    renderShortAnswer(question);
  }
}

/**
 * Render multiple choice question
 */
function renderMultipleChoice(question) {
  elements.answerOptions.classList.remove('hidden');

  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer-option';
    button.textContent = option;
    button.dataset.option = option;

    // If already answered, show correct/incorrect
    if (isAnswered) {
      button.disabled = true;
      const userAnswer = userAnswers[currentQuestionIndex];
      
      if (option === question.correctAnswer) {
        button.classList.add('correct');
      }
      
      if (option === userAnswer.answer && !userAnswer.isCorrect) {
        button.classList.add('incorrect');
      }
    } else {
      button.addEventListener('click', () => selectOption(button, option));
    }

    elements.answerOptions.appendChild(button);
  });
}

/**
 * Render true/false question
 */
function renderTrueFalse(question) {
  elements.answerOptions.classList.remove('hidden');

  const options = ['True', 'False'];
  
  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'answer-option';
    button.textContent = option;
    button.dataset.option = option;

    // If already answered, show correct/incorrect
    if (isAnswered) {
      button.disabled = true;
      const userAnswer = userAnswers[currentQuestionIndex];
      const correctOption = question.correctAnswer ? 'True' : 'False';
      
      if (option === correctOption) {
        button.classList.add('correct');
      }
      
      if (option === userAnswer.answer && !userAnswer.isCorrect) {
        button.classList.add('incorrect');
      }
    } else {
      button.addEventListener('click', () => selectOption(button, option));
    }

    elements.answerOptions.appendChild(button);
  });
}

/**
 * Render short answer question
 */
function renderShortAnswer(question) {
  elements.shortAnswerSection.classList.remove('hidden');
  elements.shortAnswerInput.value = '';

  // If already answered, show the answer
  if (isAnswered) {
    const userAnswer = userAnswers[currentQuestionIndex];
    elements.shortAnswerInput.value = userAnswer.answer;
    elements.shortAnswerInput.disabled = true;
    elements.submitAnswerBtn.disabled = true;
  } else {
    elements.shortAnswerInput.disabled = false;
    elements.shortAnswerInput.focus();
  }
}

/**
 * Select an option (for multiple choice / true-false)
 */
function selectOption(button, option) {
  // Remove previous selection
  document.querySelectorAll('.answer-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  // Mark as selected
  button.classList.add('selected');

  // Enable submit button
  elements.submitAnswerBtn.disabled = false;
}

/**
 * Show hint
 */
function showHint() {
  elements.hintDisplay.classList.remove('hidden');
  elements.hintBtn.disabled = true;
}

/**
 * Submit answer
 */
function submitAnswer() {
  const question = quiz.questions[currentQuestionIndex];
  let userAnswer = null;
  let isCorrect = false;

  // Get user's answer based on question type
  if (question.type === 'multiple-choice') {
    const selectedOption = document.querySelector('.answer-option.selected');
    if (!selectedOption) return;
    
    userAnswer = selectedOption.dataset.option;
    isCorrect = userAnswer === question.correctAnswer;
    
  } else if (question.type === 'true-false') {
    const selectedOption = document.querySelector('.answer-option.selected');
    if (!selectedOption) return;
    
    userAnswer = selectedOption.dataset.option;
    const userBool = userAnswer === 'True';
    isCorrect = userBool === question.correctAnswer;
    
  } else if (question.type === 'short-answer') {
    userAnswer = elements.shortAnswerInput.value.trim();
    if (!userAnswer) return;
    
    // For short answer, we can't auto-grade, so mark as correct for now
    // In a real app, this would need manual review or more sophisticated checking
    isCorrect = true; // Auto-mark as correct for short answers
  }

  // Record the answer
  userAnswers[currentQuestionIndex] = {
    answer: userAnswer,
    isCorrect: isCorrect,
    questionType: question.type
  };

  // Update score
  if (isCorrect) {
    score += question.points || 1;
  }

  // Mark as answered
  isAnswered = true;

  // Show feedback
  showFeedback(isCorrect);

  // Update UI
  updateNavigation();
  updateProgress();

  // Disable answer inputs
  if (question.type === 'short-answer') {
    elements.shortAnswerInput.disabled = true;
  } else {
    document.querySelectorAll('.answer-option').forEach(opt => {
      opt.disabled = true;
    });
  }

  console.log('Answer submitted:', { userAnswer, isCorrect, score });
}

/**
 * Show feedback
 */
function showFeedback(isCorrect) {
  const question = quiz.questions[currentQuestionIndex];

  elements.feedback.classList.remove('hidden', 'correct', 'incorrect');
  elements.feedback.classList.add(isCorrect ? 'correct' : 'incorrect');

  elements.feedbackIcon.textContent = isCorrect ? '✓' : '✗';
  elements.feedbackTitle.textContent = isCorrect ? 'Correct!' : 'Incorrect';
  elements.feedbackText.textContent = question.explanation || '';

  // For short answer, show sample answer
  if (question.type === 'short-answer' && question.sampleAnswer) {
    elements.feedbackText.textContent = `Sample answer: ${question.sampleAnswer}`;
  }

  // Show correct answer for multiple choice/true-false
  if (!isCorrect && (question.type === 'multiple-choice' || question.type === 'true-false')) {
    document.querySelectorAll('.answer-option').forEach(opt => {
      const optionValue = opt.dataset.option;
      const correctAnswer = question.type === 'true-false' 
        ? (question.correctAnswer ? 'True' : 'False')
        : question.correctAnswer;
      
      if (optionValue === correctAnswer) {
        opt.classList.add('correct');
      }
      
      const userAnswer = userAnswers[currentQuestionIndex].answer;
      if (optionValue === userAnswer && !isCorrect) {
        opt.classList.add('incorrect');
      }
    });
  }

  // Show next button
  elements.submitAnswerBtn.classList.add('hidden');
  elements.nextQuestionBtn.classList.remove('hidden');
}

/**
 * Previous question
 */
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    showQuestion(currentQuestionIndex - 1);
  }
}

/**
 * Next question
 */
function nextQuestion() {
  if (currentQuestionIndex < quiz.questions.length - 1) {
    showQuestion(currentQuestionIndex + 1);
  } else {
    // Last question - show results
    showResults();
  }
}

/**
 * Update navigation buttons
 */
function updateNavigation() {
  elements.prevQuestionBtn.disabled = currentQuestionIndex === 0;

  if (isAnswered) {
    elements.submitAnswerBtn.classList.add('hidden');
    elements.nextQuestionBtn.classList.remove('hidden');
    
    if (currentQuestionIndex === quiz.questions.length - 1) {
      elements.nextQuestionBtn.textContent = 'See Results';
    } else {
      elements.nextQuestionBtn.innerHTML = `
        Next Question
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
    }
  } else {
    elements.submitAnswerBtn.classList.remove('hidden');
    elements.nextQuestionBtn.classList.add('hidden');
  }
}

/**
 * Update progress
 */
function updateProgress() {
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  elements.progressFill.style.width = `${progress}%`;
  
  elements.progressText.textContent = `Question ${currentQuestionIndex + 1} of ${quiz.questions.length}`;
  elements.progressScore.textContent = `Score: ${score} / ${quiz.totalPoints}`;
}

/**
 * Show results
 */
function showResults() {
  // Calculate stats
  const totalQuestions = quiz.questions.length;
  const correctAnswers = userAnswers.filter(a => a && a.isCorrect).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const percentage = Math.round((score / quiz.totalPoints) * 100);

  // Calculate time spent
  const timeMs = Date.now() - startTime;
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Update results
  elements.scorePercentage.textContent = `${percentage}%`;
  elements.scoreFraction.textContent = `${score} / ${quiz.totalPoints}`;
  elements.correctCount.textContent = correctAnswers;
  elements.incorrectCount.textContent = incorrectAnswers;
  elements.timeSpent.textContent = timeString;

  // Animate score circle
  const circumference = 2 * Math.PI * 90; // radius = 90
  const offset = circumference - (percentage / 100) * circumference;
  elements.scoreCircle.style.strokeDashoffset = offset;

  // Update icon and title based on performance
  if (percentage >= 90) {
    elements.resultsIcon.textContent = '🏆';
    elements.resultsTitle.textContent = 'Outstanding!';
  } else if (percentage >= 70) {
    elements.resultsIcon.textContent = '🎉';
    elements.resultsTitle.textContent = 'Great Job!';
  } else if (percentage >= 50) {
    elements.resultsIcon.textContent = '👍';
    elements.resultsTitle.textContent = 'Good Effort!';
  } else {
    elements.resultsIcon.textContent = '📚';
    elements.resultsTitle.textContent = 'Keep Practicing!';
  }

  // Save attempt to storage
  saveAttempt(percentage, timeMs);

  // Show results screen
  elements.resultsScreen.classList.remove('hidden');

  console.log('Quiz completed:', { score, percentage, correctAnswers, incorrectAnswers });
}

/**
 * Save quiz attempt
 */
async function saveAttempt(percentage, timeMs) {
  try {
    const attempt = {
      id: `attempt-${Date.now()}`,
      completedAt: new Date().toISOString(),
      score: score,
      totalPoints: quiz.totalPoints,
      percentage: percentage,
      answers: userAnswers.reduce((acc, answer, idx) => {
        acc[quiz.questions[idx].id] = answer ? answer.answer : null;
        return acc;
      }, {}),
      timeSpent: Math.floor(timeMs / 1000) // seconds
    };

    // Add attempt to quiz
    if (!quiz.attempts) {
      quiz.attempts = [];
    }
    quiz.attempts.push(attempt);

    // Update quiz in summary
    const updatedQuizzes = [...summary.quizzes];
    updatedQuizzes[quizIndex] = quiz;

    await StorageManager.updateSummary(summaryId, {
      quizzes: updatedQuizzes
    });

    console.log('✅ Quiz attempt saved');
  } catch (error) {
    console.error('Failed to save attempt:', error);
  }
}

/**
 * Review answers
 */
function reviewAnswers() {
  elements.resultsScreen.classList.add('hidden');
  showQuestion(0);
}

/**
 * Finish quiz
 */
function finishQuiz() {
  const url = chrome.runtime.getURL(`src/popup/details.html?id=${summaryId}`);
  window.location.href = url;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);