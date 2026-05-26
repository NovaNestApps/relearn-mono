/**
 * Details Page Script
 * Displays a single summary with flashcards and quizzes
 * Includes AI generation and study/quiz modes
 */

// DOM Elements
const elements = {
  backBtn: document.getElementById('backBtn'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  copyBtn: document.getElementById('copyBtn'),
  openOriginalBtn: document.getElementById('openOriginalBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  createdDate: document.getElementById('createdDate'),
  wordCount: document.getElementById('wordCount'),
  readingTime: document.getElementById('readingTime'),
  provider: document.getElementById('provider'),
  summaryContent: document.getElementById('summaryContent'),
  flashcardsCount: document.getElementById('flashcardsCount'),
  flashcardsContainer: document.getElementById('flashcardsContainer'),
  emptyFlashcards: document.getElementById('emptyFlashcards'),
  createFlashcardsBtn: document.getElementById('createFlashcardsBtn'),
  quizzesCount: document.getElementById('quizzesCount'),
  quizzesContainer: document.getElementById('quizzesContainer'),
  emptyQuizzes: document.getElementById('emptyQuizzes'),
  createQuizBtn: document.getElementById('createQuizBtn'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  deleteModal: document.getElementById('deleteModal'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete'),
  flashcardsModal: document.getElementById('flashcardsModal'),
  closeFlashcardsModal: document.getElementById('closeFlashcardsModal'),
  quizModal: document.getElementById('quizModal'),
  closeQuizModal: document.getElementById('closeQuizModal'),
  pretestBtn: document.getElementById('pretestBtn'),
  pretestContainer: document.getElementById('pretestContainer')
};

// State
let currentSummary = null;
let summaryId = null;
let markdownReady = false;

// Pretest state
let pretestState = {
  step: 'idle', // idle | loading | quiz | result
  pretestId: null,
  questions: [],
  selected: [],
  current: 0,
  result: null
};

function renderPretest() {
  const { step, questions, selected, current, result } = pretestState;
  const c = elements.pretestContainer;
  c.innerHTML = '';

  if (step === 'idle') return;

  if (step === 'loading') {
    c.innerHTML = '<p style="color:#667085;font-size:13px">Generating questions…</p>';
    return;
  }

  if (step === 'quiz' && questions.length > 0) {
    const q = questions[current];
    const isLast = current === questions.length - 1;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    div.innerHTML = `
      <p style="font-size:11px;color:#98a2b3">Question ${current + 1} / ${questions.length}</p>
      <p style="font-weight:500;font-size:14px;margin:0">${q.question}</p>
    `;
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      const picked = selected[current] === opt;
      btn.textContent = opt;
      btn.style.cssText = `text-align:left;padding:8px 12px;border-radius:6px;border:1.5px solid ${picked ? '#6366f1' : '#e4e7ec'};background:${picked ? '#eef2ff' : 'white'};color:${picked ? '#4f46e5' : '#344054'};cursor:pointer;font-size:13px`;
      btn.onclick = () => {
        pretestState.selected[current] = opt;
        renderPretest();
      };
      div.appendChild(btn);
    });
    const actionBtn = document.createElement('button');
    actionBtn.className = 'btn-primary';
    actionBtn.style.marginTop = '4px';
    if (isLast) {
      actionBtn.textContent = 'Submit';
      actionBtn.disabled = !selected.every(s => s);
      actionBtn.onclick = submitPretest;
    } else {
      actionBtn.textContent = 'Next';
      actionBtn.disabled = !selected[current];
      actionBtn.onclick = () => { pretestState.current++; renderPretest(); };
    }
    div.appendChild(actionBtn);
    c.appendChild(div);
    return;
  }

  if (step === 'result' && result) {
    const pct = Math.round(result.score * 100);
    const numCorrect = result.correct.filter(Boolean).length;
    c.innerHTML = `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:36px;font-weight:700;color:#6366f1">${pct}%</div>
        <div style="color:#667085;font-size:13px;margin-top:4px">${numCorrect} / ${result.correct.length} correct</div>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:12px">
          ${result.correct.map((c, i) => `<span style="width:24px;height:24px;border-radius:50%;background:${c ? '#22c55e' : '#f87171'};display:inline-flex;align-items:center;justify-content:center;color:white;font-size:11px">${i + 1}</span>`).join('')}
        </div>
      </div>
    `;
  }
}

async function startPretest() {
  if (!currentSummary) return;
  pretestState = { step: 'loading', pretestId: null, questions: [], selected: [], current: 0, result: null };
  renderPretest();
  try {
    const res = await APIService.generatePretest(currentSummary.url, currentSummary.title || 'Untitled');
    if (!res.success) throw new Error(res.error);
    pretestState.pretestId = res.data.pretestId;
    pretestState.questions = res.data.questions;
    pretestState.selected = new Array(res.data.questions.length).fill('');
    pretestState.step = 'quiz';
  } catch (e) {
    pretestState.step = 'idle';
    elements.pretestContainer.innerHTML = `<p style="color:#f87171;font-size:13px">Failed: ${e.message}</p>`;
    return;
  }
  renderPretest();
}

async function submitPretest() {
  pretestState.step = 'loading';
  renderPretest();
  try {
    const res = await APIService.submitPretest(pretestState.pretestId, pretestState.selected, 'before');
    if (!res.success) throw new Error(res.error);
    pretestState.result = res.data;
    pretestState.step = 'result';
  } catch (e) {
    pretestState.step = 'quiz';
    elements.pretestContainer.querySelector && console.error('Submit failed', e);
  }
  renderPretest();
}

/**
 * Wait for markdown libraries to load
 */
/**
 * Wait for markdown libraries to load - IMPROVED
 */
function waitForMarkdown() {
  return new Promise((resolve) => {
    // Check immediately
    if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
      markdownReady = true;
      console.log('✅ Markdown libraries ready immediately');
      resolve(true);
      return;
    }
    
    console.log('⏳ Waiting for markdown libraries...');
    
    // Wait up to 5 seconds for libraries to load
    let attempts = 0;
    const maxAttempts = 50; // 50 * 100ms = 5 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      const markedAvailable = typeof marked !== 'undefined';
      const hljsAvailable = typeof hljs !== 'undefined';
      
      console.log(`Attempt ${attempts}: marked=${markedAvailable}, hljs=${hljsAvailable}`);
      
      if (markedAvailable && hljsAvailable) {
        markdownReady = true;
        console.log('✅ Markdown libraries loaded after', attempts * 100, 'ms');
        clearInterval(checkInterval);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ Markdown libraries failed to load after 5 seconds');
        console.warn('marked available:', markedAvailable);
        console.warn('hljs available:', hljsAvailable);
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Initialize page
 */
async function initialize() {
  console.log('🚀 Details page initializing...');

  // Wait for markdown
  await waitForMarkdown();
  console.log('📚 Markdown libraries:', markdownReady ? 'Ready' : 'Not available');

  // Get summary ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  summaryId = urlParams.get('id');

  if (!summaryId) {
    showError('No summary ID provided');
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load summary
  await loadSummary();
  await loadQuizzes();
  console.log('✅ Details page ready');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Back button
  elements.backBtn.addEventListener('click', () => {
    const url = chrome.runtime.getURL('src/popup/summaries.html');
    chrome.tabs.update({ url: url });
  });

  // Copy button
  elements.copyBtn.addEventListener('click', copySummary);

  // Open original button
  elements.openOriginalBtn.addEventListener('click', () => {
    if (currentSummary) {
      chrome.tabs.create({ url: currentSummary.url });
    }
  });

  // Delete button
  elements.deleteBtn.addEventListener('click', () => {
    elements.deleteModal.classList.remove('hidden');
  });

  // Delete modal
  elements.cancelDelete.addEventListener('click', () => {
    elements.deleteModal.classList.add('hidden');
  });
  elements.confirmDelete.addEventListener('click', deleteSummary);

  // Pre-test
  elements.pretestBtn.addEventListener('click', startPretest);

  // Create flashcards
  elements.createFlashcardsBtn.addEventListener('click', createFlashcards);
  elements.closeFlashcardsModal.addEventListener('click', () => {
    elements.flashcardsModal.classList.add('hidden');
  });

  // Create quiz
  elements.createQuizBtn.addEventListener('click', createQuiz);
  elements.closeQuizModal.addEventListener('click', () => {
    elements.quizModal.classList.add('hidden');
  });

  // Close modals on overlay click
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) {
      elements.deleteModal.classList.add('hidden');
    }
  });
  elements.flashcardsModal.addEventListener('click', (e) => {
    if (e.target === elements.flashcardsModal) {
      elements.flashcardsModal.classList.add('hidden');
    }
  });
  elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) {
      elements.quizModal.classList.add('hidden');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      elements.deleteModal.classList.add('hidden');
      elements.flashcardsModal.classList.add('hidden');
      elements.quizModal.classList.add('hidden');
    }
  });
}

/**
 * Load summary
 */
async function loadSummary() {
  try {
    showLoading('Loading summary...');

    // Get summary from storage
    currentSummary = await StorageManager.getSummary(summaryId);

    if (!currentSummary) {
      throw new Error('Summary not found');
    }

    console.log('✅ Summary loaded:', currentSummary);

    // Update UI
    updatePageInfo();
    updateMetadata();
    renderSummary();
    renderFlashcards();
    renderQuizzes();

    hideLoading();
  } catch (error) {
    console.error('Failed to load summary:', error);
    hideLoading();
    showError('Failed to load summary: ' + error.message);
  }
}

/**
 * Update page info
 */
function updatePageInfo() {
  elements.pageTitle.textContent = currentSummary.title;
  elements.pageUrl.textContent = getDomain(currentSummary.url);
  elements.pageUrl.href = currentSummary.url;
  document.title = currentSummary.title + ' - Relearn';
}

/**
 * Update metadata
 */
function updateMetadata() {
  elements.createdDate.textContent = formatDate(currentSummary.createdAt);
  elements.wordCount.textContent = `${currentSummary.wordCount || 0} words`;
  elements.readingTime.textContent = `${currentSummary.metadata?.readingTime || 0} min`;
  elements.provider.textContent = currentSummary.provider || 'AI';
}

/**
 * Render summary with markdown
 */
/**
 * Render summary with markdown
 */
/**
 * Render summary with markdown - COMPREHENSIVE FIX
 */
function renderSummary() {
  console.log('🎨 Rendering summary...');
  console.log('📚 Markdown ready:', markdownReady);
  console.log('📦 marked available:', typeof marked !== 'undefined');
  console.log('📦 hljs available:', typeof hljs !== 'undefined');
  
  // Add markdown-body class
  elements.summaryContent.classList.add('markdown-body');
  
  // Check if markdown is available
  if (markdownReady && typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    try {
      console.log('✅ Using marked.js for rendering');
      
      // Configure marked
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        pedantic: false
      });

      // Parse markdown
      const htmlContent = marked.parse(currentSummary.summary);
      elements.summaryContent.innerHTML = htmlContent;

      // Apply syntax highlighting to code blocks
      elements.summaryContent.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
      
      console.log('✅ Markdown rendered successfully');
    } catch (error) {
      console.error('❌ Markdown rendering failed:', error);
      // Fallback to manual parsing
      renderMarkdownManually(currentSummary.summary);
    }
  } else {
    console.warn('⚠️ Markdown libraries not available, using manual parsing');
    // Fallback to manual parsing
    renderMarkdownManually(currentSummary.summary);
  }
}

/**
 * Manual markdown parsing fallback
 */
function renderMarkdownManually(text) {
  console.log('🔧 Using manual markdown parsing');
  
  let html = text;
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Convert inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Convert lists
  const lines = html.split('\n');
  let inList = false;
  let inOrderedList = false;
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for unordered list
    if (line.match(/^[-*+]\s/)) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
        inOrderedList = false;
      }
      line = '<li>' + line.replace(/^[-*+]\s/, '') + '</li>';
    }
    // Check for ordered list
    else if (line.match(/^\d+\.\s/)) {
      if (!inOrderedList) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push('<ol>');
        inOrderedList = true;
      }
      line = '<li>' + line.replace(/^\d+\.\s/, '') + '</li>';
    }
    // Not a list item
    else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      
      // Add paragraph tags for non-empty lines that aren't headers
      if (line.trim() && !line.match(/^<h[1-6]>/)) {
        line = '<p>' + line + '</p>';
      }
    }
    
    result.push(line);
  }
  
  // Close any open lists
  if (inList) result.push('</ul>');
  if (inOrderedList) result.push('</ol>');
  
  html = result.join('\n');
  
  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  
  elements.summaryContent.innerHTML = html;
  console.log('✅ Manual markdown parsing complete');
}

/**
 * Render flashcards
 */
/**
 * Render flashcards - FIXED
 */
function renderFlashcards() {
  const flashcards = currentSummary.flashcards || [];
  elements.flashcardsCount.textContent = flashcards.length;

  // Clear container
  elements.flashcardsContainer.innerHTML = '';

  if (flashcards.length === 0) {
    elements.emptyFlashcards.classList.remove('hidden');
    return;
  }

  elements.emptyFlashcards.classList.add('hidden');

  // Add "Study Mode" button if there are flashcards
  const studyBtn = document.createElement('button');
  studyBtn.className = 'btn-primary';
  studyBtn.style.marginBottom = '16px';
  studyBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
    Start Study Mode (${flashcards.length} cards)
  `;
  studyBtn.addEventListener('click', () => startStudyMode(flashcards));
  elements.flashcardsContainer.appendChild(studyBtn);

  // Create cards grid container
  const cardsGrid = document.createElement('div');
  cardsGrid.className = 'flashcards-grid';

  flashcards.forEach(card => {
    const cardElement = createFlashcardElement(card);
    cardsGrid.appendChild(cardElement);
  });

  elements.flashcardsContainer.appendChild(cardsGrid);
}

/**
 * Create flashcard element - FIXED
 */
function createFlashcardElement(card) {
  const div = document.createElement('div');
  div.className = 'flashcard';
  
  const tagsHtml = card.tags && card.tags.length > 0
    ? `<div class="flashcard-tags">
        ${card.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>`
    : '';

  const difficultyColors = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444'
  };
  const difficultyColor = difficultyColors[card.difficulty] || '#6b7280';

  div.innerHTML = `
    <div class="flashcard-front">${escapeHtml(card.front)}</div>
    <div class="flashcard-back">${escapeHtml(card.back)}</div>
    ${tagsHtml}
    <div class="flashcard-difficulty" style="color: ${difficultyColor};">
      ${(card.difficulty || 'medium').toUpperCase()}
    </div>
  `;

  return div;
}

/**
 * Create flashcard element
 */
function createFlashcardElement(card) {
  const div = document.createElement('div');
  div.className = 'flashcard';
  
  const tagsHtml = card.tags && card.tags.length > 0
    ? `<div class="flashcard-tags">
        ${card.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>`
    : '';

  const difficultyColor = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444'
  }[card.difficulty] || '#6b7280';

  div.innerHTML = `
    <div class="flashcard-front">${escapeHtml(card.front)}</div>
    <div class="flashcard-back">${escapeHtml(card.back)}</div>
    ${tagsHtml}
    <div style="margin-top: 8px; font-size: 11px; color: ${difficultyColor}; font-weight: 600;">
      ${card.difficulty?.toUpperCase() || 'MEDIUM'}
    </div>
  `;

  return div;
}

/**
 * Render quizzes
 */
function renderQuizzes() {
  const quizzes = currentSummary.quizzes || [];
  elements.quizzesCount.textContent = quizzes.length;

  if (quizzes.length === 0) {
    elements.emptyQuizzes.classList.remove('hidden');
    elements.quizzesContainer.innerHTML = '';
    return;
  }

  elements.emptyQuizzes.classList.add('hidden');
  elements.quizzesContainer.innerHTML = '';

  quizzes.forEach((quiz, index) => {
    const quizElement = createQuizElement(quiz, index);
    elements.quizzesContainer.appendChild(quizElement);
  });
}

/**
 * Create quiz element
 */
function createQuizElement(quiz, quizIndex) {
  const div = document.createElement('div');
  div.className = 'quiz-card';

  const attempts = quiz.attempts || [];
  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map(a => a.percentage))
    : null;

  div.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-title">${escapeHtml(quiz.title)}</div>
      <div class="quiz-points">${quiz.totalPoints} pts</div>
    </div>
    <div class="quiz-meta">
      <div class="quiz-meta-item">
        <span>📝</span>
        <span>${quiz.questions.length} questions</span>
      </div>
      ${attempts.length > 0 ? `
        <div class="quiz-meta-item">
          <span>📊</span>
          <span>${attempts.length} attempts</span>
        </div>
      ` : ''}
      ${bestScore !== null ? `
        <div class="quiz-meta-item">
          <span>🏆</span>
          <span>Best: ${bestScore}%</span>
        </div>
      ` : ''}
    </div>
  `;

  div.addEventListener('click', () => {
    startQuizMode(quiz, quizIndex);
  });

  return div;
}

/**
 * Create flashcards using AI
 */
async function createFlashcards() {
  try {
    elements.flashcardsModal.classList.remove('hidden');
    const preSyncSummary = currentSummary ? { ...currentSummary } : null;
    
    console.log('🤖 Requesting AI to generate flashcards...');

    // Call background script to generate flashcards
    const response = await chrome.runtime.sendMessage({
      action: 'generateFlashcards',
      data: {
        title: currentSummary.title,
        url: currentSummary.url,
        pageContent: currentSummary.pageContent,
        wordCount: currentSummary.wordCount
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate flashcards');
    }

    console.log('✅ AI generated flashcards:', response.flashcards);

    // Add flashcards to summary
    const result = await StorageManager.addFlashcards(summaryId, response.flashcards);

    if (result.success) {
      currentSummary = result.summary;
      renderFlashcards();
      elements.flashcardsModal.classList.add('hidden');
      console.log('✅ Flashcards saved');

      // Save to backend if authenticated
      try {
        console.log('🔎 Flashcard sync check:', {
          hasAPIService: !!window.APIService,
          flashcardCount: Array.isArray(response.flashcards) ? response.flashcards.length : 0,
          backendSummaryId: currentSummary?.backendSummaryId || preSyncSummary?.backendSummaryId || null,
          backendPageId: currentSummary?.backendPageId || preSyncSummary?.backendPageId || null,
          pageId: currentSummary?.pageId || preSyncSummary?.pageId || null
        });

        const isAuth = await APIService.isAuthenticated();
        console.log('🔎 Flashcard sync auth:', { isAuth });
        if (isAuth && Array.isArray(response.flashcards) && response.flashcards.length > 0) {
          let backendPageId =
            currentSummary?.backendPageId ||
            currentSummary?.pageId ||
            preSyncSummary?.backendPageId ||
            preSyncSummary?.pageId ||
            null;

          const backendSummaryId =
            currentSummary?.backendSummaryId ||
            preSyncSummary?.backendSummaryId ||
            null;

          // If pageId is not on the local summary, derive it from backend summary.
          if (!backendPageId && backendSummaryId) {
            console.log('🔎 Resolving backend pageId from backend summary:', backendSummaryId);
            const summaryResponse = await APIService.getSummary(backendSummaryId);
            if (summaryResponse.success) {
              const backendSummary = summaryResponse.data?.summary || summaryResponse.data;
              backendPageId = backendSummary?.pageId || null;
            }
          }

          if (backendPageId) {
            console.log('📤 Saving flashcards to backend...');
            const backendResponse = await APIService.createFlashcards(backendPageId, response.flashcards);

            if (backendResponse.success) {
              console.log(
                `✅ Flashcards synced to backend: ${backendResponse.data.createdCount}/${response.flashcards.length}`
              );
            } else {
              console.warn('⚠️ Failed to fully sync flashcards to backend:', backendResponse.error, backendResponse.data);
            }
          } else {
            console.warn('⚠️ Could not resolve backend pageId for flashcard sync', {
              backendSummaryId,
              currentSummary,
              preSyncSummary
            });
          }
        } else {
          console.warn('⚠️ Flashcard sync skipped', {
            isAuth,
            hasFlashcards: Array.isArray(response.flashcards) && response.flashcards.length > 0
          });
        }
      } catch (backendError) {
        console.error('❌ Backend flashcard sync error:', backendError);
        // Don't block - local save succeeded
      }
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Failed to create flashcards:', error);
    elements.flashcardsModal.classList.add('hidden');
    alert('Failed to create flashcards: ' + error.message);
  }
}

/**
 * Create quiz using AI
 */
async function createQuiz() {
    try {
        elements.quizModal.classList.remove('hidden');

        console.log('🤖 Requesting AI to generate quiz...');

        // Call background script to generate quiz
        const response = await chrome.runtime.sendMessage({
            action: 'generateQuiz',
            data: {
                title: currentSummary.title,
                url: currentSummary.url,
                pageContent: currentSummary.pageContent,
                wordCount: currentSummary.wordCount
            }
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to generate quiz');
        }

        console.log('✅ AI generated quiz:', response.quiz);

        // Save to local storage
        const result = await StorageManager.addQuiz(summaryId, response.quiz);

        if (!result.success) {
            throw new Error(result.error);
        }

        currentSummary = result.summary;
        console.log('✅ Quiz saved locally');

        // Save to backend if authenticated
        try {
            const isAuth = await APIService.isAuthenticated();
            if (isAuth && currentSummary.backendSummaryId) {
                console.log('📤 Saving quiz to backend...');

                const backendResponse = await APIService.createQuiz(
                    currentSummary.backendSummaryId,
                    response.quiz.questions
                );

                if (backendResponse.success) {
                    console.log('✅ Quiz saved to backend:', backendResponse.data.quiz.id);
                } else {
                    console.warn('⚠️ Failed to save quiz to backend:', backendResponse.error);
                }
            }
        } catch (backendError) {
            console.error('❌ Backend save error:', backendError);
            // Don't block - local save succeeded
        }

        renderQuizzes();
        elements.quizModal.classList.add('hidden');

    } catch (error) {
        console.error('Failed to create quiz:', error);
        elements.quizModal.classList.add('hidden');
        alert('Failed to create quiz: ' + error.message);
    }
}

// Load quizzes from backend and merge with local
async function loadQuizzes() {
    if (!currentSummary.backendSummaryId) {
        console.log('No backend summary ID, showing local only');
        return;
    }

    try {
        const isAuth = await APIService.isAuthenticated();
        if (!isAuth) {
            console.log('Not authenticated, showing local only');
            return;
        }

        console.log('📥 Fetching quizzes from backend...');
        const response = await APIService.getQuizzes(currentSummary.backendSummaryId);

        if (response.success && response.data.quizzes) {
            console.log(`✅ Loaded ${response.data.quizzes.length} quizzes from backend`);

            // Merge backend quizzes with local ones
            const backendQuizzes = response.data.quizzes;
            const localQuizzes = currentSummary.quizzes || [];

            // Add backend quizzes that aren't already local
            backendQuizzes.forEach(backendQuiz => {
                const existsLocally = localQuizzes.some(q => q.id === backendQuiz.id);
                if (!existsLocally) {
                    localQuizzes.push({
                        id: backendQuiz.id,
                        title: backendQuiz.title || 'Quiz',
                        questions: backendQuiz.questions,
                        createdAt: backendQuiz.createdAt,
                        fromBackend: true
                    });
                }
            });

            currentSummary.quizzes = localQuizzes;
            renderQuizzes();
        }
    } catch (error) {
        console.error('Error loading quizzes from backend:', error);
    }
}

/**
 * Start study mode for flashcards
 */
function startStudyMode(flashcards) {
  // Open study mode in a new tab
  const studyUrl = chrome.runtime.getURL(`src/popup/study.html?summaryId=${summaryId}`);
  chrome.tabs.create({ url: studyUrl });
}

/**
 * Start quiz mode
 */
function startQuizMode(quiz, quizIndex) {
  // Open quiz mode in a new tab
  const quizUrl = chrome.runtime.getURL(`src/popup/quiz.html?summaryId=${summaryId}&quizIndex=${quizIndex}`);
  chrome.tabs.create({ url: quizUrl });
}

/**
 * Copy summary to clipboard
 */
async function copySummary() {
  try {
    await navigator.clipboard.writeText(currentSummary.summary);
    
    const originalHTML = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    setTimeout(() => {
      elements.copyBtn.innerHTML = originalHTML;
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    alert('Failed to copy to clipboard');
  }
}

/**
 * Delete summary
 */
async function deleteSummary() {
  try {
    showLoading('Deleting summary...');
    elements.deleteModal.classList.add('hidden');

    const result = await StorageManager.deleteSummary(summaryId);

    if (result.success) {
      console.log('✅ Summary deleted');
      
      const url = chrome.runtime.getURL('src/popup/summaries.html');
      setTimeout(() => {
        window.location.href = url;
      }, 500);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Delete failed:', error);
    hideLoading();
    alert('Failed to delete summary: ' + error.message);
  }
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show loading
 */
function showLoading(text = 'Loading...') {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading
 */
function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

/**
 * Show error
 */
function showError(message) {
  hideLoading();
  alert(message);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
