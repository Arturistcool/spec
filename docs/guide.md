# PromptG Implementation Guide

This guide helps you implement PromptG format support in your tool, editor, or service.

## Quick Start

Reading a prompt is simple - it's just JSON:

```javascript
import { readFileSync } from 'fs';

const prompt = JSON.parse(readFileSync('my-prompt.json', 'utf-8'));
console.log(prompt.content); // "Review {{language}} code"
```

That's it. You don't need a special library.

## Integration Levels

### Level 1: Read-Only

Your tool reads `.promptg/` files to enhance functionality.

**Implementation:**

1. Detect `.promptg/` folder (walk up directories if needed)
2. Parse JSON files under `.promptg/` following the standard layout and filenames:
   - Prompts: `prompts/promptg-prompt-<name>.json`
   - Templates: `templates/promptg-template-<name>.json`
   - Packs: `packs/promptg-pack-<name>.json`
3. Display or use prompts

**Use cases:**

- IDE showing available prompts
- CI tool running prompts
- LLM wrapper loading project prompts

### Level 2: Variable Substitution

Your tool renders prompts with variables.

**Implementation:**

```javascript
function substituteVariables(content, vars) {
  // 1) Protect escaped placeholders: {{!name}} -> sentinel
  const escaped = [];
  const protectedContent = content.replace(/\{\{!([a-zA-Z0-9_-]+)\}\}/g, (_, name) => {
    const idx = escaped.push(name) - 1;
    return `\u0000PROMPTG_ESC_${idx}\u0000`;
  });

  // 2) Substitute normal placeholders (single-pass; missing vars left unchanged)
  const substituted = protectedContent.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return match;
    const value = vars[key];
    if (value === null || value === undefined) return match;
    return String(value);
  });

  // 3) Restore escaped placeholders as literal {{name}} text (not substituted in this render)
  return substituted.replace(/\u0000PROMPTG_ESC_(\d+)\u0000/g, (_, rawIdx) => {
    const name = escaped[Number(rawIdx)];
    return typeof name === 'string' ? `{{${name}}}` : '';
  });
}

// Usage
const rendered = substituteVariables(prompt.content, { language: 'TypeScript', focus: 'security' });
```

**Behavior:**

- Missing variables are left unchanged (e.g., `{{missing}}` stays as-is)
- Single-pass replacement (no recursive substitution)
- Whitespace in delimiters is optional: `{{ var }}` works
- Escaped placeholders: `{{!name}}` renders as literal `{{name}}` and is ignored as a variable occurrence (it does not affect extraction, missing-vars checks, prompting, or defaults merging).

**Example:**

```
Content:   "{{!a}} {{a}}"
Vars:      { "a": "1" }
Result:    "{{a}} 1"
```

### Level 3: Full Write Support

Your tool can create/edit PromptG files.

**Implementation:**

1. Generate valid JSON (validate against schema)
2. Enforce kebab-case for `name`
3. Write to correct location (`.promptg/prompts/promptg-prompt-{name}.json`)
4. Handle conflicts gracefully
5. Write UTF-8 JSON without BOM

## Core Patterns

### Variable Extraction

```javascript
function extractVariables(content) {
  const regex = /\{\{\s*(?!\!)([a-zA-Z0-9_-]+)\s*\}\}/g;
  const matches = content.matchAll(regex);
  return [...new Set([...matches].map((m) => m[1]))];
}

// Usage
const vars = extractVariables('Review {{language}} code for {{focus}}');
// Returns: ["language", "focus"]
```

### Merging Defaults

```javascript
function renderWithDefaults(prompt, runtimeVars) {
  const allVars = { ...prompt.defaults, ...runtimeVars };
  return substituteVariables(prompt.content, allVars);
}

// Usage
const result = renderWithDefaults(
  { content: '{{lang}} {{focus}}', defaults: { lang: 'Go', focus: 'security' } },
  { focus: 'performance' } // Override default
);
// Result: "Go performance"
```

### Store Discovery

Walk up directories to find `.promptg/`:

```javascript
import { existsSync } from 'fs';
import { join, dirname, resolve, parse } from 'path';

function findPromptGDir(startPath = process.cwd()) {
  let current = resolve(startPath);
  const root = parse(current).root;

  while (true) {
    const promptgPath = join(current, '.promptg');
    if (existsSync(promptgPath)) {
      return promptgPath;
    }
    if (current === root) break;
    current = dirname(current);
  }

  return null; // Not found
}
```

## Validation

### Using JSON Schema

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// Load schema
const schema = await fetch('https://promptg.io/schemas/v1/prompt.schema.json').then((r) =>
  r.json()
);

const validate = ajv.compile(schema);

// Validate document
if (!validate(promptData)) {
  console.error('Validation errors:', validate.errors);
}
```

### Common Validation Issues

1. **Non-kebab-case names** - Validate with regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
2. **Missing required fields** - Check against schema
3. **Invalid variable syntax** - Only `[a-zA-Z0-9_-]` allowed in variable names

## Extension Fields

### Reading Extensions

```javascript
// Standard extensions (stable in v1.0)
const interactive = prompt['x-promptg-interactive'];
const time = prompt['x-promptg-time'];

// Custom extensions
const myMetadata = prompt['x-my-tool-data'];
```

### Writing Extensions

```javascript
const prompt = {
  kind: 'prompt',
  schemaVersion: '1',
  // ... required fields

  // Your custom extension
  'x-my-tool-metadata': {
    lastEditedBy: 'user@example.com',
    customField: 'value',
  },
};
```

### Round-Trip Preservation

If your tool reads and writes PromptG documents, **preserve unknown `x-*` fields**:

```javascript
function updatePrompt(original, updates) {
  return {
    ...original, // Preserve all fields
    ...updates, // Apply updates
    // Unknown x-* fields are preserved automatically
  };
}
```

## Security Considerations

### Variable Injection

Never execute user-provided variable values as code:

```javascript
// UNSAFE - Don't do this
eval(`print("${vars.code}")`); // Command injection!

// SAFE - Treat as plain text
console.log(vars.code);
```

### File Path Validation

When mapping names to file paths:

```javascript
function safePromptPath(name) {
  // Validate kebab-case pattern
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    throw new Error('Invalid prompt name');
  }

  // Use safe path joining (prevents traversal)
  return join(PROMPTG_DIR, 'prompts', `promptg-prompt-${name}.json`);
}
```

### Remote Packs

When installing packs from URLs:

```javascript
async function installPack(url) {
  // 1. Verify HTTPS
  if (!url.startsWith('https://')) {
    throw new Error('Pack URL must use HTTPS');
  }

  // 2. Size limit
  const response = await fetch(url);
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10_000_000) {
    throw new Error('Pack too large (>10MB)');
  }

  // 3. Validate JSON Schema
  const pack = await response.json();
  if (!validatePackSchema(pack)) {
    throw new Error('Invalid pack format');
  }

  // 4. Install
  installPackData(pack);
}
```

## File Naming Conventions

PromptG standardizes the `.promptg/` file store layout. Tools that read or write PromptG documents as files under `.promptg/` MUST follow these conventions (see [File Store Layout](../spec/promptg-spec.md#13-file-store-layout)).

```
.promptg/
|---- prompts/
|   `---- promptg-prompt-{name}.json
|---- templates/
|   `---- promptg-template-{name}.json
`---- packs/
    `---- promptg-pack-{name}.json
```

Where `{name}` matches the document's `name` field.

## Template vs Prompt Patterns

### When to Use Templates

Create a **template** when you want a reference blueprint for creating variations - executed repeatedly with different variables across projects.

Templates require `displayName` and `description` for catalog presentation.

**Example:**

```bash
# Template with required metadata (using recommended layout above)
echo '{
  "kind": "template",
  "schemaVersion": "1",
  "name": "pr-review",
  "displayName": "PR Review",
  "description": "Review pull request for correctness and security",
  "prompt": {
    "kind": "prompt",
    "schemaVersion": "1",
    "name": "pr-review",
    "content": "Review this PR:\n\n{{diff}}"
  }
}' > .promptg/templates/promptg-template-pr-review.json
```

### When to Use Prompts

Create a **prompt** when you want a ready-to-run instance with project-specific defaults - no metadata required for low-friction creation.

**Example:**

```bash
# Save prompt from stdin (no displayName/description required)
echo "Review this code for bugs and security issues" | promptg prompt save code-review

# Execute prompt directly
promptg get code-review | llm
```

### UI/Workflow Separation Benefit

The template/prompt distinction enables tools to provide separate interfaces:

| View Type               | Document Type | Characteristics                                                    |
| ----------------------- | ------------- | ------------------------------------------------------------------ |
| **Catalog/Library**     | Templates     | Browse reusable blueprints; rich metadata aids discovery           |
| **Runnable Collection** | Prompts       | Execute project-specific instances; minimal metadata reduces noise |

This separation prevents UI pollution: users browsing a catalog don't see every project-specific prompt, and users executing prompts don't need catalog metadata.

Note: tools MAY present prompts in browsable views, but optional metadata allows implementations to optimize for execution workflows.

### Executing Templates

Templates are executed directly - they don't automatically create prompts. When rendering a template, tools render its embedded prompt payload (`template.prompt`):

```bash
# 1. Browse available templates
promptg template list
```

```bash
# 2. Execute template directly (renders to stdout)
promptg template get pr-review --var diff@changes.txt | llm
```

```bash
# 3. Optionally save as a prompt for repeated use
printf "Review this PR:\n\n{{diff}}" | promptg prompt save my-pr-review
```

```bash
# 4. Execute the saved prompt
promptg get my-pr-review --var diff@changes.txt | llm
```

## Examples

### Minimal Prompt Reader

This example reuses the `substituteVariables()` function from Level 2.

```javascript
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

class PromptGReader {
  constructor(promptgDir) {
    this.dir = promptgDir;
  }

  listPrompts() {
    const promptsDir = join(this.dir, 'prompts');
    return readdirSync(promptsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const data = JSON.parse(readFileSync(join(promptsDir, f), 'utf-8'));
        return { name: data.name, displayName: data.displayName };
      });
  }

  getPrompt(name) {
    const path = join(this.dir, 'prompts', `promptg-prompt-${name}.json`);
    return JSON.parse(readFileSync(path, 'utf-8'));
  }

  render(name, vars = {}) {
    const prompt = this.getPrompt(name);
    const allVars = { ...prompt.defaults, ...vars };
    return substituteVariables(prompt.content, allVars);
  }
}

// Usage
const reader = new PromptGReader('.promptg');
console.log(reader.render('code-review', { language: 'Rust' }));
```

### VSCode Extension Pattern

```javascript
import * as vscode from 'vscode';

export function activate(context) {
  const disposable = vscode.commands.registerCommand('promptg.insertPrompt', async () => {
    const promptgDir = findPromptGDir(vscode.workspace.rootPath);
    if (!promptgDir) {
      vscode.window.showErrorMessage('No .promptg/ folder found');
      return;
    }

    const reader = new PromptGReader(promptgDir);
    const prompts = reader.listPrompts();

    const selected = await vscode.window.showQuickPick(
      prompts.map((p) => ({ label: p.displayName || p.name, value: p.name }))
    );

    if (selected) {
      const content = reader.render(selected.value);
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.edit((edit) => {
          edit.insert(editor.selection.active, content);
        });
      }
    }
  });

  context.subscriptions.push(disposable);
}
```

### GitHub Actions Pattern

Use PromptG documents directly in CI without installing any PromptG tooling.

```yaml
# .github/workflows/promptg-review.yml
name: AI Code Review

on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load PromptG prompt content
        id: prompt
        run: |
          PROMPT=$(jq -r '.content' .promptg/prompts/promptg-prompt-code-review.json)
          echo "content<<EOF" >> "$GITHUB_OUTPUT"
          echo "$PROMPT" >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"

      - name: Run review
        run: |
          echo "${{ steps.prompt.outputs.content }}" | llm-cli > review.txt
```

### CI/CD Script Pattern

```bash
#!/bin/bash
# scripts/ai-review.sh

set -euo pipefail

PROMPT_FILE=".promptg/prompts/promptg-prompt-code-review.json"
PROMPT_CONTENT="$(jq -r '.content' "$PROMPT_FILE")"

CHANGED_FILES="$(git diff --name-only origin/main...HEAD)"

# Simple bash substitution example (implementation-defined; does not handle escaping)
PROMPT_CONTENT="${PROMPT_CONTENT//\{\{files\}\}/$CHANGED_FILES}"

echo "$PROMPT_CONTENT" | llm-cli
```

## Best Practices

### 1. Graceful Degradation

```javascript
function getPrompt(name) {
  try {
    return loadPromptFromFile(name);
  } catch (error) {
    // Fall back to defaults if .promptg/ doesn't exist
    return DEFAULT_PROMPTS[name] || DEFAULT_PROMPT;
  }
}
```

### 2. Caching

```javascript
const promptCache = new Map();

function getCachedPrompt(name) {
  if (!promptCache.has(name)) {
    promptCache.set(name, loadPromptFromFile(name));
  }
  return promptCache.get(name);
}

// Clear cache on file changes
watcher.on('change', () => promptCache.clear());
```

### 3. Error Messages

Provide helpful error messages:

```javascript
try {
  const prompt = getPrompt('code-review');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`Prompt "code-review" not found.`);
    console.error(`Available prompts: ${listPrompts().join(', ')}`);
  } else {
    throw error;
  }
}
```

## Testing Your Implementation

### Test Cases

1. **Valid documents** - Load and parse successfully
2. **Invalid JSON** - Handle gracefully
3. **Invalid schema** - Reject with clear error
4. **Missing variables** - Leave unchanged
5. **Variables with defaults** - Merge correctly
6. **Nested .promptg/** - Walk up directories
7. **Empty .promptg/** - Don't crash
8. **Unknown extensions** - Preserve on round-trip

### Conformance Testing

Run your implementation against the official test suite:

```bash
git clone https://github.com/promptg/spec.git
cd spec
cd conformance

# Test valid documents (should all pass)
for file in valid/**/*.json; do
  your-tool validate "$file" || echo "FAIL: $file"
done

# Test invalid documents (should all fail)
for file in invalid/**/*.json; do
  your-tool validate "$file" && echo "UNEXPECTED PASS: $file"
done
```

## Publishing Your Implementation

Once you've implemented PromptG support:

1. Add a badge to your README to signal compatibility:

   ```markdown
   [![PromptG Compatible](https://img.shields.io/badge/PromptG-compatible-blue)](https://promptg.io)
   ```

2. Add your project to our ecosystem list by submitting a PR to **[ECOSYSTEM.md](../ECOSYSTEM.md)**. This helps others discover your tool.

3. Announce your new tool to the community in [GitHub Discussions](https://github.com/promptg/spec/discussions).

## Support

- **Spec**: https://github.com/promptg/spec
- **Issues**: https://github.com/promptg/spec/issues
- **Discussions**: https://github.com/promptg/spec/discussions
- **Reference Implementation**: https://github.com/promptg/cli

---

Happy implementing!
