CREATE TABLE budgets (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK(year >= 1900 AND year <= 2999),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(workspace_id, category_id, month, year)
);

CREATE INDEX idx_budgets_workspace_month_year ON budgets(workspace_id, month, year);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
