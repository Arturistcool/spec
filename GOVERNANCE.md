# Governance

PromptG is maintained by Steve Papa (@stevepapa) with community input.

This governance is intentionally lightweight for the initial release and will evolve as adoption and community participation grows. Any future changes to governance will be documented in this file.

## Decision-Making

Process details live in [CONTRIBUTING.md](CONTRIBUTING.md).

**Editorial changes** (typos, clarifications, examples):

- Proposed via issue or PR
- Reviewed and merged by maintainer

**Substantive changes** (spec or schema changes that affect meaning/compatibility):

- Proposed via issue first
- Discussion happens in issues/discussions
- Approved by maintainer
- Results in version bump per Semantic Versioning

## Versioning

Version numbers apply to the PromptG contract (normative spec + schemas), not to every documentation edit.

Following Semantic Versioning for releases that change the contract:

- Patch (1.0.x): Non-breaking corrections/clarifications that affect contract interpretation or validation
- Minor (1.x.0): Backwards-compatible schema/spec additions (e.g., new optional fields/extensions)
- Major (x.0.0): Breaking changes

Editorial/documentation-only updates that do not change the contract do not require a version bump.

Document `schemaVersion` remains "1" for all 1.x releases and only changes on a major (e.g., "2").

## Contact

- General: GitHub Discussions
- Private: spec@promptg.io
