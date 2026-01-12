# PromptG Examples

This directory contains human-friendly, real-world examples of PromptG documents.

Note: The spec's store layout and filename rules apply to PromptG stores under `.promptg/` (e.g., `.promptg/prompts/promptg-prompt-{name}.json`). Files under `examples/` are illustrative and are not named according to the store layout rules (but should still validate against the schemas).

## Purpose

- **Learn** - See how PromptG is used in practice
- **Inspire** - Get ideas for your own prompts
- **Reference** - Copy and adapt for your use case

These examples demonstrate best practices and common patterns.

## Structure

```
examples/
|---- prompts/     # Ready-to-use prompt instances
|---- templates/   # Reusable blueprints
`---- packs/       # Bundled collections
```

## Examples

### Prompts

- **code-review.json** - Review code for quality and security
- **escaped-placeholder.json** - Demonstrates escaping `{{!name}}` to output literal `{{name}}`
- **release-notes.json** - Generate release notes from changelog

### Templates

- **pr-review.json** - Review pull request diffs
- **test-plan.json** - Create risk-based test plans

### Packs

- **starter-kit.json** - Basic prompts and templates for getting started

## Using Examples

### Copy and Customize

```bash
# Copy an example to your project
cp examples/prompts/code-review.json .promptg/prompts/

# Edit to fit your needs
vim .promptg/prompts/code-review.json
```

### Learn Variable Patterns

Examples show common variable conventions:

- `{{code}}` / `{{diff}}` - Primary artifact
- `{{language}}` - Programming language
- `{{goal}}` / `{{focus}}` - Objective
- `{{context}}` - Additional information
- `{{constraints}}` - Scope narrowing
- `{{!name}}` - Output a literal placeholder (renders `{{name}}`)

### Interactive Metadata

Templates often include `x-promptg-interactive` inside their embedded prompt payload for CLI/UI prompting:

```json
{
  "prompt": {
    "x-promptg-interactive": {
      "code": {
        "question": "Paste the code to review",
        "help": "The code you want reviewed",
        "required": true
      }
    }
  }
}
```

## Difference from Conformance Tests

- **Examples** (here) - Real-world, practical, meant for humans
- **Conformance tests** (`../conformance/`) - Edge cases, meant for validators

Use examples to learn and get started. Use conformance tests to validate implementations.

## Contributing Examples

Have a great prompt or template? Contribute it!

1. Ensure it's useful and well-documented
2. Add clear descriptions
3. Use meaningful variable names
4. Submit a PR

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.
