/**
 * LLM Provider — OpenAI/Anthropic API client using fetch.
 * Works in both browser and Node.js (with fetch polyfill).
 */

import type { JSONSchema } from "./schema.js";

export interface DialogMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface LLMConfig {
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Detect provider from model name. */
export function detectProvider(model: string): "openai" | "anthropic" | "gemini" | "kimi" {
  const m = model.toLowerCase();
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini")) return "gemini";
  if (m.startsWith("moonshot")) return "kimi";
  return "openai";
}

export interface StreamChunk {
  content: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
}

export async function* streamChat(
  config: LLMConfig,
  messages: DialogMessage[],
  tools?: { name: string; description: string; parameters: JSONSchema }[],
  jsonOutput = false
): AsyncGenerator<StreamChunk, void, unknown> {
  const baseURL = config.baseURL || "https://api.openai.com/v1";
  const url = `${baseURL}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: messages.map((m) => toOpenAIMessage(m)),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 4096,
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    body.tool_choice = "auto";
  }

  if (jsonOutput && !tools) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM API error ${resp.status}: ${text}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolCalls: ToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        const delta = data.choices?.[0]?.delta;
        if (!delta) continue;

        const content = delta.content || "";

        // Accumulate tool calls from stream
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0;
            if (!currentToolCalls[index]) {
              currentToolCalls[index] = {
                id: tc.id || "",
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.function?.name) currentToolCalls[index].function.name += tc.function.name;
            if (tc.function?.arguments) currentToolCalls[index].function.arguments += tc.function.arguments;
          }
        }

        const finishReason = data.choices?.[0]?.finish_reason;

        yield {
          content,
          tool_calls: finishReason ? currentToolCalls.filter(Boolean) : undefined,
          finish_reason: finishReason,
        };

        if (finishReason) {
          currentToolCalls = [];
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }
}

function toOpenAIMessage(msg: DialogMessage): Record<string, unknown> {
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.tool_call_id,
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    };
  }

  if (msg.role === "assistant" && msg.tool_calls) {
    return {
      role: "assistant",
      content: msg.content || "",
      tool_calls: msg.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments),
        },
      })),
    };
  }

  if (Array.isArray(msg.content)) {
    return { role: msg.role, content: msg.content };
  }

  return { role: msg.role, content: msg.content };
}

function isVisionModel(model: string): boolean {
  return model.includes("gpt-4o") || model.includes("claude-3");
}

export class OpenAIClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      ...config,
    };
  }

  async chat(
    messages: DialogMessage[],
    tools?: { name: string; description: string; parameters: JSONSchema }[],
    jsonOutput = false
  ): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || "https://api.openai.com/v1";
    const url = `${baseURL}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map((m) => this.toOpenAIMessage(m)),
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = "auto";
    }

    if (jsonOutput && !tools) {
      body.response_format = { type: "json_object" };
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`LLM API error ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    const choice = data.choices[0];
    const msg = choice.message;

    const toolCalls: ToolCall[] = [];
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        toolCalls.push({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        });
      }
    }

    return {
      content: msg.content || "",
      tool_calls: toolCalls,
      usage: data.usage,
    };
  }

  private toOpenAIMessage(msg: DialogMessage): Record<string, unknown> {
    if (msg.role === "tool") {
      return {
        role: "tool",
        tool_call_id: msg.tool_call_id,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    }

    if (msg.role === "assistant" && msg.tool_calls) {
      return {
        role: "assistant",
        content: msg.content || "",
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === "string"
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments),
          },
        })),
      };
    }

    // Handle multi-modal content
    if (Array.isArray(msg.content)) {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    return {
      role: msg.role,
      content: msg.content,
    };
  }
}
