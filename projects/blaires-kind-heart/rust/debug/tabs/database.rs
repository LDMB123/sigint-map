//! Database tab - displays DB size, backend type, query stats.

pub fn render() -> String {
    String::from(r#"
        <div class="debug-section">
            <h4>Database Status</h4>
            <p style="color: #888;">Database monitoring coming soon</p>
        </div>
    "#)
}
