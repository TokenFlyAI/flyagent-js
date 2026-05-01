/**
 * Persistent memory for browser agents.
 *
 * Uses IndexedDB to save/load agent sessions across page reloads.
 *
 * Usage:
 *   import { AgentMemory } from "flyagent-js/memory";
 *
 *   const memory = new AgentMemory("my-agent");
 *   await memory.save(sessionId, { messages, metadata });
 *   const session = await memory.load(sessionId);
 */
export interface SessionData {
    messages: any[];
    system?: string;
    model?: string;
    createdAt: number;
    updatedAt: number;
}
export declare class AgentMemory {
    private db;
    private namespace;
    constructor(namespace?: string);
    private init;
    private key;
    /** Save a session to IndexedDB. */
    save(sessionId: string, data: Omit<SessionData, "updatedAt">): Promise<void>;
    /** Load a session from IndexedDB. */
    load(sessionId: string): Promise<SessionData | null>;
    /** Delete a session. */
    delete(sessionId: string): Promise<void>;
    /** List all sessions in this namespace. */
    list(): Promise<{
        id: string;
        updatedAt: number;
    }[]>;
}
