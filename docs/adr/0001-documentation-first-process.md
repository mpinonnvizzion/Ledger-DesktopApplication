# ADR 0001: Documentation-First Development Process

**Status:** Accepted
**Date:** 2026-07-07

## Context

Ledger Desktop is a commercial finance application handling sensitive user data. Rushed or undocumented development decisions can lead to architectural drift, inconsistent product behavior, and features that conflict with the product's core principles.

The product has a comprehensive set of business and product documents (Vision, Target Customer, Business Model, Product Strategy, Competitor Analysis, Roadmap, Product Guardrails, Pricing, Licensing, Release Strategy, and Product Requirements) that define what Ledger Desktop is and how it should operate.

## Decision

Ledger Desktop will follow a documentation-first development process.

- No feature should be implemented without corresponding documentation (specification, ADR, or update to an existing document).
- Sprint 0 is documentation only — no application code.
- Architecture decisions must be recorded as ADRs before implementation.
- Business and product documents serve as the source of truth for product direction.
- Claude Code must not invent product direction; it must follow documented decisions.

## Consequences

- Development is slower to start but more disciplined.
- Product direction is explicit and reviewable.
- Architecture decisions have clear rationale and can be revisited.
- New contributors (human or AI) can understand the project without tribal knowledge.
- Every sprint produces documentation alongside (or before) code.
