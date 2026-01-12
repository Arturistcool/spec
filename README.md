# PromptG Specification

> **An open standard JSON format for prompts, templates, and prompt packs**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Spec Version](https://img.shields.io/badge/spec-v1.0-green.svg)](CHANGELOG.md)

## Overview

PromptG defines a standardized JSON format for storing, versioning, and sharing prompts, templates, and prompt packs. This specification enables tool-agnostic prompt management with support for variables, metadata, and extensibility.

Includes JSON Schemas, conformance tests, and a standardized `.promptg/` on-disk layout.

**Design principles:**

- **Simple**: Core format is minimal and portable
- **Extensible**: `x-*` fields allow tool-specific metadata
- **Interoperable**: Works with any JSON Schema validator
- **Local-first**: No cloud dependencies required

## Quick Links

- **[Specification](spec/promptg-spec.md)** - Normative specification (RFC 2119)
- **[File Store Layout](spec/promptg-spec.md#13-file-store-layout)** - Standard `.promptg/` on-disk layout
- **[JSON Schemas](schemas/v1/)** - Machine-readable schemas
- **[Conformance Tests](conformance/)** - Validation fixtures for implementations
- **[Examples](examples/)** - Human-friendly examples
- **[Implementation Guide](docs/guide.md)** - How to implement PromptG
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## Ecosystem

- **You are in `promptg/spec`**: the canonical PromptG standard (spec text, schemas, conformance tests).
- **Reference implementation**: https://github.com/promptg/cli (CLI + UI).
- **Starter packs**: https://github.com/promptg/starter-packs
- **Website**: https://promptg.io (landing page, hosted schemas, pack mirror).

**Routing:**

- Spec/schema issues: https://github.com/promptg/spec/issues
- CLI bugs/features: https://github.com/promptg/cli/issues

PromptG documents use `schemaVersion: "1"`.

## Document Types

### Prompt (`kind: "prompt"`)

A ready-to-use prompt instance.

```json
{
  "kind": "prompt",
  "schemaVersion": "1",
  "name": "code-review",
  "content": "Review this {{language}} code for {{focus}}"
}
```

### Template (`kind: "template"`)

A reusable blueprint for creating prompts.

```json
{
  "kind": "template",
  "schemaVersion": "1",
  "name": "pr-review",
  "displayName": "PR Review",
  "description": "Review a pull request diff",
  "prompt": {
    "kind": "prompt",
    "schemaVersion": "1",
    "name": "pr-review",
    "content": "Review this PR: {{diff}}"
  }
}
```

### Pack (`kind: "pack"`)

A versioned bundle of prompts and templates.

```json
{
  "kind": "pack",
  "schemaVersion": "1",
  "name": "dev-essentials",
  "version": "1.0.0",
  "templates": [...]
}
```

## JSON Schemas

All formats have JSON schemas for validation:

- [`prompt.schema.json`](schemas/v1/prompt.schema.json)
- [`template.schema.json`](schemas/v1/template.schema.json)
- [`pack.schema.json`](schemas/v1/pack.schema.json)

**Schema URLs:**

- `https://promptg.io/schemas/v1/prompt.schema.json`
- `https://promptg.io/schemas/v1/template.schema.json`
- `https://promptg.io/schemas/v1/pack.schema.json`

## Implementations

### Reference Implementation

- [@promptg/cli](https://github.com/promptg/cli) - TypeScript CLI (official)

## Features

### Variable Interpolation

```json
{
  "content": "Review {{language}} code for {{focus}}",
  "defaults": {
    "language": "TypeScript",
    "focus": "security"
  }
}
```

Variables use `{{variableName}}` syntax. Missing variables are left unchanged.

To emit a literal placeholder, use `{{!name}}` which renders as literal `{{name}}` (and is ignored as a variable occurrence during rendering).

### Extensibility

```json
{
  "kind": "prompt",
  "x-my-tool-metadata": { "customField": "value" },
  "x-promptg-interactive": {
    "language": {
      "question": "What programming language?",
      "required": true
    }
  }
}
```

Use `x-*` fields for tool-specific extensions. The `x-promptg-*` namespace is reserved.

### Standard Extensions (Stable in v1.0)

- `x-promptg-interactive` - Interactive prompting metadata
- `x-promptg-time` - Timestamp metadata

## Validation

Node.js: CI runs on Node 20; Node 20+ is recommended for running this repo's validation and test scripts.

### Node.js (ajv)

```bash
npm install ajv ajv-formats
```

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const schema = await fetch('https://promptg.io/schemas/v1/prompt.schema.json').then((r) =>
  r.json()
);

const validate = ajv.compile(schema);
const valid = validate(promptData);

if (!valid) console.error(validate.errors);
```

### Python (jsonschema)

```bash
pip install jsonschema requests
```

```python
import json
import requests
from jsonschema import validate

schema = requests.get('https://promptg.io/schemas/v1/prompt.schema.json').json()
validate(instance=prompt_data, schema=schema)
```

## Repository Structure

```
.
|---- spec/                    # Normative specification
|   `---- promptg-spec.md
|---- schemas/v1/              # JSON Schemas
|   |---- prompt.schema.json
|   |---- template.schema.json
|   `---- pack.schema.json
|---- examples/                # Human-friendly examples
|   |---- prompts/
|   |---- templates/
|   `---- packs/
|---- conformance/             # Conformance test suite
|   |---- valid/               # Valid test cases
|   |---- invalid/             # Invalid test cases (should fail)
|   `---- semantics/           # Semantic test vectors (render/extract/instantiate)
|---- docs/                    # Supporting documentation
|   `---- guide.md
`---- .github/workflows/       # CI validation
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to propose schema changes
- RFC process for major changes
- Code of conduct

## Governance

See [GOVERNANCE.md](GOVERNANCE.md) for:

- Maintainer structure
- Decision-making process
- Versioning policy

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

---

**PromptG**: Prompts as code. Versioned, shareable, standard.
