/**
 * Quick sanity test for flyagent-js (no API calls).
 */

import { Agent, tool, JS } from './dist/index.js';

// ── Test 1: Schema builder ────────────────────────────────────────────────
console.log("=== Test 1: Schema Builder ===");
const schema = JS.object({
  query: JS.string("Search query"),
  limit: JS.integer("Max results"),
  tags: JS.array(JS.string(), "Filter tags"),
  options: JS.object({
    strict: JS.boolean("Strict mode"),
  }),
}, ["query"]);

console.log(JSON.stringify(schema, null, 2));
console.assert(schema.type === "object");
console.assert(schema.required.includes("query"));
console.assert(schema.properties.tags.type === "array");
console.log("✓ Schema builder works\n");

// ── Test 2: Tool creation ─────────────────────────────────────────────────
console.log("=== Test 2: Tool Creation ===");
const greet = tool({
  name: "greet",
  description: "Greet someone",
  parameters: JS.object({ name: JS.string() }, ["name"]),
  execute: ({ name }) => `Hello, ${name}!`,
});

console.assert(greet.name === "greet");
console.assert(greet.description === "Greet someone");
console.assert(greet.parameters.required[0] === "name");
console.log("✓ Tool creation works\n");

// ── Test 3: Tool execution ────────────────────────────────────────────────
console.log("=== Test 3: Tool Execution ===");
const result = await greet.execute({ name: "World" });
console.assert(result === "Hello, World!");
console.log(`Result: ${result}`);
console.log("✓ Tool execution works\n");

// ── Test 4: Agent instantiation ───────────────────────────────────────────
console.log("=== Test 4: Agent Instantiation ===");
const agent = new Agent({
  model: "gpt-4o",
  apiKey: "fake-key",
  tools: [greet],
  system: "You are a test agent.",
});
console.assert(agent !== null);
console.log("✓ Agent instantiation works\n");

console.log("All tests passed!");
