# AI Webpage Reader — Chrome Extension

Chrome extension (Manifest V3) that reads any webpage with AI and generates summaries, Q&A, flashcards, and quizzes. Runs fully on-device — no account required.

## Features

- **AI-powered summaries** — structured markdown with TL;DR, key takeaways, facts, concepts
- **Q&A** — ask questions about the current page in context
- **Flashcard generation** — auto-generates study cards scaled to content length
- **Quiz generation** — multiple-choice, true/false, short-answer with difficulty levels
- **Study mode** — spaced-repetition flashcard review
- **Local-first** — all processing stays on-device by default
- **Multi-provider fallback** — Chrome AI → Ollama → WebLLM, automatic and silent

## Tech Stack

- Vanilla JavaScript (no framework, no build step)
- Chrome Extension Manifest V3
- Service Worker architecture with message-passing IPC
- Offscreen Document for Chrome AI / WebLLM API access
- Side Panel UI (not popup)

## Project Structure

```
relearn-chrome-extension/
├── manifest.json                    # Extension config (MV3)
├── assets/icons/                    # 16x16, 48x48, 128x128 PNGs
└── src/
    ├── background/
    │   └── background.js            # Service Worker — AI routing, message handling
    ├── content/
    │   └── content.js               # Runs on all pages — DOM extraction
    ├── offscreen/
    │   ├── offscreen.html           # Hidden page for Chrome AI / WebLLM
    │   └── offscreen.js             # Handles GPU/window.ai access
    ├── popup/
    │   ├── popup.html / popup.js    # Main side panel — auth, reading, Q&A
    │   ├── summaries.html / .js     # Saved summaries grid
    │   ├── details.html / .js       # Summary detail + artifact generation
    │   ├── study.html / .js         # Flashcard spaced-repetition
    │   ├── quiz.html / .js          # Interactive quiz with scoring
    │   └── storage.js               # chrome.storage.local abstraction
    ├── services/
    │   ├── ai-service.js            # Unified AI provider with auto-fallback
    │   ├── chrome-ai.js             # Chrome AI (Gemini Nano) provider
    │   ├── ollama-service.js        # Ollama local server provider
    │   ├── webllm-service.js        # WebLLM WASM browser provider
    │   ├── api-service.js           # Backend API client (auth, sync)
    │   └── job-polling-service.js   # Poll backend job status
    ├── ui/
    │   ├── notification.js          # Toast notification system
    │   └── notification.css
    └── utils/
        ├── dom-parser.js            # Smart DOM extraction (article/main/largest)
        └── logger.js                # Centralized logging
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

The extension tries providers in priority order: **Chrome AI → Ollama → WebLLM**

### Chrome AI (Recommended)

Gemini Nano runs on-device inside Chrome.

1. Go to `chrome://flags` → enable **Prompt API for Gemini Nano**
2. Go to `chrome://flags` → enable **Optimization Guide On Device Model** (BypassPerfRequirement)
3. Restart Chrome
4. Go to `chrome://components` → **Optimization Guide On Device Model** → Check for update

### Ollama (Local LLM Server)

```bash
# Install
brew install ollama

# Start server with extension CORS permission
OLLAMA_ORIGINS=chrome-extension://* ollama serve

# Pull a model
ollama pull llama3.2
```

The extension auto-detects Ollama at `http://127.0.0.1:11434` and selects the best available model (prefers Qwen2.5:14b or similar).

### WebLLM (Automatic Fallback)

Requires WebGPU (Chrome 113+). First run downloads ~2GB model and caches it. No setup needed.

## Usage

| Action | How |
|--------|-----|
| Read page | Click extension → **Read This Page** |
| Ask question | Click **Ask a Question** → type query |
| Quick read | `Alt + Shift + R` keyboard shortcut |
| View saved summaries | Click summaries icon in side panel |
| Study flashcards | Open a summary → **Study** |
| Take quiz | Open a summary → **Quiz** |

## Backend Integration (Optional)

For cloud sync, the extension connects to the backend API at `http://localhost:3001` (dev) or a configured production URL.

**Auth endpoints used:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`

**Sync endpoints used:**
- `GET/POST /api/summaries`
- `GET /api/flashcards`
- `GET /api/quizzes`
- `GET /api/job/:jobId/status`

The extension works fully offline without a backend — backend sync is optional.

## Debugging

| Area | How to inspect |
|------|---------------|
| Service Worker | `chrome://extensions/` → extension → "service worker" link |
| Side panel | Right-click extension → **Inspect popup** |
| Content script | Page DevTools → Console (filter by extension) |
| Offscreen doc | `chrome://extensions/` → extension → offscreen |

## Keyboard Shortcut

`Alt + Shift + R` — read current page. Configurable in `chrome://extensions/shortcuts`.

## Publishing to Chrome Web Store

```bash
# Zip extension (exclude dev files)
zip -r relearn-chrome-extension-v1.0.0.zip relearn-chrome-extension/ \
  -x "*.git*" "*.DS_Store" "*.idea*"
```

Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Storage

Uses `chrome.storage.local` with 10MB quota. Key namespaces: `summaries`, `settings`, `stats`, `auth_tokens`, `user_info`. Storage usage is tracked — warns at 75%, 90%, 95% capacity.

## Privacy

All AI inference runs on-device by default. No data leaves the browser unless the user explicitly logs in and saves summaries to the backend.
