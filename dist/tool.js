"use strict";
/**
 * Tool system — everything is a Tool.
 * A tool has metadata (name, description, schema) and an execute function.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS = void 0;
exports.tool = tool;
/**
 * Create a tool from a config object.
 *
 * Usage:
 *   const myTool = tool({
 *     name: "search",
 *     description: "Search the web",
 *     parameters: JS.object({ query: JS.string() }, ["query"]),
 *     execute: async ({ query }) => { ... }
 *   });
 */
function tool(config) {
    return {
        name: config.name,
        description: config.description,
        parameters: config.parameters || schema_js_1.JS.object(),
        execute: config.execute,
    };
}
// Re-export JS for convenience
const schema_js_1 = require("./schema.js");
Object.defineProperty(exports, "JS", { enumerable: true, get: function () { return schema_js_1.JS; } });
