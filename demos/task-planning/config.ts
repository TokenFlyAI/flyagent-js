/**
 * Demo configuration.
 *
 * ⚠️ SECURITY NOTE: This file is tracked by git. Do not commit real API keys
 * to public repositories. For personal/local demos, this is fine.
 */

export const DEMO_CONFIG = {
  /**
   * Kimi API key.
   *
   * You need a Moonshot Open Platform key (starts with "sk-", NOT "sk-kimi-").
   * Get it from: https://platform.moonshot.cn
   *
   * NOTE: Keys from kimi.com/code/console (sk-kimi-...) are RESTRICTED
   * to approved coding agents only and will NOT work in browser demos.
   */
  apiKey: '',

  /** Moonshot base URL */
  baseURL: 'https://api.moonshot.cn/v1',

  /** Default LLM model */
  model: 'moonshot-v1-8k',

  /** Enable token streaming */
  enableStreaming: true,

  /** Max agent iterations */
  maxIterations: 15,
};
