use super::*;

#[must_use]
pub fn open_file_page() -> impl IntoView {
    let file_request = RwSignal::new(crate::browser::pwa::staged_open_file_request());
    let file_status = RwSignal::new(None::<String>);

    #[cfg(feature = "hydrate")]
    {
        let file_request_signal = file_request.clone();
        let file_status_signal = file_status.clone();
        request_animation_frame(move || {
            if let Some(request) = crate::browser::pwa::take_pending_launch_file() {
                crate::browser::pwa::stage_open_file_request(&request);
                file_status_signal.set(Some(
                    "Loaded launch-queue import into local staging.".to_string(),
                ));
                file_request_signal.set(Some(request));
            }
        });
    }

    let on_select = move |_ev| {
        #[cfg(feature = "hydrate")]
        {
            let file_request_signal = file_request.clone();
            let file_status_signal = file_status.clone();
            spawn_local(async move {
                match crate::browser::pwa::read_import_file_from_event(_ev).await {
                    Some(request) => {
                        crate::browser::pwa::stage_open_file_request(&request);
                        file_status_signal.set(Some(
                            "Validated manual import into local staging.".to_string(),
                        ));
                        file_request_signal.set(Some(request));
                    }
                    None => {
                        file_status_signal
                            .set(Some("No importable file was selected.".to_string()));
                    }
                }
            });
        }
    };

    let on_clear = {
        let file_request = file_request.clone();
        let file_status = file_status.clone();
        move |_| {
            crate::browser::pwa::clear_staged_open_file_request();
            file_request.set(None);
            file_status.set(Some("Cleared staged import.".to_string()));
        }
    };

    let on_open_destination = {
        let file_request = file_request.clone();
        move |_| {
            if let Some(request) = file_request.get_untracked() {
                if let Some(destination) = crate::browser::pwa::open_file_destination(&request) {
                    let _ = crate::browser::runtime::location_assign(&destination.route);
                }
            }
        }
    };

    view! {
        <section class="page">
            <h1>"Open File"</h1>
            <p class="lead">"Import a JSON or text payload into the Rust-owned staging flow."</p>
            <h2>"Import File"</h2>
            <p class="muted">
                "Chromium launch-queue file opens and manual selection both normalize into the same staged import payload."
            </p>
            <input type="file" accept=".json,.txt" on:change=on_select />
            <button type="button" class="pill pill--ghost" on:click=on_clear>
                "Clear staged import"
            </button>
            {move || { file_status.get().map(|info| view! { <p class="muted">{info}</p> }) }}
            {move || {
                file_request.get().map(|request| {
                    let description = crate::browser::pwa::describe_open_file_request(&request);
                    let destination = crate::browser::pwa::open_file_destination(&request);
                    let preview = request.content.chars().take(220).collect::<String>();
                    view! {
                        <div class="card">
                            <h2>{request.name.clone()}</h2>
                            <p class="muted">
                                {format!("{} bytes • {} • source {}", request.size_bytes, description, request.source)}
                            </p>
                            {destination.map(|destination| {
                                view! {
                                    <button type="button" class="pill" on:click=on_open_destination>
                                        {destination.label}
                                    </button>
                                }
                            })}
                            <pre class="muted">{preview}</pre>
                        </div>
                    }
                })
            }}
        </section>
    }
}

#[must_use]
pub fn protocol_page() -> impl IntoView {
    let protocol_value = RwSignal::new(crate::browser::pwa::ProtocolPayload {
        raw: None,
        route: "/protocol".to_string(),
        query: None,
        status: "No protocol payload.".to_string(),
    });

    #[cfg(feature = "hydrate")]
    {
        let value_signal = protocol_value;
        request_animation_frame(move || {
            let payload = crate::browser::pwa::parse_protocol_payload(current_search_param("url"));
            if let Some(destination) = crate::browser::pwa::protocol_destination(&payload) {
                let _ = crate::browser::runtime::location_assign(&destination.route);
            }
            value_signal.set(payload);
        });
    }

    view! {
        <section class="page">
            <h1>"Protocol Handler"</h1>
            <p class="lead">"Incoming `web+dmb://` links are normalized here before routing."</p>
            <h2>"Incoming URL Payload"</h2>
            {move || {
                let payload = protocol_value.get();
                view! {
                    <div class="card">
                        <p class="muted">{payload.status.clone()}</p>
                        <p class="muted">{format!("Route: {}", payload.route)}</p>
                        <p class="muted">
                            {payload.raw.unwrap_or_else(|| "No protocol payload.".to_string())}
                        </p>
                        {payload.query.map(|query| {
                            view! { <p class="muted">{format!("Search query: {query}")}</p> }
                        })}
                    </div>
                }
            }}
        </section>
    }
}

#[must_use]
pub fn test_wasm_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let wasm_version = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            value_signal.set(Some(dmb_wasm::core_schema_version()));
        });
        value
    };

    view! {
        <section class="page">
            <h1>"WASM Diagnostics"</h1>
            <p class="lead">"WASM runtime checks and schema version."</p>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    wasm_version.get().map_or_else(
                        || view! { <p class="muted">{"Loading WASM...".to_string()}</p> },
                        |value| view! { <p class="muted">{format!("Core schema: {value}")}</p> },
                    )
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    view! { <p class="muted">"WASM diagnostics available after hydration."</p> }
                }
            }}
        </section>
    }
}
