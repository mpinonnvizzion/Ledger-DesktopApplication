import { formatAmount } from "./format";
import type { Account, Category, Direction } from "@/types/domain";

/**
 * Re-exported under a transaction-domain name. No new formatting logic is
 * introduced here - this is the same tested implementation used by the
 * Accounts page, so minor-unit -> display formatting is never duplicated.
 */
export const formatMinorUnits = formatAmount;

// Matches a non-negative decimal magnitude with at most two decimal places:
// "10", "10.5", "10.50", ".50". No sign, no thousands separators, no more
// than two decimal digits.
const AMOUNT_MAGNITUDE_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$|^\.(\d{1,2})$/;

/**
 * Parses a user-facing decimal string into a non-negative integer number of
 * minor units (cents). Returns null for anything that is not a valid,
 * non-negative currency magnitude - callers must surface this as a field
 * error rather than silently coercing it to 0.
 *
 * This intentionally does not reuse `parseAmount` from `./format`: that
 * helper is a lenient best-effort parser (used only for account balances,
 * which always originate from validated Rust data) and does not reject
 * malformed input. A transaction amount is typed directly by the user, so
 * this parser is strict instead of lenient - it is a different contract,
 * not a duplicate of the same logic.
 *
 * Deliberately rejects (returns null for):
 * - empty or whitespace-only input
 * - a leading "-" (this parses a magnitude only; direction is applied
 *   separately via `applyTransactionDirection`)
 * - more than two decimal places
 * - thousands separators (e.g. "1,234.56") - not supported, rejected as
 *   malformed rather than silently stripped
 * - any non-numeric content
 *
 * Zero ("0", "0.00") parses successfully to 0. Rejecting a zero *transaction*
 * amount is a business rule enforced by the backend's CHECK constraint and
 * by the future create/edit form (Phase B2) - it is not this parser's job.
 */
export function parseAmountMagnitudeToMinorUnits(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const match = AMOUNT_MAGNITUDE_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const wholePart = match[1] ?? "0";
  const fractionPart = (match[2] ?? match[3] ?? "").padEnd(2, "0");

  const whole = Number(wholePart);
  const cents = Number(fractionPart);

  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(cents)) {
    return null;
  }

  return whole * 100 + cents;
}

/**
 * Applies a user-selected direction to a positive magnitude (in minor units)
 * to produce the signed `amount_minor` value the backend expects. Expense
 * negates; income passes through unchanged. Zero is normalized to positive
 * zero regardless of direction, avoiding a `-0` result that would fail
 * strict equality checks (`Object.is(-0, 0)` is false) even though the
 * transaction is not expected to reach the backend with a zero amount.
 */
export function applyTransactionDirection(
  magnitudeMinorUnits: number,
  direction: Direction,
): number {
  if (magnitudeMinorUnits === 0) {
    return 0;
  }
  return direction === "expense" ? -magnitudeMinorUnits : magnitudeMinorUnits;
}

/**
 * Derives transaction direction from the sign of a stored `amount_minor`
 * value, per the backend contract: there is no stored transaction-type
 * column, direction is derived entirely from sign. The backend's
 * `CHECK(amount_minor != 0)` constraint means zero should never occur in
 * practice; it falls back to "expense" here only so this helper cannot
 * throw if given unexpected data.
 */
export function directionFromAmount(amountMinor: number): Direction {
  return amountMinor > 0 ? "income" : "expense";
}

export function directionLabel(direction: Direction): string {
  return direction === "income" ? "Income" : "Expense";
}

/**
 * Formats minor units with an explicit sign for display: "+42.50" for
 * income, "-15.00" for expense. Conveys direction through the text itself
 * (not color alone), per the accessibility requirement noted in
 * docs/sprint-notes/sprint-6.md's Phase B1 plan.
 */
export function formatSignedAmount(amountMinor: number): string {
  const formatted = formatMinorUnits(amountMinor);
  return amountMinor > 0 ? `+${formatted}` : formatted;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a `YYYY-MM-DD` transaction date for display without ever
 * constructing a `Date` object. Parsing a plain date string with `new
 * Date(dateString)` (or round-tripping through `toISOString()`) can shift
 * the displayed day near local-timezone midnight; this helper reads the
 * year/month/day digits directly out of the string instead, so no timezone
 * conversion is possible. Unparseable input falls back to the raw string
 * rather than throwing, since this is a presentation helper only.
 */
export function formatTransactionDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return date;
  }
  const [, year, month, day] = match;
  const monthLabel = MONTH_LABELS[Number(month) - 1] ?? month;
  return `${monthLabel} ${Number(day)}, ${year}`;
}

/**
 * Display label for a transaction's category reference. `category_id` is
 * nullable at every layer (uncategorized is a first-class state, not an
 * edge case) - null or a category that could not be resolved both render as
 * "Uncategorized" rather than a blank cell.
 */
export function categoryDisplayLabel(
  category: Pick<Category, "name"> | null | undefined,
): string {
  return category?.name ?? "Uncategorized";
}

/**
 * Display label for a transaction's account reference. Unlike categories,
 * every transaction has a required `account_id`, so a missing/unresolved
 * account indicates a genuine data problem rather than a valid state - the
 * fallback text says so explicitly instead of rendering blank.
 */
export function accountDisplayLabel(
  account: Pick<Account, "name"> | null | undefined,
): string {
  return account?.name ?? "Unknown account";
}

/**
 * Tailwind text-color class for a signed amount, reusing the same
 * green/red tokens `Badge` already uses for success/error - the only
 * established positive/negative color convention in this codebase. This is
 * a secondary visual cue only; `formatSignedAmount`'s explicit +/- prefix is
 * the accessible source of truth for direction.
 */
export function amountDisplayClass(amountMinor: number): string {
  return amountMinor > 0 ? "text-green-700" : "text-red-700";
}
