/**
 * Vanilla JS renderer for markdown-ui.com widget DSL.
 * Parses markdown, finds widget code blocks, replaces them with interactive DOM.
 * Zero framework dependencies.
 */
// ─── Tokenizer ───────────────────────────────────────────────────────────────
function tokenize(line) {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
        // Skip whitespace
        while (i < line.length && /\s/.test(line[i]))
            i++;
        if (i >= line.length)
            break;
        if (line[i] === '"') {
            // Quoted string
            let str = '';
            i++;
            while (i < line.length && line[i] !== '"') {
                if (line[i] === '\\' && i + 1 < line.length) {
                    str += line[i + 1];
                    i += 2;
                }
                else {
                    str += line[i];
                    i++;
                }
            }
            i++; // skip closing quote
            tokens.push(str);
        }
        else if (line[i] === '[') {
            // Array
            let depth = 1;
            let arr = '[';
            i++;
            while (i < line.length && depth > 0) {
                if (line[i] === '[')
                    depth++;
                if (line[i] === ']')
                    depth--;
                arr += line[i];
                i++;
            }
            tokens.push(arr);
        }
        else {
            // Unquoted token
            let tok = '';
            while (i < line.length && !/\s/.test(line[i])) {
                tok += line[i];
                i++;
            }
            tokens.push(tok);
        }
    }
    return tokens;
}
function parseArray(arrStr) {
    const inner = arrStr.slice(1, -1).trim();
    if (!inner)
        return [];
    const items = [];
    let i = 0;
    while (i < inner.length) {
        while (i < inner.length && /\s/.test(inner[i]) && inner[i] !== '"')
            i++;
        if (i >= inner.length)
            break;
        if (inner[i] === '"') {
            let str = '';
            i++;
            while (i < inner.length && inner[i] !== '"') {
                if (inner[i] === '\\' && i + 1 < inner.length) {
                    str += inner[i + 1];
                    i += 2;
                }
                else {
                    str += inner[i];
                    i++;
                }
            }
            i++;
            items.push(str);
        }
        else {
            let tok = '';
            while (i < inner.length && !/\s/.test(inner[i])) {
                tok += inner[i];
                i++;
            }
            const num = Number(tok);
            items.push(Number.isNaN(num) ? tok : num);
        }
    }
    return items;
}
export function parseWidget(code) {
    const lines = code.trim().split('\n');
    const firstLine = lines[0].trim();
    const tokens = tokenize(firstLine);
    if (tokens.length < 1)
        return null;
    const type = tokens[0];
    // Chart widgets don't require an ID in the markdown-ui DSL
    const id = tokens[1] || `${type}-widget`;
    const config = { type, id };
    switch (type) {
        case 'text-input': {
            // text-input id "label" "placeholder" "default"
            if (tokens[2])
                config.label = tokens[2];
            if (tokens[3])
                config.placeholder = tokens[3];
            if (tokens[4])
                config.defaultValue = tokens[4];
            break;
        }
        case 'button-group': {
            // button-group id ["A" "B" "C"] "default"
            if (tokens[2] && tokens[2].startsWith('[')) {
                config.options = parseArray(tokens[2]);
            }
            if (tokens[3])
                config.defaultValue = tokens[3];
            break;
        }
        case 'select': {
            // select id ["A" "B"] "default"
            if (tokens[2] && tokens[2].startsWith('[')) {
                config.options = parseArray(tokens[2]);
            }
            if (tokens[3])
                config.defaultValue = tokens[3];
            break;
        }
        case 'select-multi': {
            // select-multi id ["A" "B"] ["default1"]
            if (tokens[2] && tokens[2].startsWith('[')) {
                config.options = parseArray(tokens[2]);
            }
            if (tokens[3] && tokens[3].startsWith('[')) {
                config.defaultValue = parseArray(tokens[3]);
            }
            break;
        }
        case 'slider': {
            // slider id min max step default
            config.min = Number(tokens[2]) || 0;
            config.max = Number(tokens[3]) || 100;
            config.step = Number(tokens[4]) || 1;
            config.defaultValue = Number(tokens[5]) || config.min;
            break;
        }
        case 'form': {
            // form id "Submit Label"
            if (tokens[2])
                config.submitLabel = tokens[2];
            // Parse indented child widgets
            const children = [];
            for (let j = 1; j < lines.length; j++) {
                const line = lines[j];
                if (line.startsWith('  ') || line.startsWith('\t')) {
                    const child = parseWidget(line.trim());
                    if (child)
                        children.push(child);
                }
            }
            config.children = children;
            break;
        }
        case 'chart-line':
        case 'chart-bar':
        case 'chart-pie':
        case 'chart-scatter': {
            // Parse config lines and CSV data
            const chartConfig = {};
            const dataLines = [];
            let inData = false;
            for (let j = 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (!line)
                    continue;
                if (line.includes(':') && !inData) {
                    const [k, ...rest] = line.split(':');
                    chartConfig[k.trim()] = rest.join(':').trim();
                }
                else {
                    inData = true;
                    dataLines.push(line);
                }
            }
            config.chartType = type.replace('chart-', '');
            config.title = chartConfig.title || '';
            config.height = Number(chartConfig.height) || 300;
            config.csv = dataLines.join('\n');
            break;
        }
        default:
            return null;
    }
    return config;
}
// ─── DOM Factory ─────────────────────────────────────────────────────────────
function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className)
        el.className = className;
    if (text)
        el.textContent = text;
    return el;
}
function renderButtonGroup(config) {
    const container = createElement('div', 'mdui-widget mdui-button-group');
    container.dataset.widgetId = config.id;
    const options = config.options || [];
    const defaultValue = String(config.defaultValue || '');
    options.forEach((opt) => {
        const btn = createElement('button', 'mdui-btn', String(opt));
        btn.dataset.value = String(opt);
        if (String(opt) === defaultValue)
            btn.classList.add('active');
        container.appendChild(btn);
    });
    return container;
}
function renderSelect(config) {
    const wrapper = createElement('div', 'mdui-widget mdui-select-wrapper');
    wrapper.dataset.widgetId = config.id;
    const label = createElement('label', 'mdui-label', String(config.label || config.id));
    const select = createElement('select', 'mdui-select');
    select.dataset.widgetId = config.id;
    const options = config.options || [];
    const defaultValue = String(config.defaultValue || '');
    options.forEach((opt) => {
        const option = createElement('option', '', String(opt));
        option.value = String(opt);
        if (String(opt) === defaultValue)
            option.selected = true;
        select.appendChild(option);
    });
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    return wrapper;
}
function renderSlider(config) {
    const wrapper = createElement('div', 'mdui-widget mdui-slider-wrapper');
    wrapper.dataset.widgetId = config.id;
    const label = createElement('label', 'mdui-label', String(config.label || config.id));
    const row = createElement('div', 'mdui-slider-row');
    const input = createElement('input', 'mdui-slider');
    input.type = 'range';
    input.min = String(config.min ?? 0);
    input.max = String(config.max ?? 100);
    input.step = String(config.step ?? 1);
    input.value = String(config.defaultValue ?? config.min ?? 0);
    input.dataset.widgetId = config.id;
    const valueDisplay = createElement('span', 'mdui-slider-value', input.value);
    input.addEventListener('input', () => {
        valueDisplay.textContent = input.value;
    });
    row.appendChild(input);
    row.appendChild(valueDisplay);
    wrapper.appendChild(label);
    wrapper.appendChild(row);
    return wrapper;
}
function renderTextInput(config) {
    const wrapper = createElement('div', 'mdui-widget mdui-text-input-wrapper');
    wrapper.dataset.widgetId = config.id;
    const label = createElement('label', 'mdui-label', String(config.label || config.id));
    const input = createElement('input', 'mdui-text-input');
    input.type = 'text';
    input.placeholder = String(config.placeholder || '');
    input.value = String(config.defaultValue || '');
    input.dataset.widgetId = config.id;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
}
function renderForm(config) {
    const form = createElement('form', 'mdui-widget mdui-form');
    form.dataset.widgetId = config.id;
    const children = config.children || [];
    children.forEach((child) => {
        const el = renderWidget(child);
        if (el)
            form.appendChild(el);
    });
    const submitBtn = createElement('button', 'mdui-submit-btn', String(config.submitLabel || 'Submit'));
    submitBtn.type = 'submit';
    form.appendChild(submitBtn);
    return form;
}
function renderChart(config) {
    const wrapper = createElement('div', 'mdui-widget mdui-chart-wrapper');
    wrapper.dataset.widgetId = config.id;
    if (config.title) {
        const title = createElement('h4', 'mdui-chart-title', String(config.title));
        wrapper.appendChild(title);
    }
    const canvas = createElement('canvas', 'mdui-chart');
    canvas.dataset.chartType = String(config.chartType);
    canvas.dataset.csv = String(config.csv || '');
    canvas.height = Number(config.height) || 300;
    wrapper.appendChild(canvas);
    return wrapper;
}
function renderWidget(config) {
    if (!config)
        return null;
    switch (config.type) {
        case 'button-group': return renderButtonGroup(config);
        case 'select': return renderSelect(config);
        case 'slider': return renderSlider(config);
        case 'text-input': return renderTextInput(config);
        case 'form': return renderForm(config);
        case 'chart-line':
        case 'chart-bar':
        case 'chart-pie':
        case 'chart-scatter':
            return renderChart(config);
        default:
            return null;
    }
}
// ─── Event Wiring ────────────────────────────────────────────────────────────
export function attachListeners(container, onChange) {
    // Button groups
    container.querySelectorAll('.mdui-button-group').forEach((el) => {
        el.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn)
                return;
            const group = el;
            group.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            onChange(group.dataset.widgetId || '', btn.dataset.value || '');
        });
    });
    // Selects
    container.querySelectorAll('.mdui-select').forEach((el) => {
        el.addEventListener('change', () => {
            const select = el;
            onChange(select.dataset.widgetId || '', select.value);
        });
    });
    // Sliders
    container.querySelectorAll('.mdui-slider').forEach((el) => {
        el.addEventListener('change', () => {
            const slider = el;
            onChange(slider.dataset.widgetId || '', Number(slider.value));
        });
    });
    // Text inputs (emit on blur or Enter)
    container.querySelectorAll('.mdui-text-input').forEach((el) => {
        const input = el;
        input.addEventListener('blur', () => {
            onChange(input.dataset.widgetId || '', input.value);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    });
    // Forms
    container.querySelectorAll('.mdui-form').forEach((el) => {
        el.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = el;
            const data = {};
            form.querySelectorAll('[data-widget-id]').forEach((child) => {
                const input = child;
                const wid = child.getAttribute('data-widget-id');
                if (!wid)
                    return;
                if (input.tagName === 'SELECT') {
                    data[wid] = input.value;
                }
                else if (input.type === 'range') {
                    data[wid] = Number(input.value);
                }
                else {
                    data[wid] = input.value;
                }
            });
            onChange(form.dataset.widgetId || '', data);
        });
    });
}
// ─── Chart Rendering (Chart.js) ──────────────────────────────────────────────
function parseCSV(csv) {
    const lines = csv.trim().split('\n').filter((l) => l.trim());
    if (lines.length < 2)
        return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => line.split(',').map((cell) => {
        const n = Number(cell.trim());
        return Number.isNaN(n) ? cell.trim() : n;
    }));
    return { headers, rows };
}
export function renderCharts(container) {
    if (typeof window.Chart === 'undefined')
        return;
    const Chart = window.Chart;
    container.querySelectorAll('.mdui-chart').forEach((el) => {
        const canvas = el;
        const csv = canvas.dataset.csv || '';
        const chartType = canvas.dataset.chartType || 'line';
        const { headers, rows } = parseCSV(csv);
        if (headers.length < 2 || rows.length === 0)
            return;
        const labels = rows.map((r) => String(r[0]));
        const datasets = headers.slice(1).map((header, idx) => ({
            label: header,
            data: rows.map((r) => (typeof r[idx + 1] === 'number' ? r[idx + 1] : 0)),
            borderWidth: 2,
            tension: 0.3,
        }));
        // Destroy previous chart if exists
        if (canvas._chart) {
            canvas._chart.destroy();
        }
        const cfg = {
            type: chartType === 'scatter' ? 'scatter' : chartType,
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
            },
        };
        if (chartType === 'pie') {
            cfg.data = {
                labels: datasets.map((d) => d.label),
                datasets: [{
                        data: datasets.map((d) => d.data.reduce((a, b) => a + b, 0)),
                    }],
            };
        }
        canvas._chart = new Chart(canvas.getContext('2d'), cfg);
    });
}
// ─── Main Render ─────────────────────────────────────────────────────────────
export function renderMarkdown(markdown, container, onChange) {
    const marked = window.marked;
    if (!marked) {
        container.innerHTML = '<p style="color:red">Error: marked.js not loaded</p>';
        return;
    }
    // Parse markdown to HTML
    let html = marked.parse(markdown);
    // Replace widget code blocks with interactive DOM
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('pre code.language-markdown-ui-widget').forEach((block) => {
        const code = block.textContent || '';
        const config = parseWidget(code);
        const widgetEl = renderWidget(config);
        if (widgetEl && block.parentElement) {
            block.parentElement.replaceWith(widgetEl);
        }
    });
    container.innerHTML = '';
    while (temp.firstChild) {
        container.appendChild(temp.firstChild);
    }
    // Wire up events
    attachListeners(container, onChange);
    // Render charts
    renderCharts(container);
}
