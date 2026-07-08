# ADR 0008: Monetary Amounts as Integer Minor Units

**Status:** Accepted
**Date:** 2026-07-07

## Context

Ledger Desktop is a finance application. Every monetary value — transaction amounts, account balances, budget targets, invoice totals, goal progress — must be stored accurately and computed without rounding errors.

The existing Ledger v3 reference application stores monetary amounts as SQLite `REAL` (IEEE 754 double-precision floating-point) values and uses `ROUND()` at display time. This approach is common but introduces a well-known class of errors:

- `0.1 + 0.2 = 0.30000000000000004` in IEEE 754 arithmetic.
- Repeated addition and subtraction of small amounts can accumulate rounding drift that produces incorrect totals.
- `ROUND()` at display time masks the underlying imprecision — the stored value is still wrong, and aggregations across thousands of transactions magnify the error.
- Comparison operations (`=`, `<`, `>`) on floating-point values are unreliable. A balance that should be exactly zero may be stored as `0.000000000001` or `-0.000000000001`.

These errors are unacceptable in financial software. Users trust that their balances, budget totals, and reports are exact. A one-cent discrepancy undermines that trust.

The v3 reference application is treated as reference only ([ADR 0007](0007-existing-ledger-as-reference-only.md)). Its implementation choices inform the new architecture but do not constrain it. Where the reference made a pragmatic shortcut that creates risk, the new architecture should choose the correct approach.

## Decision

Ledger Desktop stores all monetary amounts as **integers in the smallest currency unit** (minor units). For USD, EUR, GBP, and other two-decimal currencies, this means cents. A transaction of $42.50 is stored as the integer `4250`.

- SQLite column type: `INTEGER NOT NULL`
- Rust type: `i64`
- TypeScript type: `number` (safe for integers up to 2^53, which covers amounts up to ~$90 trillion in cents)
- Conversion: the application layer converts between minor units and display values at the frontend boundary

All arithmetic — addition, subtraction, aggregation, comparison — operates on integers. Integer arithmetic is exact. There is no rounding, no drift, and no ambiguity.

## Alternatives Considered

### 1. SQLite REAL with ROUND() (v3 approach)

Store as floating-point, round at display time. Simple to implement but fundamentally imprecise. Rounding masks errors rather than preventing them. Rejected because it creates a class of bugs that is difficult to detect and impossible to fully eliminate.

### 2. TEXT-encoded decimal strings

Store amounts as strings (e.g., `"42.50"`) and parse on read. Preserves exact decimal representation but makes arithmetic expensive (requires parsing on every operation), prevents SQLite-level aggregation (`SUM()`, `AVG()`), and complicates indexing and comparison. Rejected because the complexity cost outweighs the benefit when integer storage solves the same problem more efficiently.

### 3. Separate integer columns for whole and fractional parts

Store `dollars = 42` and `cents = 50` in separate columns. Technically precise but doubles the column count for every monetary field, complicates queries, and requires care to keep the two columns synchronized. Rejected as unnecessarily complex.

### 4. Integer minor units (chosen)

Store `4250` as a single `INTEGER`. Exact arithmetic, single column, works with SQLite's built-in aggregation functions, sorts and compares correctly, and is the standard approach in payment systems, banking APIs, and financial libraries worldwide (Stripe, Plaid, and the ISO 4217 standard all use minor-unit integers).

## Consequences

### Positive

- **Exact arithmetic**: No floating-point rounding errors, ever. `4250 + 1050 = 5300` is always correct.
- **Reliable comparisons**: `balance == 0` works. No epsilon-based equality checks needed.
- **Correct aggregation**: `SUM(amount)` over thousands of transactions produces the exact total.
- **Industry alignment**: Plaid returns amounts in minor units. Stripe uses minor units. Storing in the same format eliminates conversion-at-ingestion errors.
- **Data integrity**: Supports Ledger's local-first philosophy — the data on disk is the source of truth, and it is exact.
- **Simplicity**: One column, one type, standard SQL operations.

### Negative

- **Display conversion required**: Every amount must be converted from minor units to a display value (e.g., `4250` → `$42.50`) at the frontend boundary. This is a small, well-understood transformation.
- **Developer discipline**: Developers must remember that the stored value is in cents, not dollars. Clear naming conventions (`amount_cents` or documentation) mitigate this.
- **Division operations**: Splitting a bill or calculating percentages may produce fractional cents. The application must define a rounding policy for these operations (e.g., round half-up, allocate remainder to the first item). This is inherent to finance, not specific to integer storage.

### Neutral

- **Migration from v3**: If data is migrated from the v3 reference app, `REAL` values must be converted to integer minor units. This is a one-time operation: `CAST(ROUND(amount * 100) AS INTEGER)`. Data migration from v3 is not in the current roadmap but is straightforward if needed.

## Future Considerations

### Multi-Currency Support

Not all currencies use two decimal places. The Japanese yen (JPY) has zero decimal places; the Bahraini dinar (BHD) has three. When multi-currency support is implemented:

- Each currency must declare its minor-unit exponent (e.g., USD = 2, JPY = 0, BHD = 3), following the ISO 4217 standard.
- The display conversion must use the currency's exponent, not a hardcoded divisor of 100.
- Storage remains as `INTEGER` — a JPY amount of ¥1000 is stored as `1000`; a BHD amount of 1.500 BD is stored as `1500`.
- The current implementation may hardcode a divisor of 100 (two-decimal currencies) and introduce the currency-aware conversion when multi-currency is added. This is acceptable because v1.0 targets USD as the default currency, and the integer storage format is already correct for any exponent.

A future ADR should be created when multi-currency support is designed, covering currency metadata, conversion rates, and display formatting.
