"use strict";
/**
 * Lightweight JSON Schema builder.
 * Mirrors flyagent.core.schema.JS from the Python framework.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS = void 0;
exports.JS = {
    string(description = "", options = {}) {
        const s = { type: "string" };
        if (description)
            s.description = description;
        if (options.enum)
            s.enum = options.enum;
        return s;
    },
    integer(description = "") {
        const s = { type: "integer" };
        if (description)
            s.description = description;
        return s;
    },
    number(description = "") {
        const s = { type: "number" };
        if (description)
            s.description = description;
        return s;
    },
    boolean(description = "") {
        const s = { type: "boolean" };
        if (description)
            s.description = description;
        return s;
    },
    array(items, description = "") {
        const s = { type: "array" };
        if (description)
            s.description = description;
        if (items)
            s.items = items;
        return s;
    },
    object(properties = {}, required = [], description = "") {
        const s = {
            type: "object",
            properties,
            required,
            additionalProperties: true,
        };
        if (description)
            s.description = description;
        return s;
    },
};
