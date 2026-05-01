/**
 * Lightweight JSON Schema builder.
 * Mirrors flyagent.core.schema.JS from the Python framework.
 */
export interface JSONSchema {
    type: string;
    description?: string;
    enum?: string[];
    properties?: Record<string, JSONSchema>;
    required?: string[];
    items?: JSONSchema;
    additionalProperties?: boolean;
}
export declare const JS: {
    string(description?: string, options?: {
        enum?: string[];
    }): JSONSchema;
    integer(description?: string): JSONSchema;
    number(description?: string): JSONSchema;
    boolean(description?: string): JSONSchema;
    array(items?: JSONSchema, description?: string): JSONSchema;
    object(properties?: Record<string, JSONSchema>, required?: string[], description?: string): JSONSchema;
};
