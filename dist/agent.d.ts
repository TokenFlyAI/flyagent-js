/**
 * Agent — The core orchestrator.
 *
 * Uses an LLM to break down tasks, call tools in parallel, and complete goals.
 * Works entirely in the browser or Node.js.
 *
 * Features:
 *   - Streaming LLM responses (token-by-token)
 *   - Persistent memory via IndexedDB
 *   - Metrics tracking (tokens, cost, latency)
 *   - Cross-tab sync via BroadcastChannel
 *   - Real-time event streaming
 */
import type { ToolDef } from "./tool.js";
import { AgentMemory } from "./memory.js";
export interface AgentConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
    tools?: ToolDef[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    maxIterations?: number;
    enableStreaming?: boolean;
    memory?: AgentMemory;
    broadcast?: boolean;
}
export interface AgentMetrics {
    llmCalls: number;
    toolCalls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
    totalLatencyMs: number;
}
export interface AgentEvent {
    type: "token" | "reasoning" | "tool_start" | "tool_done" | "result" | "error" | "metrics";
    text?: string;
    tool?: string;
    input?: Record<string, any>;
    output?: string;
    error?: string;
    parsed?: unknown;
    metrics?: AgentMetrics;
}
export declare class Agent {
    private _config;
    private llm;
    private tools;
    private system;
    private maxIterations;
    private enableStreaming;
    private memory?;
    private broadcast?;
    private metrics;
    private messages;
    constructor(config: AgentConfig);
    /** Get current metrics. */
    getMetrics(): AgentMetrics;
    /** Reset metrics. */
    resetMetrics(): void;
    /** Save current session to persistent memory. */
    saveSession(sessionId: string): Promise<void>;
    /** Load a session from persistent memory. */
    loadSession(sessionId: string): Promise<boolean>;
    /** Clear conversation history. */
    reset(): void;
    /**
     * Run a task and return the final result string.
     */
    run(task: string, options?: {
        images?: string[];
        jsonOutput?: boolean;
    }): Promise<string | Record<string, unknown>>;
    /**
     * Run a task and yield events for real-time UI updates.
     *
     * When enableStreaming is true, yields individual tokens as they arrive
     * from the LLM. When false, yields reasoning after the full response.
     */
    stream(task: string, options?: {
        images?: string[];
        jsonOutput?: boolean;
    }): AsyncGenerator<AgentEvent>;
    /** Estimate cost in USD based on model. */
    private _estimateCost;
}
