/**
 * Agent — The core orchestrator.
 *
 * Uses an LLM to break down tasks, call tools in parallel, and complete goals.
 * Works entirely in the browser or Node.js.
 *
 * Usage:
 *   const agent = new Agent({
 *     model: "gpt-4o",
 *     apiKey: "sk-...",
 *     tools: [searchTool, screenshotTool],
 *     system: "You are a helpful assistant.",
 *   });
 *
 *   const result = await agent.run("search for cats and take a screenshot");
 */

import type { ToolDef } from "./tool.js";
import type { DialogMessage, LLMResponse } from "./llm.js";
import { OpenAIClient, detectProvider } from "./llm.js";

/** Safely read env vars in both Node.js and browser. */
function _env(key: string): string | undefined {
  try {
    const p = (globalThis as Record<string, unknown>).process;
    if (p && typeof p === "object") {
      const env = (p as Record<string, unknown>).env;
      if (env && typeof env === "object") {
        return (env as Record<string, string | undefined>)[key];
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export interface AgentConfig {
  model: string;
  apiKey: string;
  baseURL?: string;
  tools?: ToolDef[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
}

export interface AgentEvent {
  type: "tool_start" | "tool_done" | "result" | "error" | "reasoning";
  tool?: string;
  input?: Record<string, unknown>;
  output?: string;
  error?: string;
  text?: string;
  parsed?: unknown;
}

export class Agent {
  private llm: OpenAIClient;
  private tools: Map<string, ToolDef>;
  private system: string;
  private maxIterations: number;

  constructor(config: AgentConfig) {
    // Auto-detect provider from model name and set defaults
    const provider = detectProvider(config.model);
    let apiKey = config.apiKey;
    let baseURL = config.baseURL;

    if (provider === "gemini") {
      baseURL = baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/";
      apiKey = apiKey || _env("GOOGLE_API_KEY") || "";
    } else if (provider === "kimi") {
      baseURL = baseURL || "https://api.moonshot.cn/v1";
      apiKey = apiKey || _env("MOONSHOT_API_KEY") || "";
    } else if (provider === "openai") {
      apiKey = apiKey || _env("OPENAI_API_KEY") || "";
    }

    this.llm = new OpenAIClient({
      model: config.model,
      apiKey,
      baseURL,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
    });
    this.tools = new Map();
    this.system = config.system || "You are a helpful AI assistant.";
    this.maxIterations = config.maxIterations ?? 30;

    for (const t of config.tools || []) {
      this.tools.set(t.name, t);
    }
  }

  /**
   * Run a task and return the final result string.
   */
  async run(
    task: string,
    options: { images?: string[]; jsonOutput?: boolean } = {}
  ): Promise<string | Record<string, unknown>> {
    const events: AgentEvent[] = [];
    for await (const event of this.stream(task, options)) {
      events.push(event);
    }
    const last = events[events.length - 1];
    if (last?.type === "result") {
      if (options.jsonOutput && last.parsed) {
        return last.parsed as Record<string, unknown>;
      }
      return last.text || "";
    }
    return "";
  }

  /**
   * Run a task and yield events for real-time UI updates.
   */
  async *stream(
    task: string,
    options: { images?: string[]; jsonOutput?: boolean } = {}
  ): AsyncGenerator<AgentEvent> {
    const messages: DialogMessage[] = [
      { role: "system", content: this.system },
    ];

    // Build user message (text + optional images)
    if (options.images && options.images.length > 0) {
      const content: DialogMessage["content"] = [{ type: "text", text: task }];
      for (const img of options.images) {
        content.push({ type: "image_url", image_url: { url: img } });
      }
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: task });
    }

    const toolList = Array.from(this.tools.values());

    for (let step = 0; step < this.maxIterations; step++) {
      let response: LLMResponse;
      try {
        response = await this.llm.chat(
          messages,
          toolList.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
          options.jsonOutput
        );
      } catch (e) {
        yield { type: "error", error: String(e) };
        return;
      }

      // Yield reasoning if model provided text alongside tool calls
      if (response.content) {
        yield { type: "reasoning", text: response.content };
      }

      if (!response.tool_calls || response.tool_calls.length === 0) {
        // Direct completion
        let text = response.content;
        let parsed: unknown = null;

        if (options.jsonOutput) {
          try {
            parsed = JSON.parse(text);
          } catch {
            /* ignore parse errors */
          }
        }

        yield { type: "result", text, parsed };
        return;
      }

      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.tool_calls,
      });

      // Execute tools and emit events (sequential for proper event streaming)
      const results = [];
      for (const tc of response.tool_calls) {
        const toolDef = this.tools.get(tc.function.name);
        const inputArgs = JSON.parse(tc.function.arguments);

        yield { type: "tool_start", tool: tc.function.name, input: inputArgs };

        let resultStr: string;
        let success: boolean;

        if (!toolDef) {
          resultStr = `Error: tool "${tc.function.name}" not found`;
          success = false;
        } else {
          try {
            const raw = await toolDef.execute(inputArgs);
            resultStr = typeof raw === "string" ? raw : JSON.stringify(raw);
            success = true;
          } catch (e) {
            resultStr = `Error: ${String(e)}`;
            success = false;
          }
        }

        yield {
          type: "tool_done",
          tool: tc.function.name,
          output: success ? resultStr : undefined,
          error: success ? undefined : resultStr,
        };

        results.push({
          callId: tc.id,
          toolName: tc.function.name,
          result: resultStr,
          success,
        });
      }

      // Add tool results to messages
      for (const r of results) {
        messages.push({
          role: "tool",
          tool_call_id: r.callId,
          name: r.toolName,
          content: r.result,
        });
      }
    }

    yield {
      type: "error",
      error: `Exceeded maximum iterations (${this.maxIterations})`,
    };
  }
}
