# flyagent-js Architecture

## Design Goals

1. **Zero backend**: The agent must run entirely in the browser. No server, no WebSocket, no proxy required for basic operation.
2. **Minimal footprint**: Under 1,000 lines of TypeScript. No runtime dependencies.
3. **Browser-native tools**: Leverage APIs that only exist in browsers (DOM, clipboard, camera, geolocation, etc.).
4. **Provider-agnostic**: Support OpenAI, Gemini, Kimi, and any OpenAI-compatible endpoint.
5. **Streaming-first**: Real-time event streaming for building reactive UIs.

## Why Browser-Native?

Traditional agent frameworks run on servers. They can't:
- See the webpage the user is looking at
- Access the user's clipboard, camera, or location
- Interact with the DOM in real-time
- Execute arbitrary JavaScript in the user's context

flyagent-js flips this: the agent runs where the user is, with access to everything the browser can do.

## Core Components

### 1. Schema (`src/schema.ts`)

Lightweight JSON Schema builder. Mirrors Python `flyagent.core.schema.JS`.

```typescript
JS.object({
  query: JS.string("Search query"),
  limit: JS.integer("Max results"),
}, ["query"])
```

No validation library — schemas are sent directly to the LLM for tool calling.

### 2. LLM Client (`src/llm.ts`)

Simple `fetch`-based OpenAI chat completions client.

Key design decisions:
- **Single client, multiple providers**: Gemini and Kimi expose OpenAI-compatible endpoints. We just swap `baseURL` and `apiKey`.
- **Auto-detection**: `detectProvider(model)` maps model prefixes to providers.
- **No streaming (yet)**: The OpenAI streaming API requires SSE parsing. For simplicity v1 uses blocking requests. Events are generated from the agent loop, not the HTTP response.

### 3. Tool System (`src/tool.ts`)

Everything is a `ToolDef`:

```typescript
interface ToolDef {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (args: Record<string, any>) => unknown | Promise<unknown>;
}
```

The `@tool` decorator is a factory function, not a real decorator. This avoids TypeScript decorator complexity and works in all module systems.

### 4. Agent (`src/agent.ts`)

The core orchestrator. Simple async loop:

```
while not done and iterations < max:
  1. Call LLM with conversation history + tool schemas
  2. If no tool calls → return result
  3. Execute tools in parallel (Promise.all)
  4. Add tool results to conversation history
  5. Repeat
```

**Why no DAG executor?** In the browser, async/await + `Promise.all()` is sufficient. The LLM decides which tools to call; we execute them concurrently. No need for the complex dependency graph that the Python framework uses.

**Event streaming**: The `stream()` method yields `AgentEvent` objects at each step:
- `reasoning` — LLM's thought process
- `tool_start` — Tool execution began
- `tool_done` — Tool execution completed
- `result` — Final answer
- `error` — Something broke

### 5. Browser Tools (`src/browser-tools.ts`)

22 built-in tools organized by category:

| Category | Tool Count | Key APIs Used |
|---|---|---|
| DOM | 5 | `document.querySelector`, `scrollIntoView`, `click` |
| Storage | 4 | `localStorage`, `document.cookie` |
| Code Execution | 1 | `new Function()` |
| Network | 1 | `fetch` |
| Media/Input | 5 | `navigator.clipboard`, `getUserMedia`, `geolocation`, `speechSynthesis` |
| UI/System | 5 | `Notification`, `navigator.share`, `Blob`, `FileReader` |

**The `runJavaScript` tool** is the most powerful. It wraps user code in `new Function()` with explicit injections of `document`, `window`, `fetch`, `localStorage`, etc. This gives the agent unlimited flexibility while keeping the other tools as convenient shortcuts.

## Provider Auto-Detection

```typescript
function detectProvider(model: string): "openai" | "anthropic" | "gemini" | "kimi" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "gemini";
  if (model.startsWith("moonshot")) return "kimi";
  return "openai";
}
```

Each provider maps to a `baseURL`:
- OpenAI: `https://api.openai.com/v1`
- Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Kimi: `https://api.moonshot.cn/v1`

API keys are read from env vars (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `MOONSHOT_API_KEY`) or passed explicitly.

## Multi-Modal Support

The OpenAI chat format supports vision via content arrays:

```typescript
{
  role: "user",
  content: [
    { type: "text", text: "Describe this image" },
    { type: "image_url", image_url: { url: "https://..." } }
  ]
}
```

This works for OpenAI and Gemini. Kimi support for vision varies by model.

## Security Model

**Threat: Malicious agent code**
- `runJavaScript` uses `new Function()`, not `eval()`. Same global access, slightly cleaner.
- 5-second timeout prevents infinite loops.
- All errors are caught and returned as strings.

**Threat: API key exposure**
- Keys are in browser memory. For production, use a backend proxy or short-lived tokens.

**Threat: Cross-origin data access**
- `localStorage` and `cookies` are same-origin only. The agent cannot read other websites' data.
- `fetch` respects CORS. The agent cannot bypass it.

## Differences from Python FlyAgent

| | Python FlyAgent | flyagent-js |
|---|---|---|
| **Runtime** | Server / CLI | Browser / Node.js |
| **Concurrency** | ThreadPoolExecutor DAG | `Promise.all()` |
| **Tool resume** | Generator + `yield ToolExecutionBlocked` | Async/await loop |
| **Context** | Hierarchical `ExecutionContext` | Flat conversation history |
| **Sub-agents** | Yes (`SubAgent` class) | No (v1) |
| **Skills** | Yes (`@skill` decorator) | No (v1) |
| **Persistence** | `FileStore` across turns | In-memory only |
| **Streaming** | `step_iterator()` over executor | `AsyncGenerator` from agent loop |

Python FlyAgent is a heavy-duty orchestration engine. flyagent-js is a lightweight, user-facing agent that trades power for simplicity and browser integration.

## Future Directions

1. **Anthropic native client**: Currently not supported in JS. Add `AnthropicClient` with Messages API format.
2. **SSE streaming**: Stream LLM tokens in real-time for faster perceived response.
3. **React/Vue wrapper**: `<FlyAgent tools={...} onEvent={...} />` component.
4. **WebSocket bridge**: Allow a Python FlyAgent server to call browser tools via WebSocket (reverse of current architecture).
5. **IndexedDB tools**: Read/write structured data in the browser.
6. **Canvas/WebGL tools**: Image processing, drawing, visual effects.
7. **Service Worker integration**: Background agent execution even when tab is closed.
