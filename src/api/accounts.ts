import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountType } from "@/types/domain";

export async function createAccount(
  workspaceId: number,
  name: string,
  accountType: AccountType,
  currency?: string,
  institutionName?: string,
): Promise<Account> {
  return invoke("create_account", {
    workspaceId,
    name,
    accountType,
    currency,
    institutionName,
  });
}

export async function getAccount(id: number): Promise<Account> {
  return invoke("get_account", { id });
}

export async function listAccountsByWorkspace(
  workspaceId: number,
): Promise<Account[]> {
  return invoke("list_accounts_by_workspace", { workspaceId });
}

export async function updateAccount(
  id: number,
  name?: string,
  institutionName?: string,
  isActive?: boolean,
): Promise<Account> {
  return invoke("update_account", { id, name, institutionName, isActive });
}

export async function deleteAccount(id: number): Promise<void> {
  return invoke("delete_account", { id });
}
