/**
 * Tool system — everything is a Tool.
 * A tool has metadata (name, description, schema) and an execute function.
 */
import type { JSONSchema } from "./schema.js";
export interface ToolDef {
    name: string;
    description: string;
    parameters: JSONSchema;
    execute: (args: Record<string, any>) => unknown | Promise<unknown>;
}
export interface ToolConfig {
    name: string;
    description: string;
    parameters?: JSONSchema;
    execute: (args: Record<string, any>) => unknown | Promise<unknown>;
}
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
export declare function tool(config: ToolConfig): ToolDef;
import { JS } from "./schema.js";
export { JS };
