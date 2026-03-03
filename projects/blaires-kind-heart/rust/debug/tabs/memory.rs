//! Memory tab - displays WASM heap usage, allocation tracking.

use crate::debug::memory;
use std::fmt::Write;

pub fn render() -> String {
    let mut output = String::from(
        r#"
        <div class="debug-section">
            <h4>Current Memory</h4>
    "#,
    );

    let heap_bytes = memory::current_heap_bytes();
    let pages = memory::current_pages();
    let formatted = memory::format_bytes(heap_bytes);

    let _ = write!(
        output,
        r#"
        <table style="width: 100%; font-family: monospace; font-size: 11px;">
            <tr>
                <td style="color: #888;">Heap Size:</td>
                <td style="text-align: right; color: #0f0;">{formatted}</td>
            </tr>
            <tr>
                <td style="color: #888;">WASM Pages:</td>
                <td style="text-align: right;">{pages}</td>
            </tr>
        </table>
        "#
    );

    // Memory growth since start
    if let Some(growth) = memory::memory_growth() {
        let sign = if growth >= 0 { "+" } else { "-" };
        let growth_formatted = format!("{}{}", sign, memory::format_bytes(growth.unsigned_abs() as usize));

        let growth_color = if growth > 10_000_000 {
            "#f80" // Orange warning if >10MB growth
        } else if growth > 0 {
            "#ff0" // Yellow for positive growth
        } else {
            "#0f0" // Green for negative (freed memory)
        };

        let _ = write!(
            output,
            r#"
            <div style="margin-top: 10px;">
                <div style="color: #888;">Growth since start:</div>
                <div style="color: {growth_color}; font-weight: bold; font-size: 12px;">{growth_formatted}</div>
            </div>
            "#
        );
    }

    // Leak detection
    if memory::detect_leak_pattern() {
        output.push_str(r#"
            <div style="margin-top: 10px; padding: 8px; background: #400; border-left: 3px solid #f00;">
                <div style="color: #f00; font-weight: bold;">⚠️ Memory Leak Detected</div>
                <div style="color: #888; font-size: 9px; margin-top: 4px;">
                    Heap has grown >20MB without any decrease in recent samples.
                </div>
            </div>
        "#);
    }

    output.push_str("</div>");

    // Recent snapshots
    let snapshots = memory::get_snapshots();
    if !snapshots.is_empty() {
        output.push_str(r#"
            <div class="debug-section">
                <h4>Recent Snapshots (Last 20)</h4>
                <table style="width: 100%; font-family: monospace; font-size: 9px; border-collapse: collapse;">
                    <tr style="color: #888; border-bottom: 1px solid #333;">
                        <th style="text-align: left; padding: 4px;">Time</th>
                        <th style="text-align: left; padding: 4px;">Label</th>
                        <th style="text-align: right; padding: 4px;">Heap</th>
                        <th style="text-align: right; padding: 4px;">Pages</th>
                    </tr>
        "#);

        let recent_count = snapshots.len().min(20);
        let start = snapshots.len().saturating_sub(recent_count);

        for snapshot in snapshots[start..].iter().rev() {
            let time_str = super::super::format_timestamp(snapshot.timestamp);
            let heap_str = memory::format_bytes(snapshot.heap_bytes);

            let _ = write!(
                output,
                r#"
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 4px; color: #888;">{}</td>
                    <td style="padding: 4px;">{}</td>
                    <td style="padding: 4px; text-align: right;">{}</td>
                    <td style="padding: 4px; text-align: right;">{}</td>
                </tr>
                "#,
                time_str, super::html_escape(&snapshot.label), heap_str, snapshot.wasm_pages
            );
        }

        output.push_str("</table></div>");
    }

    output
}
