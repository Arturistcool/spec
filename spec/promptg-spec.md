# PromptG Specification v1.0

**Version:** 1.0.0
**Last Updated:** 2026-01-12

---

## Abstract

PromptG defines a standardized JSON format for storing, versioning, and sharing prompts, templates, and prompt packs. This specification enables tool-agnostic prompt management with support for variables, metadata, and extensibility.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Concepts and Rationale (Informative)](#2-core-concepts-and-rationale-informative)
3. [Conventions](#3-conventions)
4. [Document Model](#4-document-model)
5. [Variable Interpolation](#5-variable-interpolation)
6. [Prompt Format](#6-prompt-format)
7. [Template Format](#7-template-format)
8. [Pack Format](#8-pack-format)
9. [Standard Extensions](#9-standard-extensions)
10. [Versioning and Compatibility](#10-versioning-and-compatibility)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Limits](#12-implementation-limits)
13. [File Store Layout](#13-file-store-layout)
14. [References](#14-references)

---

## 1. Introduction

### 1.1 Purpose

PromptG provides a standard format for:

- **Storing** prompts and templates as version-controllable JSON
- **Sharing** prompts across teams and tools
- **Rendering** prompts with variable substitution
- **Packaging** collections of prompts for distribution

### 1.2 Design Goals

- **Minimal**: Core format is simple and portable
- **Extensible**: `x-*` fields allow tool-specific metadata
- **Interoperable**: Works with any JSON Schema validator

### 1.3 Terminology

- **Prompt**: A ready-to-use prompt instance
- **Template**: A reusable blueprint for creating prompts
- **Pack**: A versioned bundle of prompts and/or templates
- **Variable**: A `{{placeholder}}` in content that can be substituted
- **Store**: A collection of PromptG documents treated as a single namespace by a tool (for example, a `.promptg/` directory tree)

---

## 2. Core Concepts and Rationale (Informative)

PromptG defines three fundamental document kinds. Understanding their purpose and relationship is essential before working with the technical specifications.

### 2.1 Relationships

- **Prompts** are standalone, executable documents (atomic unit).
- **Templates** wrap **exactly one** complete Prompt document (1:1 relationship).
- **Packs** bundle multiple Prompts and/or Templates (1:N relationship).

### 2.2 Prompt (`kind: "prompt"`)

**What it is:** A Prompt is the atomic, executable unit in PromptG. It represents a single, self-contained, ready-to-use instruction for an AI model, containing the prompt text, optional variables, and metadata.

**Rationale:** The purpose of a Prompt is direct execution and portability. It is the primary artifact in PromptG, designed to be version-controlled and run consistently in both interactive and automated workflows.

**Example use case:** You craft a perfect code review prompt. You save it as a Prompt document so you can execute it consistently and share it with your team.

### 2.3 Template (`kind: "template"`)

**What it is:** A Template is a catalog or distribution envelope for a single, complete embedded Prompt document. It contains a full Prompt document under its `prompt` field. The Template itself has its own metadata for discovery and organization, which is entirely separate from the embedded Prompt.

**Rationale:** The separation between the Template (the container) and its embedded prompt (the prompt artifact) is intentional and foundational. A Template is not a "parent" from which a Prompt inherits properties. When a prompt is created from a template, the operation performs a deep copy of **only** the embedded `prompt` object. Everything at the template level - `name`, `displayName`, `description`, `tags`, `author`, and any template-level extension fields - is ignored for the created prompt artifact.

This design provides two benefits:

1. **Flexibility for authors:** Template-level metadata exists solely to describe the template itself for cataloging purposes (e.g., provenance, governance, organizational tagging). These attributes do not affect the prompt it produces.
2. **Confidence and control for users:** This model guarantees predictability. The prompt you create is an exact, literal replica of the embedded prompt object. There is no hidden inheritance, merging, or surprises. Whatever you want in the created prompt - its content, its variables, its metadata - MUST be defined within the embedded `prompt` object.

**Practical implication:** Template level is always ignored when creating a prompt from the template; only the embedded `prompt` document defines the created prompt.

**Example use case:** You publish a "PR Review Template" to a team catalog. The template's metadata describes it for discovery ("Official team review template, updated 2025"). The embedded prompt defines the exact prompt users will create when they instantiate it.

### 2.4 Pack (`kind: "pack"`)

**What it is:** A Pack is a versioned collection that bundles multiple Prompt and/or Template documents.

**Rationale:** Packs exist for sharing and reuse across machines, teams, and repositories. They allow you to distribute a curated collection of related prompts and templates as a single versioned artifact, simplifying installation and dependency management.

**Example use case:** You maintain a "Dev Essentials" collection with multiple templates and prompts. You package them as a Pack so others can install or update the entire collection as a single artifact.

**Summary (informative):** This model separates concerns across the prompt lifecycle: Packs support versioned distribution, Templates provide curated catalog entries that wrap a complete prompt artifact without modifying it, and Prompts are the atomic units executed by tools.

---

## 3. Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

Text labeled "Note (informative)" or sections labeled "(informative)" are non-normative and do not define requirements.

---

## 4. Document Model

### 4.1 Structure

A PromptG document MUST be a valid JSON object.

PromptG documents MUST be RFC 8259 JSON text encoded as UTF-8, and implementations MUST NOT add a UTF-8 byte order mark (BOM).

Note (informative): Implementations SHOULD detect and report BOM or non-UTF-8 encodings with a clear, actionable error message.

Every PromptG document MUST include:

- `kind` (string): Document type discriminator
- `schemaVersion` (string): Format version (MUST be `"1"` for this specification)

A PromptG document object MUST NOT include any fields other than those explicitly defined in this specification for the given `kind`, the optional `$schema` field (Section 4.2), and extension fields (Section 4.3).

Implementations MUST reject documents containing unrecognized fields that do not match the extension pattern.

Note (informative): This strict prohibition is enforced by the `"additionalProperties": false` directive in the JSON Schemas.

**Example:**

```json
{
  "kind": "prompt",
  "schemaVersion": "1",
  ...
}
```

### 4.2 Optional Schema Reference

Documents MAY include:

- `$schema` (string, URI): JSON Schema identifier for editor tooling

Tools MUST ignore `$schema` for core semantics.

**Example:**

```json
{
  "$schema": "https://promptg.io/schemas/v1/prompt.schema.json",
  "kind": "prompt",
  ...
}
```

### 4.3 Extension Mechanism

Documents MAY include extension fields matching the pattern `^x-[a-z0-9][a-z0-9-]*$`.

- Tools MUST ignore unknown `x-*` fields for core semantics
- Tools that read and write PromptG documents SHOULD preserve unknown `x-*` fields (round-trip preservation)
- The `x-promptg-*` namespace is RESERVED for PromptG-defined extensions

**Example:**

```json
{
  "kind": "prompt",
  "x-my-tool-metadata": { "customField": "value" },
  "x-promptg-time": { "createdAt": "2025-01-15T10:30:00Z" }
}
```

---

## 5. Variable Interpolation

### 5.1 Syntax

Content strings MAY include variable placeholders delimited by `{{` and `}}`.

**Pattern:** `/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g`

- Variable names MUST match: `[a-zA-Z0-9_-]+`
- Whitespace inside delimiters is OPTIONAL (e.g., `{{ var }}` is equivalent to `{{var}}`)
- Variable names are case-sensitive

**Example:**

```json
{
  "content": "Review {{language}} code for {{focus}} issues"
}
```

### 5.2 Substitution Behavior

When rendering content:

1. **Provided variables** are substituted with their values
2. **Missing variables** are left unchanged (e.g., `{{missing}}` remains as literal text)
3. Variable substitution is performed in a single pass (no recursive expansion)

**Example Rendering:**

```
Content:  "Review {{language}} code for {{focus}}"
Variables: { "language": "TypeScript" }
Result:   "Review TypeScript code for {{focus}}"
```

### 5.3 Escaped Placeholders (Literal `{{name}}`)

PromptG defines a minimal escape mechanism to emit literal placeholder text.

**Escape syntax (strict):**

- An escaped placeholder is exactly: `{{!name}}`
- `!` MUST immediately follow `{{` (so `{{ !name}}` is NOT an escape)
- `name` MUST match: `[a-zA-Z0-9_-]+`
- `name` MUST NOT contain whitespace
- No other characters or whitespace are permitted inside the escape token

**Rendering behavior:**

- Rendering MUST replace `{{!name}}` with the literal text `{{name}}`.
- Tools MUST perform at most one substitution pass; the output MUST NOT be re-scanned for placeholders.
- The literal produced by escaping MUST NOT be treated as a placeholder during the same render operation.

**Variable-driven behavior:**

- Escaped placeholders MUST be ignored as if they were plain text.
- Escaped placeholders MUST NOT be treated as variable occurrences for any variable-driven behavior, including:
  - variable extraction
  - missing-vars checks
  - variables list output
  - prompting (including via `x-promptg-interactive`)
  - defaults merging (defaults MUST NOT be consulted to satisfy `{{!name}}`)

**Non-matching `{{!` sequences:**

- Tools MUST treat any non-matching `{{!` sequence as ordinary text and MUST NOT error.
  - Examples: `{{!}}`, `{{! name}}`, `{{!name }}`, `{{!{{nested}}}}`, `{{! anything }}`, `{{!name` (unterminated)

**Example Rendering:**

```
Content:   "{{!a}} {{a}}"
Variables: { "a": "1" }
Result:    "{{a}} 1"
```

**Notes for implementers (informative):**

- In other double-curly template languages, `{{! ... }}` is commonly treated as a comment. In PromptG, `{{!name}}` is NOT a comment and MUST NOT be removed; it emits literal placeholder text.
- Because `!` is not permitted in PromptG variable names, `{{!name}}` cannot be confused with a normal placeholder; this spec reserves it to emit a literal `{{name}}`.

### 5.4 Defaults

Prompt documents MAY include a `defaults` object with default variable values:

```json
{
  "defaults": {
    "language": "JavaScript",
    "focus": "correctness"
  }
}
```

When rendering:

- Runtime variable values override defaults
- Variables not provided default to their `defaults` value (if specified)
- Missing variables with no default are left unchanged

Defaults keys MUST match the variable name pattern defined in Section 5.1 (`[a-zA-Z0-9_-]+`).

---

## 6. Prompt Format

### 6.1 Overview

A **Prompt** (`kind: "prompt"`) is a ready-to-use prompt instance.

### 6.2 Required Fields

| Field           | Type                | Description                      |
| --------------- | ------------------- | -------------------------------- |
| `kind`          | string              | MUST be `"prompt"`               |
| `schemaVersion` | string              | MUST be `"1"`                    |
| `name`          | string (kebab-case) | Machine identifier for CLI/tools |
| `content`       | string              | The prompt text                  |

The `content` field MUST be a non-empty string.

**Example (Minimal):**

```json
{
  "kind": "prompt",
  "schemaVersion": "1",
  "name": "code-review",
  "content": "Review this code for correctness and security."
}
```

### 6.3 Optional Fields

| Field         | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `displayName` | string | Human-readable name for UIs                  |
| `description` | string | Brief description (max 1000 chars)           |
| `defaults`    | object | Default variable values (string->string map) |
| `tags`        | array  | Kebab-case tags for categorization           |
| `author`      | string | Author/maintainer                            |

**Example (With Optional Fields):**

```json
{
  "kind": "prompt",
  "schemaVersion": "1",
  "name": "code-review",
  "displayName": "Code Review",
  "description": "Review code for correctness, security, and maintainability",
  "content": "Review {{language}} code for {{focus}} issues",
  "defaults": {
    "language": "JavaScript",
    "focus": "correctness"
  },
  "tags": ["review", "code-quality"],
  "author": "promptg-team"
}
```

### 6.4 Name Requirements

The `name` field:

- MUST be kebab-case (lowercase, hyphens only): `^[a-z0-9]+(-[a-z0-9]+)*$`
- MUST be unique among Prompt documents within a store
- SHOULD be descriptive and concise (max 100 chars)

### 6.5 Standard Extensions

Prompts MAY include the following PromptG-defined extensions (see Section 9):

- `x-promptg-interactive`: Interactive prompting metadata
- `x-promptg-time`: Timestamp metadata

---

## 7. Template Format

### 7.1 Overview

A **Template** (`kind: "template"`) is a reusable blueprint for creating prompts. A Template includes template metadata for discovery/selection, and an embedded Prompt document payload under `prompt`.

See Section 2 for the conceptual model and design rationale.

### 7.2 Required Fields

| Field           | Type                | Description                      |
| --------------- | ------------------- | -------------------------------- |
| `kind`          | string              | MUST be `"template"`             |
| `schemaVersion` | string              | MUST be `"1"`                    |
| `name`          | string (kebab-case) | Machine identifier               |
| `displayName`   | string              | Human-readable name              |
| `description`   | string              | Brief description (1-1000 chars) |
| `prompt`        | object              | Embedded Prompt document payload |

**Example (Minimal):**

```json
{
  "kind": "template",
  "schemaVersion": "1",
  "name": "pr-review",
  "displayName": "PR Review",
  "description": "Review a pull request diff for correctness and security",
  "prompt": {
    "kind": "prompt",
    "schemaVersion": "1",
    "name": "pr-review",
    "content": "Review this {{language}} PR for {{focus}}: {{diff}}"
  }
}
```

### 7.3 Optional Fields

Templates MAY include the following optional fields:

- `tags`
- `author`

Templates MAY also include extension fields matching the pattern `^x-[a-z0-9][a-z0-9-]*$`.

### 7.4 Template Structure (Wrapper vs Embedded Prompt)

| Aspect                     | Template Wrapper (root level)                | Embedded Prompt (`prompt` field)                       |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Purpose**                | Catalog metadata for discovery/selection     | Complete prompt artifact that will be created/executed |
| **Metadata requirements**  | `displayName` and `description` are required | `displayName` and `description` are optional           |
| **Instantiation behavior** | Ignored during prompt creation               | Deep-copied to produce the output prompt               |

---

### 7.5 Create Prompt From Template

This operation defines the pure, semantic process for producing a Prompt document from the embedded prompt payload inside a Template document.

#### Input

- A Template document that conforms to the Template schema.
- The Template document MUST contain a `prompt` field. The value of this field MUST be a complete Prompt document that conforms to the Prompt schema.
- The `schemaVersion` value of the embedded Prompt document MUST be identical to the top-level `schemaVersion` of the parent Template document. Tools MUST reject the Template document if these values differ.

#### Output

- A Prompt document.

#### Semantics (normative)

1. A new Prompt document is produced by making a deep copy of the `template.prompt` object.
2. All other fields on the parent Template document (i.e., fields outside of the `template.prompt` object) MUST NOT affect the output Prompt document.

#### Notes (informative)

- This specification defines only the Prompt document produced by this operation. Any post-instantiation operations (including modification, persistence, and collision handling) are implementation-defined and out of scope.

### 7.6 Name Requirements

The `name` field:

- MUST be kebab-case (lowercase, hyphens only): `^[a-z0-9]+(-[a-z0-9]+)*$`
- MUST be unique among Template documents within a store
- SHOULD be descriptive and concise (max 100 chars)

## 8. Pack Format

### 8.1 Overview

A **Pack** (`kind: "pack"`) bundles multiple prompts and/or templates for distribution.

Note (informative): The `name` and `version` fields identify the pack. This specification does not define a mechanism for locating, fetching, or resolving packs by `name` and `version`; this is out of scope for v1.

### 8.2 Required Fields

| Field           | Type                | Description      |
| --------------- | ------------------- | ---------------- |
| `kind`          | string              | MUST be `"pack"` |
| `schemaVersion` | string              | MUST be `"1"`    |
| `name`          | string (kebab-case) | Pack identifier  |
| `version`       | string (semver)     | Semantic version |

Additionally, a pack MUST include at least one embedded Prompt or Template document: it MUST contain a non-empty `prompts` array or a non-empty `templates` array (or both).

- `prompts` (array): Embedded Prompt documents
- `templates` (array): Embedded Template documents

The `schemaVersion` value of every embedded Prompt document in `prompts` and every embedded Template document in `templates` MUST be identical to the top-level `schemaVersion` of the parent Pack document. Tools MUST reject the Pack document if any embedded document's `schemaVersion` differs.

**Example:**

```json
{
  "kind": "pack",
  "schemaVersion": "1",
  "name": "dev-essentials",
  "version": "1.0.0",
  "displayName": "Dev Essentials",
  "description": "Essential prompts for daily development",
  "author": "promptg-team",
  "templates": [
    {
      "kind": "template",
      "schemaVersion": "1",
      "name": "code-review",
      ...
    }
  ]
}
```

### 8.3 Optional Fields

| Field         | Type         | Description              |
| ------------- | ------------ | ------------------------ |
| `displayName` | string       | Human-readable pack name |
| `description` | string       | Pack description         |
| `homepage`    | string (URI) | Homepage URL             |
| `author`      | string       | Pack maintainer          |
| `tags`        | array        | Categorization tags      |

### 8.4 Semantic Versioning

The `version` field MUST follow [Semantic Versioning 2.0.0](https://semver.org/):

- Format: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`)
- Pre-release: `1.0.0-alpha.1`
- Build metadata: `1.0.0+20250101`

### 8.5 Name Requirements

The `name` field:

- MUST be kebab-case (lowercase, hyphens only): `^[a-z0-9]+(-[a-z0-9]+)*$`
- MUST be unique among Pack documents within a store
- SHOULD be descriptive and concise (max 100 chars)

Note (informative): In the v1 file store layout (Section 13), packs are stored as `packs/promptg-pack-{name}.json`. Because the filename does not include `version`, a store can contain at most one Pack document for a given `name` at a time.

---

## 9. Standard Extensions

The following `x-promptg-*` extensions are STABLE as of v1.0.

**Reserved namespace:** The `x-promptg-*` prefix is reserved for PromptG-defined standard extensions. Third-party tools MUST use their own `x-<vendor>-*` prefix for custom fields. Tools that read and write PromptG documents SHOULD preserve unknown `x-*` fields (round-trip preservation).

### 9.1 `x-promptg-interactive`

**Purpose:** Interactive prompting metadata for CLIs/UIs

**Type:** Object mapping variable names to interactive configs

- Keys MUST match the variable name pattern in Section 5.1 (`[a-zA-Z0-9_-]+`).

**Schema:**

```json
{
  "x-promptg-interactive": {
    "variableName": {
      "question": "What language?", // Required
      "help": "Programming language", // Optional
      "required": true // Optional (default: false)
    }
  }
}
```

**Usage:** Tools can prompt users interactively for these variables.

### 9.2 `x-promptg-time`

**Purpose:** Audit metadata (non-functional)

**Applicability:** This extension MAY appear on any PromptG document kind (`prompt`, `template`, `pack`). If present, it describes the document object on which it appears.

**Schema:**

```json
{
  "x-promptg-time": {
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Format:**

- `createdAt` MUST be an RFC 3339 date-time string.
- Tools SHOULD write timestamps in UTC using `Z` notation.
- Fractional seconds MAY be present.

**Note:** Tools MAY omit or ignore time metadata. It does not affect prompt execution.

---

## 10. Versioning and Compatibility

### 10.1 Schema Version

The `schemaVersion` field indicates format compatibility:

- v1.0 documents MUST have `schemaVersion: "1"`
- Tools MUST reject documents with unsupported `schemaVersion` values

### 10.2 Compatibility Rules

**Non-breaking changes:**

- Adding OPTIONAL fields
- Adding values to extension objects
- Documentation clarifications

**Breaking changes:**

- Removing REQUIRED fields
- Changing field semantics
- Changing validation rules (e.g., tightening patterns)
- Requiring new REQUIRED fields

### 10.3 Future Versions

When PromptG v2.0 is released:

- `schemaVersion` will change to `"2"`
- v1.0 documents remain valid as v1.0
- Tools MAY support multiple versions simultaneously

---

## 11. Security Considerations

### 11.1 Content Is Plain Text (and Untrusted Input)

PromptG defines `content` as plain text. Tools that parse or render PromptG documents MUST treat `content` and substituted variable values as untrusted input.

PromptG defines no directive/command language and no code execution semantics. Implementations SHOULD NOT execute rendered content as code.

Implementations MUST NOT evaluate variable values as code as part of PromptG rendering (text substitution only; see Section 5).

### 11.2 Variable Injection

When substituting variables from user input:

- Validate variable values and apply context-appropriate escaping/encoding for the sink (shell, SQL, HTML, Markdown, etc.)
- Prefer allowlists over blocklists where feasible

**Mitigations (examples):**

- Avoid `eval` and string-concatenated shell commands; prefer passing rendered prompts via stdin or files.
- If you must invoke a command, use argument arrays/APIs that bypass shell parsing and apply strict allowlists for any user-controlled values.

**Example Risk:**

```json
{
  "content": "Run command: {{command}}"
}
```

If `command` comes from user input, this could enable command injection.

### 11.3 File Path Validation

When mapping `name` fields to filesystem paths:

- Validate against path traversal (`../`, etc.)
- Enforce naming rules (kebab-case pattern)
- Use safe path joining APIs

See Section 13 for the standardized `.promptg/` file store layout.

### 11.4 Remote Pack Installation

When installing packs from URLs:

- Implementations SHOULD verify HTTPS and certificate validity
- Implementations SHOULD enforce size limits (prevent DoS via large files)
- Implementations SHOULD validate JSON Schema before processing
- Implementations SHOULD warn users about untrusted sources

### 11.5 Secrets in Defaults

Implementations SHOULD NOT store secrets in `defaults`:

- Defaults are meant to be shared and version-controlled
- Use runtime variable injection for sensitive values
- Consider environment variables or secure vaults

---

## 12. Implementation Limits

### 12.1 Schema-Enforced Limits

The JSON Schemas define hard limits on metadata fields. PromptG documents MUST conform to these limits:

- **name**: 100 characters maximum
- **displayName**: 200 characters maximum
- **description**: 1000 characters maximum
- **author**: 200 characters maximum
- **tags**: 50 tags maximum; individual tags limited to 50 characters
- **x-promptg-interactive.question**: 500 characters maximum
- **x-promptg-interactive.help**: 2000 characters maximum

### 12.2 Content and Default Value Limits

Implementations MAY impose size limits on the **content** field (prompt text) and **defaults** field values.

**Recommended behavior:**

- Implementations SHOULD warn users when content exceeds 100,000 characters (~100KB)
- Implementations MAY reject content above implementation-specific thresholds
- Implementations that accept content larger than 100KB MUST handle it safely through appropriate mechanisms such as:
  - Streaming or chunked processing
  - Memory limits and resource controls
  - Request timeouts
  - Safe parsing (protection against ReDoS, stack overflow, etc.)

### 12.3 Rationale

Hard schema limits on metadata fields prevent abuse and ensure consistent tooling behavior across implementations. Soft guidance on content fields avoids arbitrarily constraining legitimate use cases (such as large system prompts or code diffs) while encouraging implementations to establish safe operational boundaries appropriate to their environment.

---

## 13. File Store Layout

This section defines a standardized file layout for PromptG documents stored on disk under a `.promptg/` directory.

If a tool reads or writes PromptG documents as files under a `.promptg/` directory, it MUST follow this layout.

### 13.1 Directory Structure

Under a `.promptg/` root directory:

- Prompts MUST be stored under `prompts/`
- Templates MUST be stored under `templates/`
- Packs MUST be stored under `packs/`

### 13.2 File Naming

Tools MUST use the following filename patterns under the `.promptg/` root:

- Prompts: `prompts/promptg-prompt-{name}.json`
- Templates: `templates/promptg-template-{name}.json`
- Packs: `packs/promptg-pack-{name}.json`

`{name}` MUST exactly match the document's `name` field.

Tools MUST ignore unknown files and directories under `.promptg/`.

### 13.3 Common Roots (Informative)

Common places a `.promptg/` directory may appear include:

- A project store directory: `<repo>/.promptg/`
- A user store directory: `$HOME/.promptg/` (Windows: `%USERPROFILE%\.promptg\`)

---

## 14. References

### 14.1 Normative References

- **RFC 2119**: Key words for use in RFCs to Indicate Requirement Levels
  https://www.rfc-editor.org/rfc/rfc2119

- **RFC 8259**: The JavaScript Object Notation (JSON) Data Interchange Format
  https://www.rfc-editor.org/rfc/rfc8259

- **RFC 3339**: Date and Time on the Internet: Timestamps
  https://www.rfc-editor.org/rfc/rfc3339

- **JSON Schema**: JSON Schema Draft 2020-12
  https://json-schema.org/draft/2020-12/json-schema-core.html

- **JSON Schema Validation**: JSON Schema Draft 2020-12 Validation
  https://json-schema.org/draft/2020-12/json-schema-validation.html

- **Semantic Versioning 2.0.0**
  https://semver.org/

### 14.2 Informative References

- **PromptG JSON Schemas**
  https://promptg.io/schemas/v1/

- **PromptG Implementation Guide**
  See `docs/guide.md` in this repository

---

## Appendix A: Complete Examples

### A.1 Minimal Prompt

```json
{
  "kind": "prompt",
  "schemaVersion": "1",
  "name": "hello",
  "content": "Hello, world!"
}
```

### A.2 Full-Featured Prompt

```json
{
  "$schema": "https://promptg.io/schemas/v1/prompt.schema.json",
  "kind": "prompt",
  "schemaVersion": "1",
  "name": "code-review",
  "displayName": "Code Review",
  "description": "Review code for correctness, security, and maintainability",
  "content": "Review this {{language}} code for {{focus}} issues:\n\n{{code}}",
  "defaults": {
    "language": "TypeScript",
    "focus": "security"
  },
  "tags": ["review", "security", "code-quality"],
  "author": "promptg-team",
  "x-promptg-interactive": {
    "code": {
      "question": "Paste the code to review",
      "required": true
    }
  },
  "x-promptg-time": {
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### A.3 Template with Time

```json
{
  "$schema": "https://promptg.io/schemas/v1/template.schema.json",
  "kind": "template",
  "schemaVersion": "1",
  "name": "team-bug-fix-template",
  "displayName": "Bug Fix Planning Template",
  "description": "Official team template for creating structured bug fix plans. Maintained by platform team.",
  "tags": ["official", "debugging", "team-standard"],
  "author": "platform-team",
  "prompt": {
    "$schema": "https://promptg.io/schemas/v1/prompt.schema.json",
    "kind": "prompt",
    "schemaVersion": "1",
    "name": "bug-fix-plan",
    "displayName": "Bug Fix Plan",
    "description": "Turn a bug report into investigation steps and a fix plan",
    "content": "Create a fix plan for this bug:\n\nSymptoms: {{symptoms}}\nLanguage: {{language}}",
    "defaults": {
      "language": "Unspecified"
    },
    "tags": ["debugging", "planning"],
    "author": "promptg-team",
    "x-promptg-time": {
      "createdAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

**Note (informative):** This example demonstrates the separation between template and prompt metadata. The template wrapper uses organizational tags and attribution for cataloging, while the embedded prompt has its own independent name, tags, and metadata. When instantiated, only the embedded prompt is copied.

**Note (informative):** In this example, the template's `name` (`team-bug-fix-template`) differs from the embedded prompt's `name` (`bug-fix-plan`); this is allowed because instantiation deep-copies only the embedded prompt, and all template-level fields (including `name`) are ignored for the created prompt artifact.

### A.4 Pack Bundle

```json
{
  "$schema": "https://promptg.io/schemas/v1/pack.schema.json",
  "kind": "pack",
  "schemaVersion": "1",
  "name": "starter-kit",
  "version": "1.0.0",
  "displayName": "Starter Kit",
  "description": "Essential prompts and templates for getting started",
  "author": "promptg-team",
  "tags": ["starter", "essentials"],
  "templates": [
    {
      "kind": "template",
      "schemaVersion": "1",
      "name": "code-review",
      "displayName": "Code Review",
      "description": "Review code for issues",
      "prompt": {
        "kind": "prompt",
        "schemaVersion": "1",
        "name": "code-review",
        "content": "Review {{code}}"
      }
    }
  ],
  "prompts": [
    {
      "kind": "prompt",
      "schemaVersion": "1",
      "name": "hello",
      "content": "Hello, world!"
    }
  ]
}
```

---

## Appendix B: Change History

### Version 1.0.0 (2026-01-12)

Initial release

---

**End of Specification**
