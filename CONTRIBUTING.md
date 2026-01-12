# Contributing

Thank you for your interest in contributing to the PromptG specification!

## Ways to Contribute

- Report issues or suggest improvements
- Fix typos or improve documentation
- Add conformance tests or examples
- Propose spec enhancements (problem-driven, with real use cases)

We prioritize clarity, interoperability, and backwards compatibility over adding features.

## Process

### Editorial Changes

**Typos, clarifications, examples, documentation improvements:**

1. Fork and make your change
2. Commit with sign-off: `git commit -s -m "Fix: typo in schema"`
3. Open a PR

These receive fast-track review (no formal process needed).

### Substantive Changes

**New fields, breaking changes, spec modifications that affect interpretation:**

1. **Open an issue** with:
   - Problem statement
   - Proposed solution
   - Use cases
   - Backwards compatibility impact
2. **Allow 7 days** for community feedback
3. **If approved by maintainers**, submit PR with:
   - Updated spec text
   - Schema modifications
   - New conformance tests
   - Updated examples

Changes affecting backwards compatibility require strong justification. If a proposal would break existing PromptG documents, it typically requires a new schema/spec version rather than a silent change.

## Guidelines

- **Backwards compatibility is critical** - breaking changes need compelling rationale
- **Spec clarity over features** - simplicity is a feature
- **One thing per PR** - keep changes focused
- **Update conformance tests** when changing schemas
- **Match existing terminology** and style

### Line endings

This repo enforces LF line endings via `.gitattributes`. On Windows, prefer `git config core.autocrlf false` (or `input`) to avoid noisy CRLF-only diffs.

## Where changes go

- **Normative spec:** `spec/promptg-spec.md`
- **Informative guide/docs:** `docs/`
- **Schemas:** `schemas/v1/`
- **Examples:** `examples/`
- **Conformance tests:** `conformance/valid/` and `conformance/invalid/`

## Local validation (recommended)

Run the same checks as CI before opening a PR:

```bash
npm ci
npm run check
```

### Formatting

This repo uses Prettier for consistent formatting. Before committing:

```bash
npm run format
```

CI will check formatting. If it fails, run the command above and re-commit.

## Sign-off

`git commit -s` means you wrote the code and have the right to contribute it.

DCO sign-off is required for PRs and is enforced by CI.

See [DCO](DCO) for details.
