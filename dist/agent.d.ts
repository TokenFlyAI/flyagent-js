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
export declare class Agent {
    private llm;
    private tools;
    private system;
    private maxIterations;
    constructor(config: AgentConfig);
    /**
     * Run a task and return the final result string.
     */
    run(task: string, options?: {
        images?: string[];
        jsonOutput?: boolean;
    }): Promise<string | Record<string, unknown>>;
    /**
     * Run a task and yield events for real-time UI updates.
     */
    stream(task: string, options?: {
        images?: string[];
        jsonOutput?: boolean;
    }): AsyncGenerator<AgentEvent>;
}
