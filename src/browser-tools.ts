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

import { tool, JS } from "./tool.js";

// ── DOM Tools ─────────────────────────────────────────────────────────────

/** Query DOM elements and return their text content or attributes. */
export const domQuery = tool({
  name: "domQuery",
  description:
    "Query DOM elements by CSS selector. Returns text content, attributes, or HTML. " +
    "Use this to read page content, find buttons, forms, or any element.",
  parameters: JS.object({
    selector: JS.string("CSS selector, e.g., 'h1', '.class', '#id', 'button[type=submit]'"),
    mode: JS.string("What to extract: 'text' | 'html' | 'value' | 'attribute'"),
    attribute: JS.string("If mode='attribute', which attribute to read (e.g., 'href', 'src')"),
    limit: JS.integer("Max number of elements to return (default: 10)"),
  }, ["selector"]),
  execute: ({ selector, mode = "text", attribute, limit = 10 }) => {
    const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit);
    if (elements.length === 0) return `No elements found for "${selector}"`;

    return elements.map((el, i) => {
      let val: string;
      switch (mode) {
        case "html":
          val = (el as HTMLElement).outerHTML ?? "";
          break;
        case "value":
          val = (el as HTMLInputElement).value ?? "";
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
export const domClick = tool({
  name: "domClick",
  description: "Click on a DOM element by CSS selector. Useful for pressing buttons, expanding menus, etc.",
  parameters: JS.object({
    selector: JS.string("CSS selector of element to click"),
  }, ["selector"]),
  execute: ({ selector }) => {
    const el = document.querySelector(selector);
    if (!el) return `Element not found: ${selector}`;
    (el as HTMLElement).click();
    return `Clicked ${selector}`;
  },
});

/** Scroll to a DOM element. */
export const domScroll = tool({
  name: "domScroll",
  description: "Scroll the page to bring an element into view.",
  parameters: JS.object({
    selector: JS.string("CSS selector of element to scroll to"),
    behavior: JS.string("Scroll behavior: 'smooth' | 'auto' (default: smooth)"),
  }, ["selector"]),
  execute: ({ selector, behavior = "smooth" }) => {
    const el = document.querySelector(selector);
    if (!el) return `Element not found: ${selector}`;
    el.scrollIntoView({ behavior: behavior as ScrollBehavior, block: "center" });
    return `Scrolled to ${selector}`;
  },
});

/** Set text content or attribute of a DOM element. */
export const domSet = tool({
  name: "domSet",
  description:
    "Modify a DOM element: set its text content, innerHTML, value, or an attribute. " +
    "Useful for filling forms, updating UI, or injecting content.",
  parameters: JS.object({
    selector: JS.string("CSS selector of element to modify"),
    mode: JS.string("What to set: 'text' | 'html' | 'value' | 'attribute'"),
    value: JS.string("Value to set"),
    attribute: JS.string("If mode='attribute', which attribute to set"),
  }, ["selector", "mode", "value"]),
  execute: ({ selector, mode, value, attribute }) => {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return `Element not found: ${selector}`;
    switch (mode) {
      case "text":
        el.textContent = value;
        break;
      case "html":
        el.innerHTML = value;
        break;
      case "value":
        (el as HTMLInputElement).value = value;
        break;
      case "attribute":
        if (attribute) el.setAttribute(attribute, value);
        break;
      default:
        return `Unknown mode: ${mode}`;
    }
    return `Set ${mode} of ${selector} to "${value.slice(0, 50)}"`;
  },
});

/** Get current page metadata. */
export const getPageInfo = tool({
  name: "getPageInfo",
  description: "Get current page URL, title, meta description, viewport size, and scroll position.",
  parameters: JS.object(),
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
export const localStorageRead = tool({
  name: "localStorageRead",
  description: "Read a value from browser localStorage by key.",
  parameters: JS.object({
    key: JS.string("localStorage key to read"),
  }, ["key"]),
  execute: ({ key }) => {
    try {
      const val = localStorage.getItem(key);
      return val === null ? `Key "${key}" not found in localStorage.` : val;
    } catch (e) {
      return `Error reading localStorage: ${String(e)}`;
    }
  },
});

/** Write to localStorage. */
export const localStorageWrite = tool({
  name: "localStorageWrite",
  description: "Write a value to browser localStorage by key.",
  parameters: JS.object({
    key: JS.string("localStorage key to write"),
    value: JS.string("Value to store"),
  }, ["key", "value"]),
  execute: ({ key, value }) => {
    try {
      localStorage.setItem(key, value);
      return `Stored "${key}" in localStorage.`;
    } catch (e) {
      return `Error writing localStorage: ${String(e)}`;
    }
  },
});

/** List all localStorage keys. */
export const localStorageList = tool({
  name: "localStorageList",
  description: "List all keys in browser localStorage.",
  parameters: JS.object(),
  execute: () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys.length === 0 ? "localStorage is empty." : keys.join("\n");
  },
});

/** Capture the screen or a specific application window. */
export const screenCapture = tool({
  name: "screenCapture",
  description:
    "Capture a screenshot of the user's screen, a specific window, or a browser tab. " +
    "The user will be prompted to select what to share. Returns a base64 data URL.",
  parameters: JS.object({
    displaySurface: JS.string("What to capture: 'monitor' (full screen) | 'window' | 'browser'. Default: monitor"),
  }),
  execute: async ({ displaySurface = "monitor" }) => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: displaySurface as any },
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      // Wait a frame for the video to render
      await new Promise((r) => setTimeout(r, 500));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

      return canvas.toDataURL("image/png");
    } catch (e) {
      return `Screen capture failed: ${String(e)}`;
    }
  },
});

/** Continuous speech recognition. */
export const speechRecognition = tool({
  name: "speechRecognition",
  description:
    "Listen to the user's voice and transcribe speech to text. " +
    "The user must grant microphone permission. " +
    "Listens for a single utterance and returns the transcript.",
  parameters: JS.object({
    lang: JS.string("Language code, e.g., 'en-US', 'zh-CN'. Default: browser language"),
    maxDuration: JS.integer("Max listening duration in seconds (default: 30)"),
  }),
  execute: async ({ lang, maxDuration = 30 }) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return "Speech recognition not supported in this browser.";

    return new Promise((resolve) => {
      const rec = new SpeechRecognition();
      rec.lang = lang || navigator.language;
      rec.continuous = false;
      rec.interimResults = false;

      const timeout = setTimeout(() => {
        rec.stop();
        resolve("Speech recognition timed out. No speech detected.");
      }, maxDuration * 1000);

      rec.onresult = (event: any) => {
        clearTimeout(timeout);
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      rec.onerror = (event: any) => {
        clearTimeout(timeout);
        resolve(`Speech recognition error: ${event.error}`);
      };

      rec.onnomatch = () => {
        clearTimeout(timeout);
        resolve("No speech was recognized.");
      };

      rec.start();
    });
  },
});

/** Read from IndexedDB. */
export const indexedDBRead = tool({
  name: "indexedDBRead",
  description:
    "Read a value from browser IndexedDB by database name, store name, and key. " +
    "IndexedDB is a structured NoSQL database built into the browser.",
  parameters: JS.object({
    dbName: JS.string("IndexedDB database name"),
    storeName: JS.string("Object store (table) name"),
    key: JS.string("Key to read"),
  }, ["dbName", "storeName", "key"]),
  execute: async ({ dbName, storeName, key }) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(`Store "${storeName}" not found in database "${dbName}".`);
          return;
        }
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          if (getReq.result === undefined) {
            resolve(`Key "${key}" not found.`);
          } else {
            resolve(JSON.stringify(getReq.result, null, 2));
          }
        };
        getReq.onerror = () => reject(getReq.error);
      };
    });
  },
});

/** Write to IndexedDB. */
export const indexedDBWrite = tool({
  name: "indexedDBWrite",
  description: "Write a JSON value to browser IndexedDB.",
  parameters: JS.object({
    dbName: JS.string("IndexedDB database name"),
    storeName: JS.string("Object store name"),
    key: JS.string("Key to write"),
    value: JS.string("JSON value to store"),
  }, ["dbName", "storeName", "key", "value"]),
  execute: async ({ dbName, storeName, key, value }) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        let parsed: any;
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
        const putReq = store.put(parsed, key);
        putReq.onsuccess = () => resolve(`Stored "${key}" in ${dbName}.${storeName}.`);
        putReq.onerror = () => reject(putReq.error);
      };
    });
  },
});

/** List all keys in an IndexedDB store. */
export const indexedDBList = tool({
  name: "indexedDBList",
  description: "List all keys in an IndexedDB object store.",
  parameters: JS.object({
    dbName: JS.string("IndexedDB database name"),
    storeName: JS.string("Object store name"),
  }, ["dbName", "storeName"]),
  execute: async ({ dbName, storeName }) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(`Store "${storeName}" not found.`);
          return;
        }
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const keysReq = store.getAllKeys();
        keysReq.onsuccess = () => resolve(keysReq.result.join("\n") || "Store is empty.");
        keysReq.onerror = () => reject(keysReq.error);
      };
    });
  },
});

/** Read all browser cookies for the current page. */
export const cookiesRead = tool({
  name: "cookiesRead",
  description:
    "Read all cookies for the current document. Returns key-value pairs. " +
    "Only cookies accessible to JavaScript (not HttpOnly) are returned.",
  parameters: JS.object(),
  execute: () => {
    const raw = document.cookie;
    if (!raw) return "No cookies found.";
    const pairs = raw.split(";").map((c) => c.trim());
    const result: Record<string, string> = {};
    for (const p of pairs) {
      const idx = p.indexOf("=");
      if (idx > 0) result[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
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
export const runJavaScript = tool({
  name: "runJavaScript",
  description:
    "Write and execute JavaScript code directly in the browser. " +
    "This is the most powerful tool — the code runs with full access to the page, " +
    "including document, window, localStorage, fetch, and all browser APIs. " +
    "Use `return` to provide the final result. " +
    "Use this for: complex DOM manipulation, calculations, data transformation, " +
    "batch operations, or anything the other tools can't do. " +
    "Example: `const data = JSON.parse(localStorage.getItem('user')); return data.name;`",
  parameters: JS.object({
    code: JS.string("JavaScript code to execute. Use `return` for the final result."),
    timeout: JS.integer("Max execution time in ms (default: 5000)"),
  }, ["code"]),
  execute: ({ code, timeout = 5000 }) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(`Error: Code execution timed out after ${timeout}ms`);
      }, timeout);

      try {
        // Build a function that has access to common globals
        // We pass them explicitly so the code can reference them even if shadowed
        const fn = new Function(
          "document",
          "window",
          "navigator",
          "console",
          "localStorage",
          "sessionStorage",
          "fetch",
          "location",
          "setTimeout",
          "setInterval",
          "JSON",
          "Math",
          "Date",
          "Array",
          "Object",
          "String",
          "Number",
          "Promise",
          `"use strict";\n${code}`
        );

        const result = fn(
          document,
          window,
          navigator,
          console,
          localStorage,
          sessionStorage,
          fetch,
          location,
          setTimeout,
          setInterval,
          JSON,
          Math,
          Date,
          Array,
          Object,
          String,
          Number,
          Promise
        );

        clearTimeout(timer);

        // Serialize result
        if (result === undefined) {
          resolve("Executed successfully (no return value).");
        } else if (typeof result === "string") {
          resolve(result);
        } else {
          try {
            resolve(JSON.stringify(result, null, 2));
          } catch {
            resolve(String(result));
          }
        }
      } catch (e) {
        clearTimeout(timer);
        resolve(`Runtime error: ${String(e)}`);
      }
    });
  },
});

// ── Network Tools ─────────────────────────────────────────────────────────

/** Make an HTTP fetch request from the browser. */
export const httpFetch = tool({
  name: "httpFetch",
  description:
    "Make an HTTP request from the browser. Use this to call external APIs, " +
    "fetch data, or check website availability. Respects CORS.",
  parameters: JS.object({
    url: JS.string("URL to fetch"),
    method: JS.string("HTTP method: GET | POST | PUT | DELETE (default: GET)"),
    headers: JS.object({}, [], "Optional headers as JSON object"),
    body: JS.string("Optional request body (for POST/PUT)"),
  }, ["url"]),
  execute: async ({ url, method = "GET", headers, body }) => {
    try {
      const resp = await fetch(url, {
        method,
        headers: headers ? (headers as Record<string, string>) : undefined,
        body: body || undefined,
      });
      const text = await resp.text();
      return {
        status: resp.status,
        statusText: resp.statusText,
        body: text.slice(0, 3000),
        truncated: text.length > 3000,
      };
    } catch (e) {
      return `Fetch failed: ${String(e)}`;
    }
  },
});

// ── Clipboard Tools ───────────────────────────────────────────────────────

/** Read text from clipboard. */
export const clipboardRead = tool({
  name: "clipboardRead",
  description:
    "Read text from the system clipboard. Requires user permission in most browsers. " +
    "Only works in secure contexts (HTTPS or localhost).",
  parameters: JS.object(),
  execute: async () => {
    try {
      const text = await navigator.clipboard.readText();
      return text || "Clipboard is empty.";
    } catch (e) {
      return `Clipboard read failed: ${String(e)}. Make sure you're on HTTPS and granted permission.`;
    }
  },
});

/** Write text to clipboard. */
export const clipboardWrite = tool({
  name: "clipboardWrite",
  description: "Write text to the system clipboard.",
  parameters: JS.object({
    text: JS.string("Text to copy to clipboard"),
  }, ["text"]),
  execute: async ({ text }) => {
    try {
      await navigator.clipboard.writeText(text);
      return `Copied to clipboard: "${text.slice(0, 100)}"`;
    } catch (e) {
      return `Clipboard write failed: ${String(e)}`;
    }
  },
});

// ── Media / Input Tools ───────────────────────────────────────────────────

/** Capture a photo from the user's camera. */
export const cameraCapture = tool({
  name: "cameraCapture",
  description:
    "Take a photo using the device's camera and return it as a base64 data URL. " +
    "Useful for visual analysis, QR scanning, or documenting something.",
  parameters: JS.object({
    facingMode: JS.string("Camera to use: 'user' (front) | 'environment' (back). Default: environment"),
  }),
  execute: async ({ facingMode = "environment" }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode as ConstrainDOMString },
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
    } catch (e) {
      return `Camera capture failed: ${String(e)}`;
    }
  },
});

/** Get device geolocation (GPS coordinates). */
export const getGeolocation = tool({
  name: "getGeolocation",
  description:
    "Get the device's current GPS coordinates. Requires user permission. " +
    "Returns latitude, longitude, and accuracy.",
  parameters: JS.object({
    enableHighAccuracy: JS.boolean("Request high-accuracy GPS (default: true)"),
  }),
  execute: async ({ enableHighAccuracy = true }) => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("Geolocation is not supported by this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          }),
        (err) => resolve(`Geolocation error: ${err.message} (code ${err.code})`),
        { enableHighAccuracy, timeout: 10000 }
      );
    });
  },
});

/** Use browser's text-to-speech to speak a message. */
export const speak = tool({
  name: "speak",
  description: "Speak text aloud using the browser's text-to-speech engine.",
  parameters: JS.object({
    text: JS.string("Text to speak"),
    lang: JS.string("Language code, e.g., 'en-US', 'zh-CN'. Default: browser language"),
    rate: JS.number("Speech rate: 0.1 (slow) to 10 (fast). Default: 1"),
  }, ["text"]),
  execute: ({ text, lang, rate = 1 }) => {
    if (!window.speechSynthesis) return "Text-to-speech not supported.";
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang) utterance.lang = lang;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
    return `Speaking: "${text.slice(0, 100)}"`;
  },
});

// ── UI / System Tools ─────────────────────────────────────────────────────

/** Show a browser notification. */
export const showNotification = tool({
  name: "showNotification",
  description:
    "Display a native browser notification. Requires user permission. " +
    "The page may need to be in focus or have notification permission granted.",
  parameters: JS.object({
    title: JS.string("Notification title"),
    body: JS.string("Notification body text"),
  }, ["title", "body"]),
  execute: async ({ title, body }) => {
    if (!("Notification" in window)) return "Notifications not supported.";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return `Notification permission denied (${perm}).`;
    new Notification(title, { body });
    return `Notification shown: ${title}`;
  },
});

/** Use the native Web Share API to share content. */
export const shareContent = tool({
  name: "shareContent",
  description:
    "Open the device's native share dialog (mobile) or copy link (desktop). " +
    "Useful for sharing results, URLs, or generated content.",
  parameters: JS.object({
    title: JS.string("Share title"),
    text: JS.string("Share text/body"),
    url: JS.string("URL to share"),
  }, ["title", "text"]),
  execute: async ({ title, text, url }) => {
    if (!("share" in navigator)) return "Web Share API not supported on this device.";
    try {
      await navigator.share({ title, text, url });
      return "Share dialog opened.";
    } catch (e) {
      return `Share failed: ${String(e)}`;
    }
  },
});

/** Download a file to the user's device. */
export const downloadFile = tool({
  name: "downloadFile",
  description:
    "Create and download a file to the user's device. Useful for exporting " +
    "reports, CSVs, JSON data, or generated documents.",
  parameters: JS.object({
    filename: JS.string("Name of file to download, e.g., 'report.txt'"),
    content: JS.string("File content (text)"),
    mimeType: JS.string("MIME type, e.g., 'text/plain', 'application/json'. Default: text/plain"),
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
export const readFile = tool({
  name: "readFile",
  description:
    "Prompt the user to select a file and read its contents as text or base64. " +
    "Useful for uploading documents, images, or data files for analysis.",
  parameters: JS.object({
    accept: JS.string("File type filter, e.g., '.txt,.json' or 'image/*'"),
    asBase64: JS.boolean("Return file as base64 instead of text (useful for images). Default: false"),
  }),
  execute: async ({ accept, asBase64 = false }) => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      if (accept) input.accept = accept;
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
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        } else {
          const text = await file.text();
          resolve(text.slice(0, 5000) + (text.length > 5000 ? "\n...[truncated]" : ""));
        }
      };

      input.click();
    });
  },
});

/** Get browser and device info. */
export const getDeviceInfo = tool({
  name: "getDeviceInfo",
  description:
    "Get device and browser information: screen size, memory, cores, " +
    "online status, battery, and network type.",
  parameters: JS.object(),
  execute: async () => {
    const info: Record<string, unknown> = {
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
    const conn = (navigator as any).connection;
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
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        info.battery = {
          level: battery.level,
          charging: battery.charging,
        };
      }
    } catch {
      /* ignore */
    }

    return info;
  },
});

// ── Convenience bundles ───────────────────────────────────────────────────

/** All DOM-related tools. */
export const domTools = [domQuery, domClick, domScroll, domSet, getPageInfo];

/** All storage tools. */
export const storageTools = [localStorageRead, localStorageWrite, localStorageList];

/** All media/input tools. */
export const mediaTools = [clipboardRead, clipboardWrite, cameraCapture, getGeolocation, speak];

/** All network tools. */
export const networkTools = [httpFetch];

/** All UI/system tools. */
export const uiTools = [showNotification, shareContent, downloadFile, readFile, getDeviceInfo];

/** Every built-in browser tool. */
export const allBrowserTools = [
  ...domTools,
  ...storageTools,
  cookiesRead,
  runJavaScript,
  screenCapture,
  speechRecognition,
  indexedDBRead,
  indexedDBWrite,
  indexedDBList,
  ...mediaTools,
  ...networkTools,
  ...uiTools,
];
