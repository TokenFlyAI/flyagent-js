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
/** Query DOM elements and return their text content or attributes. */
export declare const domQuery: import("./tool.js").ToolDef;
/** Click on a DOM element. */
export declare const domClick: import("./tool.js").ToolDef;
/** Scroll to a DOM element. */
export declare const domScroll: import("./tool.js").ToolDef;
/** Set text content or attribute of a DOM element. */
export declare const domSet: import("./tool.js").ToolDef;
/** Get current page metadata. */
export declare const getPageInfo: import("./tool.js").ToolDef;
/** Read from localStorage. */
export declare const localStorageRead: import("./tool.js").ToolDef;
/** Write to localStorage. */
export declare const localStorageWrite: import("./tool.js").ToolDef;
/** List all localStorage keys. */
export declare const localStorageList: import("./tool.js").ToolDef;
/** Read all browser cookies for the current page. */
export declare const cookiesRead: import("./tool.js").ToolDef;
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
export declare const runJavaScript: import("./tool.js").ToolDef;
/** Make an HTTP fetch request from the browser. */
export declare const httpFetch: import("./tool.js").ToolDef;
/** Read text from clipboard. */
export declare const clipboardRead: import("./tool.js").ToolDef;
/** Write text to clipboard. */
export declare const clipboardWrite: import("./tool.js").ToolDef;
/** Capture a photo from the user's camera. */
export declare const cameraCapture: import("./tool.js").ToolDef;
/** Get device geolocation (GPS coordinates). */
export declare const getGeolocation: import("./tool.js").ToolDef;
/** Use browser's text-to-speech to speak a message. */
export declare const speak: import("./tool.js").ToolDef;
/** Show a browser notification. */
export declare const showNotification: import("./tool.js").ToolDef;
/** Use the native Web Share API to share content. */
export declare const shareContent: import("./tool.js").ToolDef;
/** Download a file to the user's device. */
export declare const downloadFile: import("./tool.js").ToolDef;
/** Read a user-selected file. */
export declare const readFile: import("./tool.js").ToolDef;
/** Get browser and device info. */
export declare const getDeviceInfo: import("./tool.js").ToolDef;
/** All DOM-related tools. */
export declare const domTools: import("./tool.js").ToolDef[];
/** All storage tools. */
export declare const storageTools: import("./tool.js").ToolDef[];
/** All media/input tools. */
export declare const mediaTools: import("./tool.js").ToolDef[];
/** All network tools. */
export declare const networkTools: import("./tool.js").ToolDef[];
/** All UI/system tools. */
export declare const uiTools: import("./tool.js").ToolDef[];
/** Every built-in browser tool. */
export declare const allBrowserTools: import("./tool.js").ToolDef[];
