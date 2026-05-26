# Relearn — Chrome Extension

Chrome extension (Manifest V3) that reads any webpage with AI and generates summaries, Q&A, flashcards, quizzes, and pre-read assessments. Runs fully on-device — no account required.

## Features

- **AI-powered summaries** — structured markdown with TL;DR, key takeaways, facts, concepts
- **Q&A** — ask questions about the current page in context
- **Flashcard generation** — auto-generates study cards scaled to content length
- **Quiz generation** — multiple-choice, true/false, short-answer with difficulty levels
- **Pre-read quiz** — generate a knowledge-check quiz before reading a saved page
- **Study mode** — spaced-repetition flashcard review
- **Local-first** — all processing stays on-device by default
- **Multi-provider fallback** — Chrome AI → Ollama → WebLLM, automatic and silent

## Tech Stack

- Vanilla JavaScript (no framework, no build step)
- Chrome Extension Manifest V3
- Service Worker architecture with message-passing IPC
- Offscreen Document for Chrome AI / WebLLM API access
- Side Panel UI

## Project Structure

```
relearn-chrome-extension/
├── manifest.json
├── assets/icons/
└── src/
    ├── background/background.js        Service Worker — AI routing, message handling
    ├── content/content.js              Content script — DOM extraction
    ├── offscreen/
    │   ├── offscreen.html
    │   └── offscreen.js                Chrome AI / WebLLM (GPU) access
    ├── popup/
    │   ├── popup.html / popup.js       Main side panel — auth, reading, Q&A
    │   ├── summaries.html / .js        Saved summaries grid
    │   ├── details.html / .js          Summary detail + artifacts + pre-read quiz UI
    │   ├── study.html / .js            Flashcard spaced-repetition
    │   ├── quiz.html / .js             Interactive quiz
    │   └── storage.js                  chrome.storage.local abstraction
    ├── services/
    │   ├── ai-service.js               Unified AI provider with auto-fallback
    │   ├── chrome-ai.js                Chrome AI (Gemini Nano) provider
    │   ├── ollama-service.js           Ollama local server provider
    │   ├── webllm-service.js           WebLLM WASM browser provider
    │   ├── api-service.js              Backend API client (auth, sync, pretest)
    │   └── job-polling-service.js      Poll backend job status
    ├── ui/
    │   ├── notification.js
    │   └── notification.css
    └── utils/
        ├── dom-parser.js               Smart DOM extraction
        └── logger.js
```

## Installation

No build step required.

```
1. Open chrome://extensions/
2. Enable Developer mode (toggle, top right)
3. Click "Load unpacked" → select the relearn-chrome-extension/ folder
4. Pin the extension from the toolbar puzzle icon
```

## AI Provider Setup

Priority order: **Chrome AI → Ollama → WebLLM**

### Chrome AI (Recommended)

1. `chrome://flags` → enable **Prompt API for Gemini Nano**
2. `chrome://flags` → enable **Optimization Guide On Device Model** (BypassPerfRequirement)
3. Restart Chrome
4. `chrome://components` → **Optimization Guide On Device Model** → Check for update

### Ollama

```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
ollama pull llama3.2
```

Auto-detects at `http://127.0.0.1:11434`.

### WebLLM

Requires WebGPU (Chrome 113+). First run downloads ~2GB model. No setup needed.

## Usage

| Action | How |
|--------|-----|
| Read page | Click extension → **Read This Page** |
| Ask question | Click **Ask a Question** → type query |
| Quick read | `Alt + Shift + R` |
| View saved summaries | Click summaries icon in side panel |
| Pre-read quiz | Open a saved summary → **Pre-read Quiz** button |
| Study flashcards | Open a summary → **Study** |
| Take quiz | Open a summary → **Quiz** |

## Backend Integration (Optional)

For cloud sync and pretest features, the extension connects to `http://localhost:3001` (dev).

**Auth:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`

**Sync:**
- `GET/POST /api/summaries`
- `GET /api/flashcards`
- `GET /api/quizzes`
- `GET /api/job/:jobId/status`

**Pre-Testing:**
- `POST /api/pretest/generate`  — generate quiz before reading
- `POST /api/pretest/:id/submit` — submit answers

The extension works fully offline without a backend — backend sync is optional.

## Debugging

| Area | How to inspect |
|------|---------------|
| Service Worker | `chrome://extensions/` → extension → "service worker" link |
| Side panel | Right-click extension → **Inspect popup** |
| Content script | Page DevTools → Console (filter by extension) |
| Offscreen doc | `chrome://extensions/` → extension → offscreen |

## Storage

`chrome.storage.local` (10MB quota). Key namespaces: `summaries`, `settings`, `stats`, `auth_tokens`, `user_info`.

## Privacy

All AI inference runs on-device by default. No data leaves the browser unless the user explicitly logs in and saves summaries to the backend.
