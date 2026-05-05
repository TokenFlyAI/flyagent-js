/**
 * Demo configuration.
 *
 * ⚠️ SECURITY NOTE: This file is tracked by git. Do not commit real API keys
 * to public repositories. For personal/local demos, this is fine.
 */
export declare const DEMO_CONFIG: {
    /**
     * Kimi API key.
     *
     * You need a Moonshot Open Platform key (starts with "sk-", NOT "sk-kimi-").
     * Get it from: https://platform.moonshot.cn
     *
     * NOTE: Keys from kimi.com/code/console (sk-kimi-...) are RESTRICTED
     * to approved coding agents only and will NOT work in browser demos.
     */
    apiKey: string;
    /** Moonshot base URL */
    baseURL: string;
    /** Default LLM model */
    model: string;
    /** Enable token streaming */
    enableStreaming: boolean;
    /** Max agent iterations */
    maxIterations: number;
};
