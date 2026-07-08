use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceType {
    Personal,
    Business,
}

impl WorkspaceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkspaceType::Personal => "personal",
            WorkspaceType::Business => "business",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "personal" => Some(WorkspaceType::Personal),
            "business" => Some(WorkspaceType::Business),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub workspace_type: WorkspaceType,
    pub currency: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub workspace_type: WorkspaceType,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkspaceInput {
    pub name: Option<String>,
    pub currency: Option<String>,
}
