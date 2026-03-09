use super::*;

#[cfg(feature = "hydrate")]
async fn load_show_date_for_attended(show_id: i32) -> Option<String> {
    let cached =
        spawn_local_to_send(async move { dmb_idb::get_show(show_id).await.ok().flatten() }).await;
    if let Some(show) = cached {
        return Some(show.date);
    }
    get_show(show_id).await.ok().flatten().map(|show| show.date)
}

#[must_use]
#[allow(clippy::too_many_lines)]
pub fn my_shows_page() -> impl IntoView {
    let items = RwSignal::new(Vec::<UserAttendedShow>::new());
    let input = RwSignal::new(String::new());
    let message = RwSignal::new(None::<(String, bool)>);
    #[cfg(feature = "hydrate")]
    let loading = RwSignal::new(true);

    #[cfg(feature = "hydrate")]
    {
        let items_signal = items.clone();
        let loading_signal = loading.clone();
        spawn_local(async move {
            items_signal.set(load_user_attended_shows().await);
            loading_signal.set(false);
        });

        let input_signal = input.clone();
        let message_signal = message.clone();
        Effect::new(move |_| {
            let raw_show_id = current_search_param("showId");
            let Some(raw_show_id) = raw_show_id else {
                return;
            };
            match parse_positive_i32_param(&raw_show_id, "showId") {
                Ok(show_id) => {
                    input_signal.set(show_id.to_string());
                    if message_signal.get_untracked().is_none() {
                        message_signal.set(Some((
                            format!(
                                "Show {show_id} prefilled from link. Click Add to save it locally."
                            ),
                            false,
                        )));
                    }
                }
                Err(_) => {
                    if message_signal.get_untracked().is_none() {
                        message_signal.set(Some((
                            "Invalid showId query parameter. Enter a positive show ID.".to_string(),
                            true,
                        )));
                    }
                }
            }
        });
    }

    #[cfg(feature = "hydrate")]
    let on_add = {
        let items = items.clone();
        let input = input.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |_| {
            let value = input.get();
            let Ok(show_id) = value.trim().parse::<i32>() else {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            };
            if show_id <= 0 {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            }
            message.set(None);
            loading.set(true);
            spawn_local(async move {
                let show_date = load_show_date_for_attended(show_id).await;
                if add_user_attended_show(show_id, show_date).await {
                    items.set(load_user_attended_shows().await);
                    input.set(String::new());
                    message.set(Some((format!("Saved show {show_id} locally."), false)));
                } else {
                    message.set(Some((
                        "Unable to save this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_add = |_| {};

    #[cfg(feature = "hydrate")]
    let on_remove = {
        let items = items.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |show_id: i32| {
            let items = items.clone();
            let message = message.clone();
            let loading = loading.clone();
            spawn_local(async move {
                loading.set(true);
                if remove_user_attended_show(show_id).await {
                    items.set(load_user_attended_shows().await);
                    message.set(Some((format!("Removed show {show_id}."), false)));
                } else {
                    message.set(Some((
                        "Unable to remove this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_remove = |_show_id: i32| {};

    #[cfg(not(feature = "hydrate"))]
    let _ = (&items, &message, &on_remove, &input);

    view! {
        <section class="page">
            <h1>"My Shows"</h1>
            <p class="lead">"Track shows you've attended, stored locally."</p>
            <div class="inline-form">
                <input
                    class="input"
                    type="number"
                    placeholder="Enter show id"
                    prop:value=move || input.get()
                    on:input=move |ev| input.set(event_target_value(&ev))
                />
                <button type="button" class="pill" on:click=on_add>"Add"</button>
            </div>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    message.get().map(|(msg, is_error)| {
                        let class_name = if is_error {
                            "form-message form-message--error"
                        } else {
                            "form-message"
                        };
                        view! { <p class=class_name>{msg}</p> }.into_any()
                    })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    let saved = items.get();
                    if loading.get() {
                        loading_state("Loading saved shows", "Reading your local show list.")
                            .into_any()
                    } else if saved.is_empty() {
                        empty_state_with_link(
                            "No saved shows yet",
                            "Add a show ID to start tracking your attended history.",
                            "/shows",
                            "Browse shows",
                        )
                        .into_any()
                    } else {
                        let count = saved.len();
                        view! {
                            <>
                                <p class="list-summary">{format!("Showing {count} saved shows")}</p>
                                <ul class="result-list">
                                    {saved
                                        .into_iter()
                                        .map({
                                            let on_remove = on_remove.clone();
                                            move |item| {
                                                let href = format!("/shows/{}", item.show_id);
                                                let date = item
                                                    .show_date
                                                    .clone()
                                                    .unwrap_or_else(|| "Unknown date".to_string());
                                                let show_id = item.show_id;
                                                let on_remove_click = on_remove.clone();
                                                view! {
                                                    <li class="result-card">
                                                        <span class="pill">{format!("#{}", show_id)}</span>
                                                        <div class="result-body">
                                                            <a class="result-label" href=href>{date}</a>
                                                            <span class="result-meta">{format!("Show ID {show_id}")}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            class="pill pill--ghost"
                                                            on:click=move |_| on_remove_click(show_id)
                                                        >
                                                            "Remove"
                                                        </button>
                                                    </li>
                                                }
                                            }
                                        })
                                        .collect::<Vec<_>>()}
                                </ul>
                            </>
                        }
                        .into_any()
                    }
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    empty_state(
                        "Available after hydration",
                        "Local show tracking is enabled once the browser runtime is active.",
                    )
                    .into_any()
                }
            }}
        </section>
    }
}
