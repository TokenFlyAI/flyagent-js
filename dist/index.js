"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClient = exports.JS = exports.tool = exports.Agent = void 0;
var agent_js_1 = require("./agent.js");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return agent_js_1.Agent; } });
var tool_js_1 = require("./tool.js");
Object.defineProperty(exports, "tool", { enumerable: true, get: function () { return tool_js_1.tool; } });
Object.defineProperty(exports, "JS", { enumerable: true, get: function () { return tool_js_1.JS; } });
var llm_js_1 = require("./llm.js");
Object.defineProperty(exports, "OpenAIClient", { enumerable: true, get: function () { return llm_js_1.OpenAIClient; } });
// Re-export all browser tools for convenience
__exportStar(require("./browser-tools.js"), exports);
