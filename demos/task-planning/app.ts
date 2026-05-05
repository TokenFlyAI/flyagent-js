/**
 * Task Planning Demo — Agent Controller
 *
 * Manages the AI agent loop, renders markdown UI, captures widget events,
 * and persists state via localStorage.
 */

import { Agent, tool, JS, allBrowserTools } from '../../dist/index.js';
import { renderMarkdown, WidgetChangeHandler } from './renderer.js';
import { DEMO_CONFIG } from './config.js';

const SYSTEM_PROMPT = `You are a Task Planning Assistant. Your entire user interface is rendered as Markdown with embedded interactive widgets. You do not output HTML, CSS, or JavaScript. You ONLY output Markdown.

## How this works

1. The user sees whatever Markdown you produce, rendered with interactive widgets.
2. When the user interacts with a widget (clicks a button, changes a slider, submits a form), you receive a text message describing what happened.
3. You then output NEW Markdown that reflects the updated state.
4. You maintain the task plan internally and render it as widgets.

## markdown-ui Widget DSL

Embed widgets inside fenced code blocks with language \`markdown-ui-widget\`.

Available widgets:

- \`text-input id "label" "placeholder" "default"\`
- \`button-group id ["Choice 1" "Choice 2"] "default"\`
- \`select id ["Option A" "Option B"] "default"\`
- \`slider id min max step default\`
- \`form id "Submit Label"\` (child widgets indented 2 spaces)
- \`chart-pie\`, \`chart-bar\`, \`chart-line\` (multi-line with CSV data after config lines)

**Quoting rules:** Use quotes for ANY text containing spaces. Arrays use [ ] brackets.

## Chart widget format

\`\`\`markdown-ui-widget
chart-pie
title: Task Status
Status,Count
Not Started,3
In Progress,2
Done,5
\`\`\`

## Response rules

1. ALWAYS respond with valid Markdown.
2. Use \`\`\`markdown-ui-widget blocks for interactive elements.
3. Keep your response concise — the user sees it rendered live.
4. NEVER explain that you are generating Markdown — just generate it.
5. Include a brief friendly text message before/after widgets.

## Task Plan Data Model

You maintain this structure internally:

- Mission: { name, description, createdAt }
- Tasks: [{ id, title, description, status, priority, progress, estimatedHours, deadline }]

Status values: "Not Started", "In Progress", "Done"
Priority values: "Low", "Medium", "High"
Progress: 0-100 integer

## Behavior modes

**Mode A: Mission Creation** (when no mission exists)
Show a form with text inputs for mission name and description, plus a submit button.

**Mode B: Task Suggestion** (after mission created)
Analyze the mission and suggest 5-10 tasks with estimated hours and priorities.
Show tasks as a list with an Accept/Reject/Modify button group.
Make it clear the user can also ADD CUSTOM TASKS at any time.

**Mode C: Active Planning** (after tasks accepted OR when user adds custom tasks)
Show the full task plan:
- Overall progress chart (pie chart)
- Tasks by priority (bar chart)
- Each task: title, select priority, button-group status, slider progress
- An "Add Task" form at the bottom so users can always create custom tasks

**Mode D: Timeline** (when user asks or after mode C)
Show a line chart with task deadlines/progress over time.

**Mode E: Progress Tracking**
When user updates any widget, recalculate charts and show updated plan.
When user submits the "Add Task" form, create the new task immediately with the provided details.
Suggest next tasks based on priority and completion status.

## Persistence

You have tools savePlan and loadPlan to persist the task plan JSON to localStorage.
Call savePlan after every mutation so state survives page reloads.
`;

// ─── Custom Tools ─────────────────────────────────────────────────────────────

const savePlanTool = tool({
  name: 'savePlan',
  description: 'Save the current task plan JSON to localStorage.',
  parameters: JS.object({
    json: JS.string('The task plan JSON string to save'),
  }, ['json']),
  execute: ({ json }) => {
    localStorage.setItem('task-planning-demo-plan', json);
    return 'Plan saved.';
  },
});

const loadPlanTool = tool({
  name: 'loadPlan',
  description: 'Load the task plan JSON from localStorage.',
  parameters: JS.object({}, []),
  execute: () => {
    const data = localStorage.getItem('task-planning-demo-plan');
    return data || 'No saved plan found.';
  },
});

// ─── App Controller ───────────────────────────────────────────────────────────

interface AppState {
  agent: InstanceType<typeof Agent> | null;
  markdown: string;
  isRunning: boolean;
  enableStreaming: boolean;
}

const state: AppState = {
  agent: null,
  markdown: '',
  isRunning: false,
  enableStreaming: true,
};

// DOM refs
const els = {
  app: () => document.getElementById('app')!,
  apiKey: () => document.getElementById('apiKey') as HTMLInputElement,
  configKey: () => DEMO_CONFIG.apiKey,
  streamingToggle: () => document.getElementById('enableStreaming') as HTMLInputElement,
  runBtn: () => document.getElementById('runBtn') as HTMLButtonElement,
  resetBtn: () => document.getElementById('resetBtn') as HTMLButtonElement,
  metricsBar: () => document.getElementById('metricsBar')!,
  eventLog: () => document.getElementById('eventLog')!,
  loading: () => document.getElementById('loading')!,
};

// ─── Rendering ────────────────────────────────────────────────────────────────

function showMarkdown(md: string): void {
  state.markdown = md;
  renderMarkdown(md, els.app(), handleWidgetEvent);
}

function setLoading(show: boolean): void {
  state.isRunning = show;
  els.loading().style.display = show ? 'block' : 'none';
  els.runBtn().disabled = show;
}

function logEvent(text: string, type: 'info' | 'error' | 'tool' = 'info'): void {
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  els.eventLog().appendChild(line);
  els.eventLog().scrollTop = els.eventLog().scrollHeight;
}

function updateMetrics(metrics: any): void {
  const m = metrics || {};
  els.metricsBar().textContent =
    `Calls: ${m.llmCalls || 0} | Tools: ${m.toolCalls || 0} | Tokens: ${m.totalTokens || 0} | Cost: ~$${(m.estimatedCost || 0).toFixed(4)} | Latency: ${(m.totalLatencyMs || 0).toFixed(0)}ms`;
}

// ─── Widget Event Handler ─────────────────────────────────────────────────────

const handleWidgetEvent: WidgetChangeHandler = (id, value) => {
  if (state.isRunning) {
    logEvent('Ignored event: agent is still running', 'info');
    return;
  }
  const msg = `User interacted with widget "${id}": ${JSON.stringify(value)}`;
  logEvent(msg, 'info');
  runAgentTurn(msg);
};

// ─── Agent Turn ────────────────────────────────────────────────────────────────

async function runAgentTurn(task: string): Promise<void> {
  if (!state.agent) return;
  setLoading(true);

  try {
    let currentMd = '';
    let gotResult = false;

    for await (const event of state.agent.stream(task)) {
      switch (event.type) {
        case 'token': {
          currentMd += event.text || '';
          // Throttle rendering
          if (state.enableStreaming && currentMd.length % 30 === 0) {
            showMarkdown(currentMd);
          }
          break;
        }
        case 'reasoning': {
          logEvent(`💭 ${(event.text || '').slice(0, 120)}...`, 'info');
          break;
        }
        case 'tool_start': {
          logEvent(`🔧 ${event.tool}(${JSON.stringify(event.input).slice(0, 100)})`, 'tool');
          break;
        }
        case 'tool_done': {
          if (event.error) {
            logEvent(`✗ ${event.tool}: ${event.error}`, 'error');
          } else {
            logEvent(`✓ ${event.tool}: ${(event.output || '').slice(0, 120)}`, 'tool');
          }
          break;
        }
        case 'result': {
          gotResult = true;
          currentMd = event.text || currentMd;
          showMarkdown(currentMd);
          break;
        }
        case 'metrics': {
          updateMetrics(event.metrics);
          break;
        }
        case 'error': {
          logEvent(`Error: ${event.error}`, 'error');
          break;
        }
      }
    }

    if (!gotResult && currentMd) {
      showMarkdown(currentMd);
    }
  } catch (e) {
    logEvent(`Crash: ${String(e)}`, 'error');
  } finally {
    setLoading(false);
  }
}

// ─── Initialization ────────────────────────────────────────────────────────────

async function initAgent(): Promise<void> {
  const apiKey = els.apiKey().value.trim() || els.configKey();
  if (!apiKey) {
    alert('Please enter your Kimi API key.');
    return;
  }

  state.enableStreaming = els.streamingToggle().checked;

  state.agent = new Agent({
    model: DEMO_CONFIG.model,
    apiKey,
    baseURL: DEMO_CONFIG.baseURL,
    tools: [...allBrowserTools, savePlanTool, loadPlanTool],
    system: SYSTEM_PROMPT,
    maxIterations: DEMO_CONFIG.maxIterations,
    enableStreaming: state.enableStreaming,
  });

  logEvent('Agent initialized with Kimi model', 'info');

  // Check for saved plan
  const saved = localStorage.getItem('task-planning-demo-plan');
  if (saved) {
    logEvent('Found saved plan in localStorage', 'info');
    await runAgentTurn('A saved plan was found. Load it with loadPlan(), then render the active planning UI.');
  } else {
    await runAgentTurn('Start the app. Show the mission creation form.');
  }
}

function resetApp(): void {
  localStorage.removeItem('task-planning-demo-plan');
  state.agent = null;
  showMarkdown('## 🚀 Task Planning Demo\n\nEnter your Kimi API key and click **Start** to begin.');
  els.eventLog().innerHTML = '';
  els.metricsBar().textContent = '';
  logEvent('App reset. Start fresh.', 'info');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export function bootstrap(): void {
  // Wire up buttons
  els.runBtn().addEventListener('click', initAgent);
  els.resetBtn().addEventListener('click', resetApp);

  // Pre-fill API key from config
  if (DEMO_CONFIG.apiKey) {
    els.apiKey().value = DEMO_CONFIG.apiKey;
  }

  // Initial markdown
  showMarkdown(`# 🎯 Task Planning Demo

Welcome! This entire app is rendered from **Markdown generated by an AI agent**.

## How it works

1. Enter your **Kimi API key** below
2. Click **Start**
3. The AI will generate interactive widgets for task planning
4. Click, type, and drag widgets — the AI responds in real-time

---

**No traditional UI code.** Just Markdown + AI agents.
`);

  logEvent('App loaded. API key pre-filled from config.', 'info');
}
