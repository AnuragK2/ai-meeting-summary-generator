import { describe, expect, it } from "vitest";
import { buildExtractionJsonSchema } from "../src/infrastructure/openai/jsonSchema.js";

describe("OpenAI JSON schema", () => {
  const schema = buildExtractionJsonSchema();

  it("sets additionalProperties=false on every object", () => {
    const violations: string[] = [];
    function walk(node: unknown, path: string) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      const obj = node as Record<string, unknown>;
      if (obj.type === "object" && obj.additionalProperties !== false) {
        violations.push(path);
      }
      for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`);
    }
    walk(schema, "$");
    expect(violations).toEqual([]);
  });

  it("requires every declared property", () => {
    const violations: string[] = [];
    function walk(node: unknown, path: string) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      const obj = node as Record<string, unknown>;
      if (obj.type === "object" && obj.properties) {
        const required = (obj.required ?? []) as string[];
        const props = Object.keys(obj.properties as Record<string, unknown>);
        for (const p of props) {
          if (!required.includes(p)) violations.push(`${path}.${p}`);
        }
      }
      for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`);
    }
    walk(schema, "$");
    expect(violations).toEqual([]);
  });

  it("models nullable fields as type arrays, not anyOf", () => {
    const anyOfPaths: string[] = [];
    function walk(node: unknown, path: string) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.anyOf)) anyOfPaths.push(path);
      for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`);
    }
    walk(schema, "$");
    expect(anyOfPaths).toEqual([]);
  });

  it("declares all expected top-level fields", () => {
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual([
      "action_items",
      "key_decisions",
      "open_questions",
      "summary",
    ]);
  });
});
