CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'loan', 'other')),
    currency TEXT NOT NULL DEFAULT 'USD',
    balance INTEGER NOT NULL DEFAULT 0,
    institution_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
