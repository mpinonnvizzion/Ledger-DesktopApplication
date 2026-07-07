#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Ledger Desktop is running.", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_returns_expected_message() {
        let result = greet("Alice");
        assert_eq!(result, "Hello, Alice! Ledger Desktop is running.");
    }
}
