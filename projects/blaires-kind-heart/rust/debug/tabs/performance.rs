//! Performance tab - displays boot phases, Web Vitals, performance marks.

use crate::metrics;

pub fn render() -> String {
    let marks = metrics::get_marks();
    let mut output = String::from(r#"
        <div class="debug-section">
            <h4>Boot Performance</h4>
            <table style="width: 100%; font-family: monospace; font-size: 11px;">
                <tr style="color: #888;">
                    <th style="text-align: left;">Phase</th>
                    <th style="text-align: right;">Duration (ms)</th>
                </tr>
    "#);

    // Add phase durations
    let phases = vec![
        ("boot:batch1", "Batch 1: Critical infra"),
        ("boot:batch2", "Batch 2: Core features"),
        ("boot:batch3", "Batch 3: Audio/PWA"),
        ("boot:batch4", "Batch 4: Hydration"),
        ("boot:total", "Total Boot Time"),
    ];

    for (measure_name, label) in phases {
        let start = format!("{}:start", measure_name.trim_end_matches(":total"));
        let end = format!("{}:end", measure_name.trim_end_matches(":total"));

        let duration_str = if measure_name == "boot:total" {
            metrics::duration("boot:start", "boot:end")
                .map(|d| format!("{:.2}", d))
                .unwrap_or_else(|| "—".to_string())
        } else {
            metrics::duration(&start, &end)
                .map(|d| format!("{:.2}", d))
                .unwrap_or_else(|| "—".to_string())
        };

        let color = if measure_name == "boot:total" { "#0f0" } else { "#fff" };
        output.push_str(&format!(
            r#"<tr style="color: {};">
                <td>{}</td>
                <td style="text-align: right;">{}</td>
            </tr>"#,
            color, label, duration_str
        ));
    }

    output.push_str(r#"
            </table>
        </div>
        <div class="debug-section">
            <h4>Performance Marks</h4>
            <div style="font-family: monospace; font-size: 10px; max-height: 200px; overflow-y: auto;">
    "#);

    for (name, timestamp) in marks {
        output.push_str(&format!(
            r#"<div style="color: #888;">{:.2}ms - {}</div>"#,
            timestamp, name
        ));
    }

    output.push_str(r#"
            </div>
        </div>
        <div class="debug-section">
            <h4>Web Vitals</h4>
            <table style="width: 100%; font-family: monospace; font-size: 11px;">
                <tr style="color: #888;">
                    <th style="text-align: left;">Metric</th>
                    <th style="text-align: right;">Value</th>
                    <th style="text-align: right;">Target</th>
                </tr>
    "#);

    // Get Web Vitals
    let vitals = metrics::get_vitals();

    // LCP (Largest Contentful Paint)
    let lcp_str = vitals.lcp.map(|v| format!("{:.2}ms", v)).unwrap_or_else(|| "—".to_string());
    let lcp_color = match vitals.lcp {
        Some(v) if v <= 2500.0 => "#0f0",
        Some(v) if v <= 4000.0 => "#ff0",
        _ => "#f00",
    };
    output.push_str(&format!(
        r#"<tr style="color: {};">
            <td>LCP</td>
            <td style="text-align: right;">{}</td>
            <td style="text-align: right; color: #888;">&lt; 2.5s</td>
        </tr>"#,
        lcp_color, lcp_str
    ));

    // FID (First Input Delay)
    let fid_str = vitals.fid.map(|v| format!("{:.2}ms", v)).unwrap_or_else(|| "—".to_string());
    let fid_color = match vitals.fid {
        Some(v) if v <= 100.0 => "#0f0",
        Some(v) if v <= 300.0 => "#ff0",
        _ => "#f00",
    };
    output.push_str(&format!(
        r#"<tr style="color: {};">
            <td>FID</td>
            <td style="text-align: right;">{}</td>
            <td style="text-align: right; color: #888;">&lt; 100ms</td>
        </tr>"#,
        fid_color, fid_str
    ));

    // CLS (Cumulative Layout Shift)
    let cls_str = vitals.cls.map(|v| format!("{:.4}", v)).unwrap_or_else(|| "—".to_string());
    let cls_color = match vitals.cls {
        Some(v) if v <= 0.1 => "#0f0",
        Some(v) if v <= 0.25 => "#ff0",
        _ => "#f00",
    };
    output.push_str(&format!(
        r#"<tr style="color: {};">
            <td>CLS</td>
            <td style="text-align: right;">{}</td>
            <td style="text-align: right; color: #888;">&lt; 0.1</td>
        </tr>"#,
        cls_color, cls_str
    ));

    // INP (Interaction to Next Paint)
    let inp_str = vitals.inp.map(|v| format!("{:.2}ms", v)).unwrap_or_else(|| "—".to_string());
    let inp_color = match vitals.inp {
        Some(v) if v <= 200.0 => "#0f0",
        Some(v) if v <= 500.0 => "#ff0",
        _ => "#f00",
    };
    output.push_str(&format!(
        r#"<tr style="color: {};">
            <td>INP</td>
            <td style="text-align: right;">{}</td>
            <td style="text-align: right; color: #888;">&lt; 200ms</td>
        </tr>"#,
        inp_color, inp_str
    ));

    output.push_str(r#"
            </table>
        </div>
    "#);

    output
}
