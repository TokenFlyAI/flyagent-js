/**
 * FlyAgent-js — Lightweight AI agent framework for browsers and Node.js.
 *
 * Quick start:
 *   import { Agent, tool, JS } from 'flyagent-js';
 *
 *   const myTool = tool({
 *     name: "greet",
 *     description: "Greet someone",
 *     parameters: JS.object({ name: JS.string() }, ["name"]),
 *     execute: ({ name }) => `Hello, ${name}!`,
 *   });
 *
 *   const agent = new Agent({ model: "gpt-4o", apiKey: "sk-...", tools: [myTool] });
 *   const result = await agent.run("greet the world");
 */

export { Agent, type AgentConfig, type AgentEvent, type AgentMetrics } from "./agent.js";
export { tool, type ToolDef, type ToolConfig, JS } from "./tool.js";
export { type JSONSchema } from "./schema.js";
export { OpenAIClient, type DialogMessage, type LLMConfig } from "./llm.js";
export { AgentMemory, type SessionData } from "./memory.js";

// Re-export all browser tools for convenience
export * from "./browser-tools.js";
