use super::*;

pub(super) fn render_song_table(songs: &[Song], show_total: bool) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    let table_label = if show_total {
        "Song ranking by total performances"
    } else {
        "Song ranking"
    };
    view! {
        <div class="stats-table-wrap">
            <table class="stats-table" aria-label=table_label>
                <caption class="visually-hidden">{table_label}</caption>
                <thead>
                    <tr>
                        <th scope="col">"#"</th>
                        <th scope="col">"Song"</th>
                        {if show_total {
                            Some(view! { <th scope="col">"Plays"</th> })
                        } else {
                            None
                        }}
                    </tr>
                </thead>
                <tbody>
                    {songs
                        .iter()
                        .enumerate()
                        .map(|(i, song)| {
                            let href = format!("/songs/{}", song.slug);
                            view! {
                                <tr>
                                    <td>{(i + 1).to_string()}</td>
                                    <td><a href=href>{song.title.clone()}</a></td>
                                    {if show_total {
                                        Some(view! { <td>{song.total_performances.unwrap_or(0).to_string()}</td> })
                                    } else {
                                        None
                                    }}
                                </tr>
                            }
                        })
                        .collect::<Vec<_>>()}
                </tbody>
            </table>
        </div>
    }
    .into_any()
}

pub(super) fn render_song_ranking(songs: &[Song], count_fn: fn(&Song) -> i32) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    view! {
        <ul class="result-list">
            {songs
                .iter()
                .map(|song| {
                    let href = format!("/songs/{}", song.slug);
                    let count = count_fn(song);
                    view! {
                        <li class="result-card">
                            <div class="result-body">
                                <a class="result-label" href=href>{song.title.clone()}</a>
                            </div>
                            <span class="result-score">{format!("{count} times")}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ul>
    }
    .into_any()
}

pub(super) fn render_bar_chart(data: &[(u32, u32)]) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let max_val = f64::from(data.iter().map(|&(_, v)| v).max().unwrap_or(1));
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {data
                .iter()
                .map(|&(label, value)| {
                    let pct = if max_val > 0.0 {
                        (f64::from(value) / max_val * 100.0).max(1.0)
                    } else {
                        0.0
                    };
                    let width = format!("width: {pct:.1}%");
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.to_string()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}

pub(super) fn render_string_bar_chart(data: &[(String, u32)], limit: usize) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let items: Vec<_> = data.iter().take(limit).collect();
    let max_val = f64::from(items.iter().map(|(_, v)| *v).max().unwrap_or(1));
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {items
                .iter()
                .map(|(label, value)| {
                    let pct = if max_val > 0.0 {
                        (f64::from(*value) / max_val * 100.0).max(1.0)
                    } else {
                        0.0
                    };
                    let width = format!("width: {pct:.1}%");
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.clone()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}
