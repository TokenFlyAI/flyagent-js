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

export const JS = {
  string(description = "", options: { enum?: string[] } = {}): JSONSchema {
    const s: JSONSchema = { type: "string" };
    if (description) s.description = description;
    if (options.enum) s.enum = options.enum;
    return s;
  },

  integer(description = ""): JSONSchema {
    const s: JSONSchema = { type: "integer" };
    if (description) s.description = description;
    return s;
  },

  number(description = ""): JSONSchema {
    const s: JSONSchema = { type: "number" };
    if (description) s.description = description;
    return s;
  },

  boolean(description = ""): JSONSchema {
    const s: JSONSchema = { type: "boolean" };
    if (description) s.description = description;
    return s;
  },

  array(items?: JSONSchema, description = ""): JSONSchema {
    const s: JSONSchema = { type: "array" };
    if (description) s.description = description;
    if (items) s.items = items;
    return s;
  },

  object(
    properties: Record<string, JSONSchema> = {},
    required: string[] = [],
    description = ""
  ): JSONSchema {
    const s: JSONSchema = {
      type: "object",
      properties,
      required,
      additionalProperties: true,
    };
    if (description) s.description = description;
    return s;
  },
};
