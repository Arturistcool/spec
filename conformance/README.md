# PromptG Conformance Tests

This directory contains test cases for validating PromptG implementations.

## Structure

```
conformance/
|---- valid/       # Documents that MUST validate successfully
`---- invalid/     # Documents that MUST fail validation
```

## Valid Tests

Documents in `valid/` demonstrate correct PromptG format usage:

- **Minimal examples** - Only required fields
- **Full-featured examples** - All optional fields
- **Edge cases** - Boundary conditions that should pass

All implementations MUST successfully parse and validate these documents.

## Invalid Tests

Documents in `invalid/` contain intentional errors:

- Missing required fields
- Invalid field formats (names, timestamps, etc.)
- Schema violations

All implementations MUST reject these documents with validation errors.

## Running Tests

### Local validation (recommended)

From the repository root:

```bash
npm ci
npm run check
```

`npm run check` runs formatting checks and the full test suite.

To run individual checks:

```bash
node scripts/validate-schemas.js
node scripts/validate-examples.js
node scripts/test-conformance.js
node scripts/test-semantics.js
node scripts/test-encoding.js
```

## Adding Tests

When adding conformance tests:

1. **Valid tests** - Add to `valid/{type}/` with descriptive filename
2. **Invalid tests** - Add to `invalid/{type}/` with error-indicating filename
3. **Document** - Use a descriptive filename and explain the intent in your PR description or in this README.

Do not add extra JSON fields (e.g. `_comment`) to conformance fixtures; fixtures should validate strictly against the schemas.

## Test Coverage

Current coverage:

- Required fields validation
- Core schema validation
- Name format validation (kebab-case)
- Full-featured documents (optional fields)
- Packs with embedded prompts/templates
