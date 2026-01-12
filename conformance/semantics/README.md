# PromptG Semantics Conformance (v1)

This folder contains small, tool-agnostic test vectors for PromptG semantic behavior.

Unlike the JSON Schema conformance suites, these tests validate behaviors that schemas cannot express (rendering, extraction, and template instantiation).

## Test Vector Files

All files are UTF-8 JSON without BOM.

Each file contains one JSON object with an `op` field.

### `op: "render"`

Validates variable extraction, missing variable computation, escaping, defaults, and single-pass substitution.

Shape:

```json
{
  "op": "render",
  "content": "Hello {{a}} {{!a}}",
  "vars": { "a": "1" },
  "defaults": { "b": "2" },
  "expected": "Hello 1 {{a}}",
  "expectedExtracted": ["a"],
  "expectedMissing": []
}
```

Notes:

- `expectedExtracted` and `expectedMissing` are treated as sets (order-insensitive).
- Missing variables are computed as: extracted vars minus keys present in `vars` or `defaults`.
- `{{!name}}` is not a variable occurrence and is never substituted during the same render.

### `op: "extract"`

Validates variable extraction only.

Shape:

```json
{ "op": "extract", "content": "{{a}} {{ a }} {{!a}}", "expected": ["a"] }
```

Notes:

- `expected` is treated as a set (order-insensitive).

### `op: "instantiate"`

Validates template instantiation semantics (create a Prompt from a Template).

Shape:

```json
{
  "op": "instantiate",
  "template": { "kind": "template", "schemaVersion": "1", "...": "..." },
  "expected": { "kind": "prompt", "schemaVersion": "1", "...": "..." }
}
```

Notes:

- Instantiation is structural: it MUST NOT render content or prompt for variables.
- The output Prompt is a deep copy of `template.prompt`.
- Fields outside `template.prompt` MUST NOT affect the output.
