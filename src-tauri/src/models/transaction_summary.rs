use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TransactionSummary {
    pub income_minor: i64,
    pub expense_minor: i64,
    pub net_minor: i64,
    pub transaction_count: i64,
}
