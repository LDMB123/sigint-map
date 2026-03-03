//! Errors tab - displays recent errors with severity levels.

use crate::errors::{self, ErrorSeverity};
use std::fmt::Write;

pub fn render() -> String {
    let mut output = String::from(
        r#"
        <div class="debug-section">
            <h4>Recent Errors (Last 50)</h4>
    "#,
    );

    let recent_errors = errors::get_recent_errors(50);

    if recent_errors.is_empty() {
        output.push_str(
            r#"
            <p style="color: #888; margin: 10px 0;">No errors logged in this session</p>
        "#,
        );
    } else {
        output.push_str(r#"
            <table style="width: 100%; font-family: monospace; font-size: 10px; border-collapse: collapse;">
                <tr style="color: #888; border-bottom: 1px solid #333;">
                    <th style="text-align: left; padding: 4px;">Time</th>
                    <th style="text-align: left; padding: 4px;">Severity</th>
                    <th style="text-align: left; padding: 4px;">Error</th>
                </tr>
        "#);

        for (error, timestamp) in recent_errors.iter().rev() {
            let severity = error.severity();
            let severity_color = match severity {
                ErrorSeverity::Critical => "#f00", // Red
                ErrorSeverity::Error => "#f80",    // Orange
                ErrorSeverity::Warning => "#ff0",  // Yellow
                ErrorSeverity::Info => "#888",     // Gray
            };

            let time_str = super::super::format_timestamp(*timestamp);
            let title = super::html_escape(&error.title());
            let description = super::html_escape(&error.description());

            let _ = write!(
                output,
                r#"
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 4px; color: #888;">{time_str}</td>
                    <td style="padding: 4px;">
                        <span style="color: {severity_color}; font-weight: bold;">{severity}</span>
                    </td>
                    <td style="padding: 4px;">
                        <div style="font-weight: bold;">{title}</div>
                        <div style="color: #888; font-size: 9px; margin-top: 2px;">{description}</div>
                    </td>
                </tr>
                "#
            );
        }

        output.push_str("</table>");
    }

    output.push_str("</div>");
    output
}
