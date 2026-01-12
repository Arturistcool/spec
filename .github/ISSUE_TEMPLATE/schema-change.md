---
name: Schema Change Proposal
about: Propose a change to the PromptG schemas
title: '[SCHEMA] '
labels: schema-change
assignees: ''
---

## Proposal

Clearly describe the proposed schema change.

## Motivation

Why is this change needed? What problem does it solve?

## Type

- [ ] Non-breaking (new optional field, clarification)
- [ ] Breaking (new required field, semantic change)

## Proposed Schema Change

```json
{
  "newField": {
    "type": "string",
    "description": "..."
  }
}
```

## Impact

- Which document types are affected? (Prompt / Template / Pack)
- Does this require a version bump? (Patch / Minor / Major)
- Are there migration concerns?

## Examples

Show examples of how the new schema would be used:

```json
{
  "kind": "prompt",
  "newField": "example value",
  ...
}
```

## Alternatives Considered

What other approaches did you consider?

## Additional Context

Any other relevant information.
