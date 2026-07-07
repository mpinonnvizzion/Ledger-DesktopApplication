# Claude Code Operating Rules: Ledger Desktop

## Product Identity

Ledger Desktop is a commercial desktop finance application. It is local-first, offline-first, privacy-first, and desktop-first. It is sold as a one-time purchase with optional subscriptions only for recurring-cost services.

**Ledger Desktop is not SaaS.**

## Documentation First

- Do not write application code before the relevant feature is documented in PROJECT.md, ARCHITECTURE.md, or a specification file.
- If a task requires a product or architecture decision that isn't documented, ask for clarification rather than making assumptions.
- Check existing ADRs before proposing changes that might conflict with recorded decisions.

## Do Not Invent Product Direction

- Follow the business and product documents as the source of truth.
- Do not add features, pricing models, or architectural patterns not described in the documentation.
- If something is ambiguous, ask rather than assume.
- Reference TASKS.md to understand what sprint a task belongs to.

## No Application Code During Sprint 0

Sprint 0 is documentation only. Do not create:
- Application code or scaffolding
- Tauri project initialization
- Database schemas or migrations
- Docker services
- Plaid implementation
- Stripe implementation
- Licensing implementation
- Frontend or backend code

## Follow Business and Product Documents

These documents define what Ledger Desktop is and how it operates:

- `docs/business/VISION.md` — Why Ledger exists
- `docs/business/TARGET_CUSTOMER.md` — Who Ledger serves
- `docs/business/BUSINESS_MODEL.md` — How Ledger makes money
- `docs/business/PRODUCT_STRATEGY.md` — How Ledger wins
- `docs/business/COMPETITOR_ANALYSIS.md` — Market context
- `docs/business/ROADMAP.md` — Development phases and sprints
- `docs/business/PRODUCT_GUARDRAILS.md` — Non-negotiable product rules
- `docs/business/PRICING_AND_PACKAGING.md` — Pricing structure
- `docs/business/LICENSING_AND_ACTIVATION.md` — License and activation design
- `docs/business/RELEASE_STRATEGY.md` — Release process and stages
- `docs/product/PRODUCT_REQUIREMENTS.md` — Product requirements document

## Existing Ledger App Is Reference Only

- The existing Ledger application (v3) may inform features and workflows.
- It must not dictate the new architecture.
- Do not modify the current production app.
- Do not copy technical decisions without review.
- See ADR 0007.

## Preserve Core Guardrails

Every change must preserve these principles:

- **Local-first**: User financial data is stored locally by default
- **Offline-first**: Core app works without internet
- **Privacy-first**: Minimal data collection, no ads, no tracking
- **One-time purchase**: Core app is not a subscription product
- **Subscriptions only for recurring-cost services**: Plaid bank sync, future cloud services
- **Data ownership**: Users can always export, back up, and access their local data

## Update Documentation With Every Meaningful Change

- Update CHANGELOG.md for features, fixes, architecture decisions, and documentation milestones
- Use Keep a Changelog format: Added, Changed, Fixed, Removed
- Update relevant specification files when feature behavior changes
- Update TASKS.md when sprint scope changes

## Record Architecture Decisions as ADRs

- Record meaningful architecture decisions in `docs/adr/`
- ADR format: Title, Status, Context, Decision, Consequences
- Naming: `NNNN-short-description.md` (e.g., `0008-auth-strategy.md`)
- Reference ADRs in code comments and documentation where relevant

## Development Practices

- Prefer small, reviewable changes over large sweeping modifications
- Do not remove documentation without explaining why
- Financial data integrity is more important than speed of delivery
- Manual workflows (CSV import, manual transactions) must remain excellent
- The product must be valuable for users who never connect a bank account

## When In Doubt

- Ask for clarification when product direction is ambiguous
- Check PROJECT.md and existing ADRs before proposing new features
- Reference TASKS.md to understand what sprint a task belongs to
- Do not invent product direction — document first, then build
