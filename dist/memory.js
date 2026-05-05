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
const DB_NAME = "flyagent-memory";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
export class AgentMemory {
    constructor(namespace = "default") {
        this.db = null;
        this.namespace = namespace;
    }
    async init() {
        if (this.db)
            return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
        });
    }
    key(sessionId) {
        return `${this.namespace}:${sessionId}`;
    }
    /** Save a session to IndexedDB. */
    async save(sessionId, data) {
        const db = await this.init();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const record = {
            id: this.key(sessionId),
            ...data,
            updatedAt: Date.now(),
        };
        return new Promise((resolve, reject) => {
            const req = store.put(record);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    /** Load a session from IndexedDB. */
    async load(sessionId) {
        const db = await this.init();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const req = store.get(this.key(sessionId));
            req.onsuccess = () => {
                const result = req.result;
                if (!result)
                    return resolve(null);
                const { id, ...data } = result;
                resolve(data);
            };
            req.onerror = () => reject(req.error);
        });
    }
    /** Delete a session. */
    async delete(sessionId) {
        const db = await this.init();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const req = store.delete(this.key(sessionId));
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    /** List all sessions in this namespace. */
    async list() {
        const db = await this.init();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const req = store.openCursor();
            const results = [];
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    const key = cursor.value.id;
                    if (key.startsWith(this.namespace + ":")) {
                        results.push({
                            id: key.slice(this.namespace.length + 1),
                            updatedAt: cursor.value.updatedAt,
                        });
                    }
                    cursor.continue();
                }
                else {
                    resolve(results.sort((a, b) => b.updatedAt - a.updatedAt));
                }
            };
            req.onerror = () => reject(req.error);
        });
    }
}
