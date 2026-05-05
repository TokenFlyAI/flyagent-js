/**
 * Vanilla JS renderer for markdown-ui.com widget DSL.
 * Parses markdown, finds widget code blocks, replaces them with interactive DOM.
 * Zero framework dependencies.
 */
export interface WidgetConfig {
    type: string;
    id: string;
    [key: string]: unknown;
}
export type WidgetChangeHandler = (id: string, value: unknown) => void;
export declare function parseWidget(code: string): WidgetConfig | null;
export declare function attachListeners(container: HTMLElement, onChange: WidgetChangeHandler): void;
export declare function renderCharts(container: HTMLElement): void;
export declare function renderMarkdown(markdown: string, container: HTMLElement, onChange: WidgetChangeHandler): void;
