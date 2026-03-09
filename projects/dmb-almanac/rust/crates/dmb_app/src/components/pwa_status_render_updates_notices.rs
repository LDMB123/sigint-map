use super::*;

fn render_last_checked_row(state: PwaStatusState) -> impl IntoView {
    let update_last_checked = state.update_last_checked;

    view! {
        <Show when=move || update_last_checked.get().is_some() fallback=|| ()>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    let ts = update_last_checked.get().unwrap_or(0.0);
                    let now = js_sys::Date::now();
                    let label = format_last_checked(ts, now);
                    view! { <div class="pwa-status__row muted">{label}</div> }
                }
                #[cfg(not(feature = "hydrate"))]
                {

                }
            }}
        </Show>
    }
}

fn render_update_ready_banner(state: PwaStatusState) -> impl IntoView {
    let update_ready = state.update_ready;
    let update_snoozed = state.update_snoozed;
    let update_version = state.update_version;
    let update_applying = state.update_applying;

    view! {
        {move || {
            if !update_ready.get() || update_snoozed.get() {
                return ().into_any();
            }

            let label = update_version
                .get()
                .map_or_else(|| "Update ready".to_string(), |version| {
                    format!("Update ready ({version})")
                });
            let state_for_reload = state.clone();
            let state_for_later = state.clone();

            view! {
                <div class="pwa-status__row pwa-status__row--update" role="status" aria-live="polite">
                    <div class="pwa-update-message">{label}</div>
                    <div class="pwa-update-actions">
                        <button
                            type="button"
                            class="pill"
                            on:click=move |_| action_update_click(state_for_reload.clone())
                            disabled=move || update_applying.get()
                        >
                            {move || if update_applying.get() { "Applying…" } else { "Reload" }}
                        </button>
                        <button
                            type="button"
                            class="pill pill--ghost"
                            on:click=move |_| action_update_later(state_for_later.clone())
                            disabled=move || update_applying.get()
                        >
                            "Later"
                        </button>
                    </div>
                </div>
            }
            .into_any()
        }}
    }
}

fn render_manifest_diff_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;

    view! {
        <Show
            when=move || manifest_diff.get().is_some_and(|diff| diff.total_changed > 0)
            fallback=|| ()
        >
            {move || manifest_diff.get().map(|diff| {
                let items = diff.changed.iter().take(5).map(|entry| {
                    let sign = if entry.delta >= 0 { "+" } else { "" };
                    view! {
                        <li>{format!(
                            "{}: {}{} ({} → {})",
                            entry.name,
                            sign,
                            entry.delta,
                            entry.before,
                            entry.after
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--update muted">
                        <div class="pwa-update-message">
                            {format!("Data changes detected (manifest v{})", diff.version)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_integrity_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let integrity_report = state.integrity_report;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                integrity_report
                    .get()
                    .is_some_and(|report| report.total_mismatches > 0)
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || integrity_report.get().map(|report| {
                let items = report.mismatches.iter().take(5).map(|entry| {
                    view! {
                        <li>{format!(
                            "{}: {} expected / {} actual",
                            entry.store,
                            entry.expected,
                            entry.actual
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--update" role="alert">
                        <div class="pwa-update-message">
                            {format!("Integrity mismatches detected ({})", report.total_mismatches)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_update_error_notice(state: PwaStatusState) -> impl IntoView {
    let update_error = state.update_error;

    view! {
        <Show when=move || update_error.get().is_some() fallback=|| ()>
            {move || update_error.get().map(|message| {
                view! {
                    <div class="pwa-status__row pwa-status__row--update muted" role="alert">
                        {message}
                    </div>
                }
            })}
        </Show>
    }
}

fn render_sqlite_mismatch_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let sqlite_parity = state.sqlite_parity;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                sqlite_parity
                    .get()
                    .is_some_and(|report| report.available && report.total_mismatches > 0)
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || sqlite_parity.get().map(|report| {
                let items = report.mismatches.iter().take(5).map(|entry| {
                    view! {
                        <li>{format!(
                            "{} ({}) – IDB {} / SQLite {}",
                            entry.store,
                            entry.sqlite_table,
                            entry.idb_count,
                            entry.sqlite_count
                        )}</li>
                    }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--warn" role="alert">
                        <div class="pwa-update-message">
                            {format!("SQLite parity mismatches ({})", report.total_mismatches)}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_sqlite_failure_notice(state: PwaStatusState) -> impl IntoView {
    let manifest_diff = state.manifest_diff;
    let sqlite_parity = state.sqlite_parity;
    let status = state.status;

    view! {
        <Show
            when=move || {
                let update_pending = manifest_diff.get().is_some_and(|diff| diff.total_changed > 0);
                sqlite_parity
                    .get()
                    .is_some_and(|report| report.available && !report.idb_count_failures.is_empty())
                    && status.get().done
                    && !update_pending
            }
            fallback=|| ()
        >
            {move || sqlite_parity.get().map(|report| {
                let items = report.idb_count_failures.iter().take(5).map(|store| {
                    view! { <li>{store.clone()}</li> }
                });
                view! {
                    <div class="pwa-status__row pwa-status__row--warn" role="alert">
                        <div class="pwa-update-message">
                            {format!(
                                "SQLite parity check incomplete (could not count {} IDB stores)",
                                report.idb_count_failures.len()
                            )}
                        </div>
                        <ul class="list">{items.collect_view()}</ul>
                    </div>
                }
            })}
        </Show>
    }
}

fn render_snooze_row(state: PwaStatusState) -> impl IntoView {
    let update_snoozed = state.update_snoozed;
    let update_snooze_remaining = state.update_snooze_remaining;

    view! {
        <Show
            when=move || update_snoozed.get() && update_snooze_remaining.get().is_some()
            fallback=|| ()
        >
            {move || {
                let remaining = update_snooze_remaining.get().unwrap_or(0.0);
                let hours = remaining / (1000.0 * 60.0 * 60.0);
                view! {
                    <div class="pwa-status__row muted">
                        {format!("Update snoozed ({hours:.1}h remaining)")}
                    </div>
                }
            }}
        </Show>
    }
}

fn render_updated_version_row(state: PwaStatusState) -> impl IntoView {
    let update_version = state.update_version;

    view! {
        {move || {
            update_version.get().map(|version| {
                view! { <div class="pwa-status__row">{"Updated to "}{version}</div> }
            })
        }}
    }
}

pub(super) fn render_update_notices(state: PwaStatusState) -> impl IntoView {
    view! {
        <>
            {render_last_checked_row(state.clone())}
            {render_update_ready_banner(state.clone())}
            {render_manifest_diff_notice(state.clone())}
            {render_integrity_notice(state.clone())}
            {render_update_error_notice(state.clone())}
            {render_sqlite_mismatch_notice(state.clone())}
            {render_sqlite_failure_notice(state.clone())}
            {render_snooze_row(state.clone())}
            {render_updated_version_row(state)}
        </>
    }
}
