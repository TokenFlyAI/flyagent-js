"use strict";
/**
 * Built-in browser tools for flyagent-js.
 *
 * These tools leverage APIs only available in the browser:
 * DOM manipulation, localStorage, clipboard, camera, geolocation,
 * notifications, speech, and more.
 *
 * Usage:
 *   import { Agent } from 'flyagent-js';
 *   import { domQuery, clipboardRead, cameraCapture } from 'flyagent-js/browser-tools';
 *
 *   const agent = new Agent({
 *     model: 'gpt-4o',
 *     apiKey: 'sk-...',
 *     tools: [domQuery, clipboardRead, cameraCapture],
 *   });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allBrowserTools = exports.uiTools = exports.networkTools = exports.mediaTools = exports.storageTools = exports.domTools = exports.getDeviceInfo = exports.readFile = exports.downloadFile = exports.shareContent = exports.showNotification = exports.speak = exports.getGeolocation = exports.cameraCapture = exports.clipboardWrite = exports.clipboardRead = exports.httpFetch = exports.runJavaScript = exports.cookiesRead = exports.localStorageList = exports.localStorageWrite = exports.localStorageRead = exports.getPageInfo = exports.domSet = exports.domScroll = exports.domClick = exports.domQuery = void 0;
const tool_js_1 = require("./tool.js");
// ── DOM Tools ─────────────────────────────────────────────────────────────
/** Query DOM elements and return their text content or attributes. */
exports.domQuery = (0, tool_js_1.tool)({
    name: "domQuery",
    description: "Query DOM elements by CSS selector. Returns text content, attributes, or HTML. " +
        "Use this to read page content, find buttons, forms, or any element.",
    parameters: tool_js_1.JS.object({
        selector: tool_js_1.JS.string("CSS selector, e.g., 'h1', '.class', '#id', 'button[type=submit]'"),
        mode: tool_js_1.JS.string("What to extract: 'text' | 'html' | 'value' | 'attribute'"),
        attribute: tool_js_1.JS.string("If mode='attribute', which attribute to read (e.g., 'href', 'src')"),
        limit: tool_js_1.JS.integer("Max number of elements to return (default: 10)"),
    }, ["selector"]),
    execute: ({ selector, mode = "text", attribute, limit = 10 }) => {
        const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit);
        if (elements.length === 0)
            return `No elements found for "${selector}"`;
        return elements.map((el, i) => {
            let val;
            switch (mode) {
                case "html":
                    val = el.outerHTML ?? "";
                    break;
                case "value":
                    val = el.value ?? "";
                    break;
                case "attribute":
                    val = attribute ? (el.getAttribute(attribute) ?? "") : "";
                    break;
                default:
                    val = el.textContent?.trim() ?? "";
            }
            return `[${i}] ${val.slice(0, 300)}${val.length > 300 ? "..." : ""}`;
        }).join("\n");
    },
});
/** Click on a DOM element. */
exports.domClick = (0, tool_js_1.tool)({
    name: "domClick",
    description: "Click on a DOM element by CSS selector. Useful for pressing buttons, expanding menus, etc.",
    parameters: tool_js_1.JS.object({
        selector: tool_js_1.JS.string("CSS selector of element to click"),
    }, ["selector"]),
    execute: ({ selector }) => {
        const el = document.querySelector(selector);
        if (!el)
            return `Element not found: ${selector}`;
        el.click();
        return `Clicked ${selector}`;
    },
});
/** Scroll to a DOM element. */
exports.domScroll = (0, tool_js_1.tool)({
    name: "domScroll",
    description: "Scroll the page to bring an element into view.",
    parameters: tool_js_1.JS.object({
        selector: tool_js_1.JS.string("CSS selector of element to scroll to"),
        behavior: tool_js_1.JS.string("Scroll behavior: 'smooth' | 'auto' (default: smooth)"),
    }, ["selector"]),
    execute: ({ selector, behavior = "smooth" }) => {
        const el = document.querySelector(selector);
        if (!el)
            return `Element not found: ${selector}`;
        el.scrollIntoView({ behavior: behavior, block: "center" });
        return `Scrolled to ${selector}`;
    },
});
/** Set text content or attribute of a DOM element. */
exports.domSet = (0, tool_js_1.tool)({
    name: "domSet",
    description: "Modify a DOM element: set its text content, innerHTML, value, or an attribute. " +
        "Useful for filling forms, updating UI, or injecting content.",
    parameters: tool_js_1.JS.object({
        selector: tool_js_1.JS.string("CSS selector of element to modify"),
        mode: tool_js_1.JS.string("What to set: 'text' | 'html' | 'value' | 'attribute'"),
        value: tool_js_1.JS.string("Value to set"),
        attribute: tool_js_1.JS.string("If mode='attribute', which attribute to set"),
    }, ["selector", "mode", "value"]),
    execute: ({ selector, mode, value, attribute }) => {
        const el = document.querySelector(selector);
        if (!el)
            return `Element not found: ${selector}`;
        switch (mode) {
            case "text":
                el.textContent = value;
                break;
            case "html":
                el.innerHTML = value;
                break;
            case "value":
                el.value = value;
                break;
            case "attribute":
                if (attribute)
                    el.setAttribute(attribute, value);
                break;
            default:
                return `Unknown mode: ${mode}`;
        }
        return `Set ${mode} of ${selector} to "${value.slice(0, 50)}"`;
    },
});
/** Get current page metadata. */
exports.getPageInfo = (0, tool_js_1.tool)({
    name: "getPageInfo",
    description: "Get current page URL, title, meta description, viewport size, and scroll position.",
    parameters: tool_js_1.JS.object(),
    execute: () => ({
        url: window.location.href,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scroll: { x: window.scrollX, y: window.scrollY },
        userAgent: navigator.userAgent,
        language: navigator.language,
    }),
});
// ── Storage Tools ─────────────────────────────────────────────────────────
/** Read from localStorage. */
exports.localStorageRead = (0, tool_js_1.tool)({
    name: "localStorageRead",
    description: "Read a value from browser localStorage by key.",
    parameters: tool_js_1.JS.object({
        key: tool_js_1.JS.string("localStorage key to read"),
    }, ["key"]),
    execute: ({ key }) => {
        try {
            const val = localStorage.getItem(key);
            return val === null ? `Key "${key}" not found in localStorage.` : val;
        }
        catch (e) {
            return `Error reading localStorage: ${String(e)}`;
        }
    },
});
/** Write to localStorage. */
exports.localStorageWrite = (0, tool_js_1.tool)({
    name: "localStorageWrite",
    description: "Write a value to browser localStorage by key.",
    parameters: tool_js_1.JS.object({
        key: tool_js_1.JS.string("localStorage key to write"),
        value: tool_js_1.JS.string("Value to store"),
    }, ["key", "value"]),
    execute: ({ key, value }) => {
        try {
            localStorage.setItem(key, value);
            return `Stored "${key}" in localStorage.`;
        }
        catch (e) {
            return `Error writing localStorage: ${String(e)}`;
        }
    },
});
/** List all localStorage keys. */
exports.localStorageList = (0, tool_js_1.tool)({
    name: "localStorageList",
    description: "List all keys in browser localStorage.",
    parameters: tool_js_1.JS.object(),
    execute: () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k)
                keys.push(k);
        }
        return keys.length === 0 ? "localStorage is empty." : keys.join("\n");
    },
});
/** Read all browser cookies for the current page. */
exports.cookiesRead = (0, tool_js_1.tool)({
    name: "cookiesRead",
    description: "Read all cookies for the current document. Returns key-value pairs. " +
        "Only cookies accessible to JavaScript (not HttpOnly) are returned.",
    parameters: tool_js_1.JS.object(),
    execute: () => {
        const raw = document.cookie;
        if (!raw)
            return "No cookies found.";
        const pairs = raw.split(";").map((c) => c.trim());
        const result = {};
        for (const p of pairs) {
            const idx = p.indexOf("=");
            if (idx > 0)
                result[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
        }
        return result;
    },
});
// ── Code Execution Tool ───────────────────────────────────────────────────
/**
 * Execute JavaScript code in the browser.
 *
 * WARNING: This tool gives the agent full access to the browser context
 * (document, window, localStorage, fetch, etc.). Only use with trusted agents.
 *
 * The agent should write valid JavaScript. To return a value, use `return`.
 * Example:
 *   const headings = document.querySelectorAll('h1');
 *   return Array.from(headings).map(h => h.textContent);
 */
exports.runJavaScript = (0, tool_js_1.tool)({
    name: "runJavaScript",
    description: "Write and execute JavaScript code directly in the browser. " +
        "This is the most powerful tool — the code runs with full access to the page, " +
        "including document, window, localStorage, fetch, and all browser APIs. " +
        "Use `return` to provide the final result. " +
        "Use this for: complex DOM manipulation, calculations, data transformation, " +
        "batch operations, or anything the other tools can't do. " +
        "Example: `const data = JSON.parse(localStorage.getItem('user')); return data.name;`",
    parameters: tool_js_1.JS.object({
        code: tool_js_1.JS.string("JavaScript code to execute. Use `return` for the final result."),
        timeout: tool_js_1.JS.integer("Max execution time in ms (default: 5000)"),
    }, ["code"]),
    execute: ({ code, timeout = 5000 }) => {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(`Error: Code execution timed out after ${timeout}ms`);
            }, timeout);
            try {
                // Build a function that has access to common globals
                // We pass them explicitly so the code can reference them even if shadowed
                const fn = new Function("document", "window", "navigator", "console", "localStorage", "sessionStorage", "fetch", "location", "setTimeout", "setInterval", "JSON", "Math", "Date", "Array", "Object", "String", "Number", "Promise", `"use strict";\n${code}`);
                const result = fn(document, window, navigator, console, localStorage, sessionStorage, fetch, location, setTimeout, setInterval, JSON, Math, Date, Array, Object, String, Number, Promise);
                clearTimeout(timer);
                // Serialize result
                if (result === undefined) {
                    resolve("Executed successfully (no return value).");
                }
                else if (typeof result === "string") {
                    resolve(result);
                }
                else {
                    try {
                        resolve(JSON.stringify(result, null, 2));
                    }
                    catch {
                        resolve(String(result));
                    }
                }
            }
            catch (e) {
                clearTimeout(timer);
                resolve(`Runtime error: ${String(e)}`);
            }
        });
    },
});
// ── Network Tools ─────────────────────────────────────────────────────────
/** Make an HTTP fetch request from the browser. */
exports.httpFetch = (0, tool_js_1.tool)({
    name: "httpFetch",
    description: "Make an HTTP request from the browser. Use this to call external APIs, " +
        "fetch data, or check website availability. Respects CORS.",
    parameters: tool_js_1.JS.object({
        url: tool_js_1.JS.string("URL to fetch"),
        method: tool_js_1.JS.string("HTTP method: GET | POST | PUT | DELETE (default: GET)"),
        headers: tool_js_1.JS.object({}, [], "Optional headers as JSON object"),
        body: tool_js_1.JS.string("Optional request body (for POST/PUT)"),
    }, ["url"]),
    execute: async ({ url, method = "GET", headers, body }) => {
        try {
            const resp = await fetch(url, {
                method,
                headers: headers ? headers : undefined,
                body: body || undefined,
            });
            const text = await resp.text();
            return {
                status: resp.status,
                statusText: resp.statusText,
                body: text.slice(0, 3000),
                truncated: text.length > 3000,
            };
        }
        catch (e) {
            return `Fetch failed: ${String(e)}`;
        }
    },
});
// ── Clipboard Tools ───────────────────────────────────────────────────────
/** Read text from clipboard. */
exports.clipboardRead = (0, tool_js_1.tool)({
    name: "clipboardRead",
    description: "Read text from the system clipboard. Requires user permission in most browsers. " +
        "Only works in secure contexts (HTTPS or localhost).",
    parameters: tool_js_1.JS.object(),
    execute: async () => {
        try {
            const text = await navigator.clipboard.readText();
            return text || "Clipboard is empty.";
        }
        catch (e) {
            return `Clipboard read failed: ${String(e)}. Make sure you're on HTTPS and granted permission.`;
        }
    },
});
/** Write text to clipboard. */
exports.clipboardWrite = (0, tool_js_1.tool)({
    name: "clipboardWrite",
    description: "Write text to the system clipboard.",
    parameters: tool_js_1.JS.object({
        text: tool_js_1.JS.string("Text to copy to clipboard"),
    }, ["text"]),
    execute: async ({ text }) => {
        try {
            await navigator.clipboard.writeText(text);
            return `Copied to clipboard: "${text.slice(0, 100)}"`;
        }
        catch (e) {
            return `Clipboard write failed: ${String(e)}`;
        }
    },
});
// ── Media / Input Tools ───────────────────────────────────────────────────
/** Capture a photo from the user's camera. */
exports.cameraCapture = (0, tool_js_1.tool)({
    name: "cameraCapture",
    description: "Take a photo using the device's camera and return it as a base64 data URL. " +
        "Useful for visual analysis, QR scanning, or documenting something.",
    parameters: tool_js_1.JS.object({
        facingMode: tool_js_1.JS.string("Camera to use: 'user' (front) | 'environment' (back). Default: environment"),
    }),
    execute: async ({ facingMode = "environment" }) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
            });
            const video = document.createElement("video");
            video.srcObject = stream;
            await video.play();
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0);
            // Stop camera
            stream.getTracks().forEach((t) => t.stop());
            return canvas.toDataURL("image/jpeg", 0.9);
        }
        catch (e) {
            return `Camera capture failed: ${String(e)}`;
        }
    },
});
/** Get device geolocation (GPS coordinates). */
exports.getGeolocation = (0, tool_js_1.tool)({
    name: "getGeolocation",
    description: "Get the device's current GPS coordinates. Requires user permission. " +
        "Returns latitude, longitude, and accuracy.",
    parameters: tool_js_1.JS.object({
        enableHighAccuracy: tool_js_1.JS.boolean("Request high-accuracy GPS (default: true)"),
    }),
    execute: async ({ enableHighAccuracy = true }) => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve("Geolocation is not supported by this browser.");
                return;
            }
            navigator.geolocation.getCurrentPosition((pos) => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
            }), (err) => resolve(`Geolocation error: ${err.message} (code ${err.code})`), { enableHighAccuracy, timeout: 10000 });
        });
    },
});
/** Use browser's text-to-speech to speak a message. */
exports.speak = (0, tool_js_1.tool)({
    name: "speak",
    description: "Speak text aloud using the browser's text-to-speech engine.",
    parameters: tool_js_1.JS.object({
        text: tool_js_1.JS.string("Text to speak"),
        lang: tool_js_1.JS.string("Language code, e.g., 'en-US', 'zh-CN'. Default: browser language"),
        rate: tool_js_1.JS.number("Speech rate: 0.1 (slow) to 10 (fast). Default: 1"),
    }, ["text"]),
    execute: ({ text, lang, rate = 1 }) => {
        if (!window.speechSynthesis)
            return "Text-to-speech not supported.";
        const utterance = new SpeechSynthesisUtterance(text);
        if (lang)
            utterance.lang = lang;
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
        return `Speaking: "${text.slice(0, 100)}"`;
    },
});
// ── UI / System Tools ─────────────────────────────────────────────────────
/** Show a browser notification. */
exports.showNotification = (0, tool_js_1.tool)({
    name: "showNotification",
    description: "Display a native browser notification. Requires user permission. " +
        "The page may need to be in focus or have notification permission granted.",
    parameters: tool_js_1.JS.object({
        title: tool_js_1.JS.string("Notification title"),
        body: tool_js_1.JS.string("Notification body text"),
    }, ["title", "body"]),
    execute: async ({ title, body }) => {
        if (!("Notification" in window))
            return "Notifications not supported.";
        const perm = await Notification.requestPermission();
        if (perm !== "granted")
            return `Notification permission denied (${perm}).`;
        new Notification(title, { body });
        return `Notification shown: ${title}`;
    },
});
/** Use the native Web Share API to share content. */
exports.shareContent = (0, tool_js_1.tool)({
    name: "shareContent",
    description: "Open the device's native share dialog (mobile) or copy link (desktop). " +
        "Useful for sharing results, URLs, or generated content.",
    parameters: tool_js_1.JS.object({
        title: tool_js_1.JS.string("Share title"),
        text: tool_js_1.JS.string("Share text/body"),
        url: tool_js_1.JS.string("URL to share"),
    }, ["title", "text"]),
    execute: async ({ title, text, url }) => {
        if (!("share" in navigator))
            return "Web Share API not supported on this device.";
        try {
            await navigator.share({ title, text, url });
            return "Share dialog opened.";
        }
        catch (e) {
            return `Share failed: ${String(e)}`;
        }
    },
});
/** Download a file to the user's device. */
exports.downloadFile = (0, tool_js_1.tool)({
    name: "downloadFile",
    description: "Create and download a file to the user's device. Useful for exporting " +
        "reports, CSVs, JSON data, or generated documents.",
    parameters: tool_js_1.JS.object({
        filename: tool_js_1.JS.string("Name of file to download, e.g., 'report.txt'"),
        content: tool_js_1.JS.string("File content (text)"),
        mimeType: tool_js_1.JS.string("MIME type, e.g., 'text/plain', 'application/json'. Default: text/plain"),
    }, ["filename", "content"]),
    execute: ({ filename, content, mimeType = "text/plain" }) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return `Downloaded ${filename} (${content.length} bytes)`;
    },
});
/** Read a user-selected file. */
exports.readFile = (0, tool_js_1.tool)({
    name: "readFile",
    description: "Prompt the user to select a file and read its contents as text or base64. " +
        "Useful for uploading documents, images, or data files for analysis.",
    parameters: tool_js_1.JS.object({
        accept: tool_js_1.JS.string("File type filter, e.g., '.txt,.json' or 'image/*'"),
        asBase64: tool_js_1.JS.boolean("Return file as base64 instead of text (useful for images). Default: false"),
    }),
    execute: async ({ accept, asBase64 = false }) => {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            if (accept)
                input.accept = accept;
            input.style.display = "none";
            document.body.appendChild(input);
            input.onchange = async () => {
                const file = input.files?.[0];
                document.body.removeChild(input);
                if (!file) {
                    resolve("No file selected.");
                    return;
                }
                if (asBase64) {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                }
                else {
                    const text = await file.text();
                    resolve(text.slice(0, 5000) + (text.length > 5000 ? "\n...[truncated]" : ""));
                }
            };
            input.click();
        });
    },
});
/** Get browser and device info. */
exports.getDeviceInfo = (0, tool_js_1.tool)({
    name: "getDeviceInfo",
    description: "Get device and browser information: screen size, memory, cores, " +
        "online status, battery, and network type.",
    parameters: tool_js_1.JS.object(),
    execute: async () => {
        const info = {
            screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
            devicePixelRatio: window.devicePixelRatio,
            online: navigator.onLine,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
        };
        // Network info
        const conn = navigator.connection;
        if (conn) {
            info.network = {
                type: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData,
            };
        }
        // Battery
        try {
            const battery = await navigator.getBattery?.();
            if (battery) {
                info.battery = {
                    level: battery.level,
                    charging: battery.charging,
                };
            }
        }
        catch {
            /* ignore */
        }
        return info;
    },
});
// ── Convenience bundles ───────────────────────────────────────────────────
/** All DOM-related tools. */
exports.domTools = [exports.domQuery, exports.domClick, exports.domScroll, exports.domSet, exports.getPageInfo];
/** All storage tools. */
exports.storageTools = [exports.localStorageRead, exports.localStorageWrite, exports.localStorageList];
/** All media/input tools. */
exports.mediaTools = [exports.clipboardRead, exports.clipboardWrite, exports.cameraCapture, exports.getGeolocation, exports.speak];
/** All network tools. */
exports.networkTools = [exports.httpFetch];
/** All UI/system tools. */
exports.uiTools = [exports.showNotification, exports.shareContent, exports.downloadFile, exports.readFile, exports.getDeviceInfo];
/** Every built-in browser tool. */
exports.allBrowserTools = [
    ...exports.domTools,
    ...exports.storageTools,
    exports.cookiesRead,
    exports.runJavaScript,
    ...exports.mediaTools,
    ...exports.networkTools,
    ...exports.uiTools,
];
