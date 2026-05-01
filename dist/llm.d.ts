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
    image_url?: {
        url: string;
    };
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
    tool_calls: ToolCall[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}
export interface LLMConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
}
/** Detect provider from model name. */
export declare function detectProvider(model: string): "openai" | "anthropic" | "gemini" | "kimi";
export declare class OpenAIClient {
    private config;
    constructor(config: LLMConfig);
    chat(messages: DialogMessage[], tools?: {
        name: string;
        description: string;
        parameters: JSONSchema;
    }[], jsonOutput?: boolean): Promise<LLMResponse>;
    private toOpenAIMessage;
}
