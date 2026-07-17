CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount_minor INTEGER NOT NULL CHECK(amount_minor != 0),
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'uncleared' CHECK(status IN ('uncleared', 'cleared', 'reconciled')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'import', 'plaid')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_workspace_id ON transactions(workspace_id);
