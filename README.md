# flyagent-js

> **AI agents that run entirely in your browser.** No backend server. No Docker. Just a `<script>` tag and an API key.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

FlyAgent-js is a lightweight, browser-native AI agent framework. It calls LLMs (OpenAI, Gemini, Kimi) directly from the browser, executes JavaScript tools on the user's device, and can see, interact with, and manipulate the current webpage.

---

## ✨ What Makes This Different

| Capability | Server Agent | **Browser Agent (flyagent-js)** |
|---|---|---|
| See the current webpage | ❌ | ✅ Read DOM, styles, meta tags |
| Take screenshots / photos | ❌ | ✅ Camera + canvas capture |
| Read clipboard | ❌ | ✅ `navigator.clipboard` |
| Know user's location | ❌ | ✅ GPS coordinates |
| Talk back (text-to-speech) | ❌ | ✅ Web Speech API |
| Send notifications | ❌ | ✅ Browser notifications |
| Execute arbitrary JS | ❌ | ✅ `runJavaScript` tool |
| Access cookies / localStorage | ❌ | ✅ Same-origin storage |
| Use native share dialog | ❌ | ✅ Web Share API |

---

## 🚀 Quick Start

### Option 1: CDN (easiest)

```html
<script type="module">
  import { Agent, allBrowserTools } from "https://cdn.jsdelivr.net/npm/flyagent-js@latest/dist/index.js";

  const agent = new Agent({
    model: "gpt-4o",
    apiKey: "sk-...",
    tools: allBrowserTools,
  });

  const result = await agent.run("describe this webpage");
  console.log(result);
</script>
```

### Option 2: npm

```bash
npm install flyagent-js
```

```typescript
import { Agent, tool, JS, allBrowserTools } from "flyagent-js";

const agent = new Agent({
  model: "gpt-4o",
  apiKey: process.env.OPENAI_API_KEY,
  tools: allBrowserTools,
});

const result = await agent.run("find all broken links on this page");
```

---

## 🛠️ Built-in Browser Tools (22 total)

### DOM Interaction
| Tool | Description |
|---|---|
| `domQuery` | Query elements by CSS selector, read text/HTML/attributes |
| `domClick` | Simulate clicks on buttons, links, checkboxes |
| `domScroll` | Smooth-scroll to any element |
| `domSet` | Modify element text, HTML, value, or attributes |
| `getPageInfo` | URL, title, meta description, viewport, scroll position |

### Storage
| Tool | Description |
|---|---|
| `localStorageRead` | Read a value from localStorage |
| `localStorageWrite` | Write a value to localStorage |
| `localStorageList` | List all localStorage keys |
| `cookiesRead` | Read all accessible cookies |

### Code Execution
| Tool | Description |
|---|---|
| `runJavaScript` | **Execute arbitrary JavaScript in the browser.** Full access to `document`, `window`, `fetch`, `localStorage`, etc. 5-second timeout. |

### Network
| Tool | Description |
|---|---|
| `httpFetch` | Make HTTP requests from the browser (respects CORS) |

### Media & Input
| Tool | Description |
|---|---|
| `clipboardRead` | Read text from system clipboard |
| `clipboardWrite` | Write text to system clipboard |
| `cameraCapture` | Take a photo from the device camera |
| `getGeolocation` | Get GPS coordinates |
| `speak` | Text-to-speech via browser |

### UI & System
| Tool | Description |
|---|---|
| `showNotification` | Show native browser notifications |
| `shareContent` | Open native share dialog (mobile) |
| `downloadFile` | Generate and download a file |
| `readFile` | Prompt user to upload a file, read contents |
| `getDeviceInfo` | Screen, battery, network, hardware cores |

### Convenience Bundles
```typescript
import { domTools, storageTools, mediaTools, networkTools, uiTools, allBrowserTools } from "flyagent-js";
```

---

## 📖 Usage Examples

### Read the current page

```typescript
const agent = new Agent({ model: "gpt-4o", apiKey: "sk-...", tools: allBrowserTools });

await agent.run("Summarize what this webpage is about");
// Agent uses domQuery to read h1, meta description, and body text
```

### Execute JavaScript

```typescript
await agent.run("Count how many images are on this page and their total file size");
// Agent generates JS:
// const imgs = document.querySelectorAll('img');
// const sizes = await Promise.all([...imgs].map(img => fetch(img.src, {method:'HEAD'}).then(r => r.headers.get('content-length'))));
// return {count: imgs.length, totalBytes: sizes.reduce((a,b) => a + (parseInt(b)||0), 0)};
```

### Streaming events (for live UI)

```typescript
for await (const event of agent.stream("analyze this page")) {
  if (event.type === "tool_start") {
    console.log(`🔧 ${event.tool} running...`);
  } else if (event.type === "tool_done") {
    console.log(`✓ ${event.tool}: ${event.output}`);
  } else if (event.type === "result") {
    console.log(`Result: ${event.text}`);
  }
}
```

### Multi-modal (vision)

```typescript
await agent.run("Describe this photo", {
  images: ["https://example.com/photo.jpg"]
});
```

### JSON output mode

```typescript
const data = await agent.run("Extract all links as JSON", { jsonOutput: true });
// data is a parsed object
```

---

## 🔌 Provider Support

Auto-detected from model name. No config needed.

| Provider | Model Prefix | API Key Env Var | Base URL |
|---|---|---|---|
| **OpenAI** | `gpt-*`, `o1*` | `OPENAI_API_KEY` | `https://api.openai.com/v1` |
| **Google Gemini** | `gemini-*` | `GOOGLE_API_KEY` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| **Moonshot Kimi** | `moonshot-*` | `MOONSHOT_API_KEY` | `https://api.moonshot.cn/v1` |

```typescript
// Gemini — auto-detected
new Agent({ model: "gemini-1.5-pro", apiKey: "..." });

// Kimi — auto-detected
new Agent({ model: "moonshot-v1-8k", apiKey: "..." });

// Custom endpoint
new Agent({ model: "gpt-4o", apiKey: "...", baseURL: "https://my-proxy.com/v1" });
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Agent                                      │
│  ├─ loop: call LLM → parse tool calls      │
│  ├─ execute tools (Promise.all for parallel)│
│  ├─ add results to conversation history    │
│  └─ repeat until done or max iterations    │
├─────────────────────────────────────────────┤
│  LLM Client (OpenAI-compatible fetch)      │
│  ├─ OpenAI, Gemini, Kimi via baseURL       │
│  ├─ Auto-detect provider from model name   │
│  └─ JSON mode, vision, tool calling        │
├─────────────────────────────────────────────┤
│  Tool Registry                              │
│  ├─ 22 built-in browser tools              │
│  ├─ Custom tools via @tool decorator       │
│  └─ Schema auto-generation from JSON       │
├─────────────────────────────────────────────┤
│  Browser APIs                               │
│  └─ DOM, Storage, Media, Network, UI       │
└─────────────────────────────────────────────┘
```

**Design principles:**
- **No backend**: Everything runs client-side. The only external call is to the LLM API.
- **Thin but complete**: ~900 lines of TypeScript. Zero runtime dependencies.
- **Streaming-first**: `agent.stream()` yields real-time events for building reactive UIs.
- **SSE token streaming**: Words appear as the LLM generates them, not after a long pause.
- **Persistent memory**: Conversations survive page reloads via IndexedDB.
- **Metrics tracking**: Token count, estimated cost, latency — all visible in real-time.
- **Browser-native**: Tools use real browser APIs, not headless browser proxies.

---

## 🧪 Try the Demos

### Browser Agent Demo

```bash
cd flyagent-js
npm install typescript
npx tsc
open examples/browser.html
```

Enter your API key and try presets like:
- **Page summary** — Query DOM and summarize
- **Read clipboard** — See what's in your clipboard
- **Camera photo** — Take a photo, describe it
- **My location** — GPS → city guess
- **JS: list links** — Agent writes code to scrape links
- **Read cookies** — Inspect stored cookies

### 🎯 Task Planning Demo (Markdown-First AI UI)

An entire task planning app where **the UI is generated by the AI as Markdown** with interactive widgets.

```bash
cd demos/task-planning
npm run build
python3 -m http.server 8080
# open http://localhost:8080
```

**Zero traditional frontend code.** No React, no Vue, no Svelte. Just:
- 🧠 Kimi LLM generates Markdown with interactive widgets
- 📄 Vanilla JS renderer turns widgets into DOM
- 🎛️ User interacts → events sent back to agent → UI regenerates

---

## 🔒 Security Notes

- **API keys** are sent directly from the browser to the LLM provider. For production, proxy through your own backend or use a service like OpenRouter.
- **`runJavaScript`** executes code with full access to the page. Only use with trusted models/tasks.
- **Clipboard, camera, geolocation** require user permission in most browsers.
- **localStorage/cookies** are same-origin only — the agent cannot read other sites' data.

---

## 📄 License

MIT
