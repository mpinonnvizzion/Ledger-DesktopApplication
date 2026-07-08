use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AccountType {
    Checking,
    Savings,
    CreditCard,
    Cash,
    Investment,
    Loan,
    Other,
}

impl AccountType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AccountType::Checking => "checking",
            AccountType::Savings => "savings",
            AccountType::CreditCard => "credit_card",
            AccountType::Cash => "cash",
            AccountType::Investment => "investment",
            AccountType::Loan => "loan",
            AccountType::Other => "other",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "checking" => Some(AccountType::Checking),
            "savings" => Some(AccountType::Savings),
            "credit_card" => Some(AccountType::CreditCard),
            "cash" => Some(AccountType::Cash),
            "investment" => Some(AccountType::Investment),
            "loan" => Some(AccountType::Loan),
            "other" => Some(AccountType::Other),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Account {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub account_type: AccountType,
    pub currency: String,
    pub balance: i64,
    pub institution_name: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountInput {
    pub workspace_id: i64,
    pub name: String,
    pub account_type: AccountType,
    pub currency: Option<String>,
    pub institution_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountInput {
    pub name: Option<String>,
    pub institution_name: Option<String>,
    pub is_active: Option<bool>,
}
