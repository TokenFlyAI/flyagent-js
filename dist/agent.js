"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const llm_js_1 = require("./llm.js");
class Agent {
    constructor(config) {
        this.messages = [];
        // Auto-detect provider from model name and set defaults
        const provider = (0, llm_js_1.detectProvider)(config.model);
        let apiKey = config.apiKey;
        let baseURL = config.baseURL;
        if (provider === "gemini") {
            baseURL = baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/";
            apiKey = apiKey || _env("GOOGLE_API_KEY") || "";
        }
        else if (provider === "kimi") {
            baseURL = baseURL || "https://api.moonshot.cn/v1";
            apiKey = apiKey || _env("MOONSHOT_API_KEY") || "";
        }
        else if (provider === "openai") {
            apiKey = apiKey || _env("OPENAI_API_KEY") || "";
        }
        this._config = {
            model: config.model,
            apiKey,
            baseURL,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 4096,
        };
        this.llm = new llm_js_1.OpenAIClient(this._config);
        this.tools = new Map();
        this.system = config.system || "You are a helpful AI assistant.";
        this.maxIterations = config.maxIterations ?? 30;
        this.enableStreaming = config.enableStreaming ?? true;
        this.memory = config.memory;
        if (config.broadcast && typeof BroadcastChannel !== "undefined") {
            this.broadcast = new BroadcastChannel("flyagent-sync");
            this.broadcast.onmessage = (ev) => {
                if (ev.data?.type === "agent-state" && ev.data?.namespace === this.memory?.namespace) {
                    // Cross-tab state sync could go here
                }
            };
        }
        this.metrics = {
            llmCalls: 0,
            toolCalls: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            estimatedCost: 0,
            totalLatencyMs: 0,
        };
        for (const t of config.tools || []) {
            this.tools.set(t.name, t);
        }
    }
    /** Get current metrics. */
    getMetrics() {
        return { ...this.metrics };
    }
    /** Reset metrics. */
    resetMetrics() {
        this.metrics = {
            llmCalls: 0,
            toolCalls: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            estimatedCost: 0,
            totalLatencyMs: 0,
        };
    }
    /** Save current session to persistent memory. */
    async saveSession(sessionId) {
        if (!this.memory)
            return;
        await this.memory.save(sessionId, {
            messages: this.messages,
            system: this.system,
            model: this._config.model,
            createdAt: Date.now(),
        });
    }
    /** Load a session from persistent memory. */
    async loadSession(sessionId) {
        if (!this.memory)
            return false;
        const data = await this.memory.load(sessionId);
        if (!data)
            return false;
        this.messages = data.messages || [];
        if (data.system)
            this.system = data.system;
        return true;
    }
    /** Clear conversation history. */
    reset() {
        this.messages = [];
    }
    /**
     * Run a task and return the final result string.
     */
    async run(task, options = {}) {
        const events = [];
        for await (const event of this.stream(task, options)) {
            events.push(event);
        }
        const last = events[events.length - 1];
        if (last?.type === "result") {
            if (options.jsonOutput && last.parsed) {
                return last.parsed;
            }
            return last.text || "";
        }
        return "";
    }
    /**
     * Run a task and yield events for real-time UI updates.
     *
     * When enableStreaming is true, yields individual tokens as they arrive
     * from the LLM. When false, yields reasoning after the full response.
     */
    async *stream(task, options = {}) {
        // Build user message
        if (this.messages.length === 0) {
            this.messages.push({ role: "system", content: this.system });
        }
        if (options.images && options.images.length > 0) {
            const content = [{ type: "text", text: task }];
            for (const img of options.images) {
                content.push({ type: "image_url", image_url: { url: img } });
            }
            this.messages.push({ role: "user", content });
        }
        else {
            this.messages.push({ role: "user", content: task });
        }
        const toolList = Array.from(this.tools.values());
        const toolSchemas = toolList.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        }));
        for (let step = 0; step < this.maxIterations; step++) {
            let response;
            const startTime = performance.now();
            try {
                if (this.enableStreaming) {
                    // Stream tokens in real-time
                    let fullContent = "";
                    let finalToolCalls = [];
                    for await (const chunk of (0, llm_js_1.streamChat)(this._config, this.messages, toolSchemas, options.jsonOutput)) {
                        if (chunk.content) {
                            fullContent += chunk.content;
                            yield { type: "token", text: chunk.content };
                        }
                        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                            finalToolCalls = chunk.tool_calls;
                        }
                    }
                    response = {
                        content: fullContent,
                        tool_calls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
                    };
                }
                else {
                    response = await this.llm.chat(this.messages, toolSchemas, options.jsonOutput);
                }
            }
            catch (e) {
                yield { type: "error", error: String(e) };
                return;
            }
            const latency = performance.now() - startTime;
            this.metrics.llmCalls++;
            this.metrics.totalLatencyMs += latency;
            // Update token metrics
            if (response.usage) {
                this.metrics.promptTokens += response.usage.prompt_tokens;
                this.metrics.completionTokens += response.usage.completion_tokens;
                this.metrics.totalTokens += response.usage.prompt_tokens + response.usage.completion_tokens;
                this.metrics.estimatedCost += this._estimateCost(response.usage.prompt_tokens, response.usage.completion_tokens);
            }
            yield { type: "metrics", metrics: { ...this.metrics } };
            if (!response.tool_calls || response.tool_calls.length === 0) {
                // Direct completion
                let text = response.content;
                let parsed = null;
                if (options.jsonOutput) {
                    try {
                        parsed = JSON.parse(text);
                    }
                    catch {
                        /* ignore parse errors */
                    }
                }
                this.messages.push({ role: "assistant", content: text });
                yield { type: "result", text, parsed };
                // Auto-save if memory is configured
                if (this.memory) {
                    await this.saveSession("default");
                }
                return;
            }
            // Add assistant message with tool calls
            this.messages.push({
                role: "assistant",
                content: response.content || "",
                tool_calls: response.tool_calls,
            });
            // Execute tools
            for (const tc of response.tool_calls) {
                const toolDef = this.tools.get(tc.function.name);
                const inputArgs = JSON.parse(tc.function.arguments);
                yield { type: "tool_start", tool: tc.function.name, input: inputArgs };
                let resultStr;
                let success;
                if (!toolDef) {
                    resultStr = `Error: tool "${tc.function.name}" not found`;
                    success = false;
                }
                else {
                    try {
                        const raw = await toolDef.execute(inputArgs);
                        resultStr = typeof raw === "string" ? raw : JSON.stringify(raw);
                        success = true;
                        this.metrics.toolCalls++;
                    }
                    catch (e) {
                        resultStr = `Error: ${String(e)}`;
                        success = false;
                    }
                }
                yield {
                    type: "tool_done",
                    tool: tc.function.name,
                    output: success ? resultStr : undefined,
                    error: success ? undefined : resultStr,
                };
                // Add tool result to messages
                this.messages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    name: tc.function.name,
                    content: resultStr,
                });
            }
        }
        yield {
            type: "error",
            error: `Exceeded maximum iterations (${this.maxIterations})`,
        };
    }
    /** Estimate cost in USD based on model. */
    _estimateCost(promptTokens, completionTokens) {
        const model = this._config.model;
        // Prices per 1M tokens (approximate)
        const prices = {
            "gpt-4o": { prompt: 2.5, completion: 10 },
            "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
            "gemini-1.5-pro": { prompt: 1.25, completion: 5 },
            "gemini-1.5-flash": { prompt: 0.075, completion: 0.3 },
            "moonshot-v1-8k": { prompt: 0.6, completion: 0.6 },
        };
        for (const [prefix, price] of Object.entries(prices)) {
            if (model.includes(prefix)) {
                return (promptTokens * price.prompt + completionTokens * price.completion) / 1000000;
            }
        }
        return (promptTokens * 0.15 + completionTokens * 0.6) / 1000000;
    }
}
exports.Agent = Agent;
/** Safely read env vars in both Node.js and browser. */
function _env(key) {
    try {
        const p = globalThis.process;
        if (p && typeof p === "object") {
            const env = p.env;
            if (env && typeof env === "object") {
                return env[key];
            }
        }
    }
    catch {
        /* ignore */
    }
    return undefined;
}
