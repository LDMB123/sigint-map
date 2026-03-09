use std::collections::HashMap;

#[test]
fn endpoint_retry_budget_enforced() {
    let mut retries = HashMap::new();
    retries.insert("ShowSetlist.aspx".to_string(), 3);
    let err = match crate::warning_checks::enforce_endpoint_retries(&retries, 2) {
        Ok(()) => panic!("expected retry budget error"),
        Err(err) => err,
    };
    assert!(
        err.to_string().contains("endpoint retry budget exceeded"),
        "unexpected error: {err}"
    );
}
