import { invoke } from "@tauri-apps/api/core";

import type { TransactionSummary } from "../types/domain";

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
