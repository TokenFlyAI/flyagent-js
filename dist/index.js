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
export { Agent } from "./agent.js";
export { tool, JS } from "./tool.js";
export { OpenAIClient } from "./llm.js";
export { AgentMemory } from "./memory.js";
// Re-export all browser tools for convenience
export * from "./browser-tools.js";
