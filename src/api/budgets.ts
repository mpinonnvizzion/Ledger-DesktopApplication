import { invoke } from "@tauri-apps/api/core";
import type { Budget, CategorySpending } from "@/types/domain";

export async function createBudget(
  workspaceId: number,
  categoryId: number,
  amountMinor: number,
  month: number,
  year: number,
): Promise<Budget> {
  return invoke("create_budget", {
    workspaceId,
    categoryId,
    amountMinor,
    month,
    year,
  });
}

export async function listBudgets(
  workspaceId: number,
  month: number,
  year: number,
): Promise<Budget[]> {
  return invoke("list_budgets", { workspaceId, month, year });
}

export async function updateBudget(
  id: number,
  amountMinor: number,
): Promise<Budget> {
  return invoke("update_budget", { id, amountMinor });
}

export async function deleteBudget(id: number): Promise<void> {
  return invoke("delete_budget", { id });
}

export async function getCategorySpending(
  workspaceId: number,
  month: number,
  year: number,
): Promise<CategorySpending[]> {
  return invoke("get_category_spending", { workspaceId, month, year });
}
