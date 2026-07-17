import { invoke } from "@tauri-apps/api/core";

import type {
  Direction,
  Transaction,
  TransactionListResult,
  TransactionSource,
  TransactionStatus,
  TransactionSummary,
} from "../types/domain";

export async function createTransaction(
  workspaceId: number,
  accountId: number,
  amountMinor: number,
  description: string,
  date: string,
  categoryId?: number,
  notes?: string,
  status?: TransactionStatus,
  source?: TransactionSource,
): Promise<Transaction> {
  return invoke("create_transaction", {
    workspaceId,
    accountId,
    categoryId,
    amountMinor,
    description,
    date,
    notes,
    status,
    source,
  });
}

export async function getTransaction(id: number): Promise<Transaction> {
  return invoke("get_transaction", { id });
}

export async function updateTransaction(
  id: number,
  accountId?: number,
  categoryId?: number | null,
  amountMinor?: number,
  description?: string,
  date?: string,
  notes?: string | null,
  status?: TransactionStatus,
): Promise<Transaction> {
  return invoke("update_transaction", {
    id,
    accountId,
    categoryId,
    amountMinor,
    description,
    date,
    notes,
    status,
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  return invoke("delete_transaction", { id });
}

export async function listTransactions(options: {
  workspaceId: number;
  accountId?: number;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  amountMin?: number;
  amountMax?: number;
  direction?: Direction;
  limit?: number;
  offset?: number;
}): Promise<TransactionListResult> {
  return invoke("list_transactions", {
    workspaceId: options.workspaceId,
    accountId: options.accountId,
    categoryId: options.categoryId,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    search: options.search,
    amountMin: options.amountMin,
    amountMax: options.amountMax,
    direction: options.direction,
    limit: options.limit,
    offset: options.offset,
  });
}

export async function createTransactionBatch(
  transactions: Array<{
    workspace_id: number;
    account_id: number;
    category_id?: number;
    amount_minor: number;
    description: string;
    date: string;
    notes?: string;
    status?: TransactionStatus;
    source?: TransactionSource;
  }>,
): Promise<Transaction[]> {
  return invoke("create_transaction_batch", { transactions });
}

export async function getAccountBalance(accountId: number): Promise<number> {
  return invoke("get_account_balance", { accountId });
}

export async function verifyAccountBalance(
  accountId: number,
): Promise<boolean> {
  return invoke("verify_account_balance", { accountId });
}

export async function rebuildAccountBalance(
  accountId: number,
): Promise<number> {
  return invoke("rebuild_account_balance", { accountId });
}

export async function getTransactionSummary(
  workspaceId: number,
  dateFrom: string,
  dateTo: string,
): Promise<TransactionSummary> {
  return invoke("get_transaction_summary", {
    workspaceId,
    dateFrom,
    dateTo,
  });
}
