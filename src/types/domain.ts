export type WorkspaceType = "personal" | "business";

export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "other";

export type CategoryType = "income" | "expense";

export interface Workspace {
  id: number;
  name: string;
  workspace_type: WorkspaceType;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  name: string;
  workspace_type: WorkspaceType;
  currency?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  currency?: string;
}

export interface Account {
  id: number;
  workspace_id: number;
  name: string;
  account_type: AccountType;
  currency: string;
  balance: number;
  institution_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  workspace_id: number;
  name: string;
  account_type: AccountType;
  currency?: string;
  institution_name?: string;
}

export interface UpdateAccountInput {
  name?: string;
  institution_name?: string;
  is_active?: boolean;
}

export interface Category {
  id: number;
  workspace_id: number;
  name: string;
  category_type: CategoryType;
  parent_id: number | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  workspace_id: number;
  name: string;
  category_type: CategoryType;
  parent_id?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  parent_id?: number;
}

export type TransactionStatus = "uncleared" | "cleared" | "reconciled";
export type TransactionSource = "manual" | "import" | "plaid";
export type Direction = "income" | "expense";

export interface Transaction {
  id: number;
  workspace_id: number;
  account_id: number;
  category_id: number | null;
  amount_minor: number;
  description: string;
  date: string;
  notes: string | null;
  status: TransactionStatus;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  workspace_id: number;
  account_id: number;
  category_id?: number;
  amount_minor: number;
  description: string;
  date: string;
  notes?: string;
  status?: TransactionStatus;
  source?: TransactionSource;
}

export interface UpdateTransactionInput {
  account_id?: number;
  category_id?: number | null;
  amount_minor?: number;
  description?: string;
  date?: string;
  notes?: string | null;
  status?: TransactionStatus;
}

export interface TransactionQuery {
  workspace_id: number;
  account_id?: number;
  category_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  amount_min?: number;
  amount_max?: number;
  direction?: Direction;
  limit?: number;
  offset?: number;
}

export interface TransactionListResult {
  transactions: Transaction[];
  total_count: number;
}

export interface TransactionSummary {
  income_minor: number;
  expense_minor: number;
  net_minor: number;
  transaction_count: number;
}
