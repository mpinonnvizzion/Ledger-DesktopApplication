use serde::Serialize;

#[derive(Debug)]
pub enum DomainError {
    NotFound,
    Validation(String),
    Conflict(String),
    Database(String),
    Io(String),
    Migration(String),
}

impl std::fmt::Display for DomainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DomainError::NotFound => write!(f, "Not found"),
            DomainError::Validation(msg) => write!(f, "Validation error: {}", msg),
            DomainError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            DomainError::Database(msg) => write!(f, "Database error: {}", msg),
            DomainError::Io(msg) => write!(f, "IO error: {}", msg),
            DomainError::Migration(msg) => write!(f, "Migration error: {}", msg),
        }
    }
}

impl From<rusqlite::Error> for DomainError {
    fn from(err: rusqlite::Error) -> Self {
        match &err {
            rusqlite::Error::QueryReturnedNoRows => DomainError::NotFound,
            rusqlite::Error::SqliteFailure(ffi_err, _) => {
                if ffi_err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE
                    || ffi_err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_PRIMARYKEY
                {
                    DomainError::Conflict(err.to_string())
                } else {
                    DomainError::Database(err.to_string())
                }
            }
            _ => DomainError::Database(err.to_string()),
        }
    }
}

impl From<std::io::Error> for DomainError {
    fn from(err: std::io::Error) -> Self {
        DomainError::Io(err.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<DomainError> for CommandError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::NotFound => CommandError {
                code: "not_found".into(),
                message: "The requested resource was not found.".into(),
            },
            DomainError::Validation(msg) => CommandError {
                code: "validation_error".into(),
                message: msg,
            },
            DomainError::Conflict(msg) => CommandError {
                code: "conflict".into(),
                message: msg,
            },
            DomainError::Database(_) => CommandError {
                code: "database_error".into(),
                message: "A database error occurred. Please try again.".into(),
            },
            DomainError::Io(_) => CommandError {
                code: "internal_error".into(),
                message: "An internal error occurred.".into(),
            },
            DomainError::Migration(_) => CommandError {
                code: "internal_error".into(),
                message: "A database migration error occurred.".into(),
            },
        }
    }
}

impl From<CommandError> for String {
    fn from(err: CommandError) -> Self {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}
