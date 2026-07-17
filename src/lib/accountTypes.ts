import type { AccountType } from "@/types/domain";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
  other: "Other",
};

export function formatAccountType(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = (
  Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]
).map((value) => ({ value, label: ACCOUNT_TYPE_LABELS[value] }));
