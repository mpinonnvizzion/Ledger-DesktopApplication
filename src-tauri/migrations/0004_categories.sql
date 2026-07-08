CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK(category_type IN ('income', 'expense')),
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(workspace_id, name, category_type)
);

CREATE INDEX idx_categories_workspace_id ON categories(workspace_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
