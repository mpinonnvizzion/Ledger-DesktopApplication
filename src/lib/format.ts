export function formatAmount(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formatted = `${dollars}.${remainder.toString().padStart(2, "0")}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function parseAmount(display: string): number {
  const trimmed = display.trim();
  const isNegative = trimmed.startsWith("-");
  const abs = trimmed.replace("-", "");
  const parts = abs.split(".");
  const dollars = parseInt(parts[0] || "0", 10);
  const cents = parseInt((parts[1] || "0").padEnd(2, "0").slice(0, 2), 10);
  const total = dollars * 100 + cents;
  return isNegative ? -total : total;
}
