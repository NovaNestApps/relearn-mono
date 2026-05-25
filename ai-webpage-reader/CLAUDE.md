# AI Webpage Reader — Claude Instructions

## Project Type

Chrome Extension, Manifest V3. Vanilla JavaScript only — no TypeScript, no build step, no npm. Load unpacked directly in Chrome.

## Key Constraints

- **No build step.** Changes take effect after reloading the extension (`chrome://extensions/` → reload button).
- **No npm/node_modules.** External libraries live in `src/popup/libs/` as vendored files.
- **Manifest V3 service worker.** Background scripts are service workers — no persistent state, no DOM access, no `window` object.
- **Offscreen document required** for Chrome AI (`window.ai`) and WebLLM (WebGPU). These APIs are unavailable in service workers.
- **Message-passing IPC.** All communication between content scripts, service worker, offscreen doc, and UI uses `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`.

## Architecture

```
Content Script (dom-parser.js, content.js)
  → chrome.runtime.sendMessage("extractContent")
Background Service Worker (background.js)
  → AIService.generate(content)
    → ChromeAI → offscreen.js (window.ai)
    → OllamaService → HTTP localhost:11434
    → WebLLMService → offscreen.js (WebGPU)
  → chrome.runtime.sendMessage(result) → Side Panel UI
```

## Key Files

| File | Role |
|------|------|
| `manifest.json` | Extension config — permissions, content scripts, side panel, service worker |
| `src/background/background.js` | Service worker — routes all messages, coordinates AI calls |
| `src/services/ai-service.js` | Provider abstraction with fallback logic — edit here to add new providers |
| `src/services/chrome-ai.js` | Chrome AI (Gemini Nano) via offscreen document |
| `src/services/ollama-service.js` | HTTP client to localhost Ollama |
| `src/services/webllm-service.js` | Browser WASM inference via offscreen document |
| `src/content/content.js` | Content script — triggers extraction on demand |
| `src/utils/dom-parser.js` | DOM extraction — article > main > [role=main] > largest element |
| `src/popup/storage.js` | `chrome.storage.local` wrapper — all persistence goes through here |
| `src/services/api-service.js` | Backend HTTP client — base URL `http://localhost:3001` |

## Adding a New AI Provider

1. Create `src/services/my-provider.js`
2. Export `{ initialize, generate, generateStream, getStatus }`
3. Import in `src/services/ai-service.js` and add to provider array
4. Update fallback priority order in `ai-service.js`

## Storage Keys

| Key | Content |
|-----|---------|
| `summaries` | Array of saved summary objects |
| `settings` | User preferences (preferred provider, etc.) |
| `stats` | Usage statistics |
| `auth_tokens` | `{ accessToken, refreshToken }` |
| `user_info` | `{ id, email, name }` |

## Message Types (Service Worker)

Common message actions passed via `chrome.runtime.sendMessage`:
- `extractContent` — content script extracts DOM, returns page data
- `generateSummary` — background generates summary via AIService
- `generateFlashcards` — background generates flashcard JSON
- `generateQuiz` — background generates quiz JSON
- `getProviderStatus` — returns status of all three providers

## UI Pages (Side Panel)

| File | Route opened by |
|------|----------------|
| `popup.html` | Default side panel open |
| `summaries.html` | Summaries list view |
| `details.html` | Single summary detail |
| `study.html` | Flashcard study mode |
| `quiz.html` | Interactive quiz |

Navigation between pages uses `window.location.href = chrome.runtime.getURL('src/popup/page.html')`.

## Debugging Tips

- Reload extension after every JS change: `chrome://extensions/` → reload button
- Service worker console: `chrome://extensions/` → "service worker" link next to extension
- Offscreen document doesn't appear in DevTools; add `console.log` and check service worker console
- Content script logs appear in the page's DevTools Console

## Common Gotchas

- Service workers terminate after ~30 seconds of inactivity. Don't store state in module-level variables — use `chrome.storage.local`.
- `chrome.offscreen.createDocument` throws if an offscreen doc already exists — always check with `chrome.offscreen.hasDocument()` first.
- Ollama requires `OLLAMA_ORIGINS=chrome-extension://*` env var when starting the server, otherwise CORS blocks extension requests.
- `window.ai` API is experimental. Check `window.ai?.languageModel?.capabilities()` before assuming availability.

## No Tests Currently

The `tests/` directory exists but is empty. Manual testing workflow: reload extension → navigate to a page → trigger read action → verify output in side panel.
