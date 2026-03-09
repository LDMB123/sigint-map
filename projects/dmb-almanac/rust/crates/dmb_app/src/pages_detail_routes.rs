use super::*;
#[cfg_attr(not(any(feature = "hydrate", feature = "ssr")), allow(unused_imports))]
use crate::server::{
    get_guest, get_release, get_release_tracks, get_setlist_entries, get_song, get_tour,
    get_tour_by_id, get_venue,
};

macro_rules! optional_resource_from_param {
    ($source:expr, $parse:expr, $loader:expr) => {
        Resource::new($source, |raw: String| async move {
            let parsed = $parse(&raw).ok()?;
            $loader(parsed).await
        })
    };
}

macro_rules! resource_from_param_or_default {
    ($source:expr, $parse:expr, $default:expr, $loader:expr) => {
        Resource::new($source, |raw: String| async move {
            let Ok(parsed) = $parse(&raw) else {
                return $default;
            };
            $loader(parsed).await
        })
    };
}

macro_rules! detail_page_with_primary_resource {
    (
        back_href: $back_href:expr,
        back_label: $back_label:expr,
        title: $title:literal,
        subhead: $subhead:expr,
        loading_title: $loading_title:expr,
        loading_message: $loading_message:expr,
        content: $content:expr $(,)?
    ) => {
        view! {
            <section class="page">
                {detail_nav($back_href, $back_label)}
                <h1>{$title}</h1>
                {$subhead}
                <Suspense fallback=move || loading_state($loading_title, $loading_message)>
                    {$content}
                </Suspense>
            </section>
        }
    };
}

macro_rules! load_with_idb_fallback {
    ($idb_future:expr, $api_future:expr) => {{
        #[cfg(feature = "hydrate")]
        {
            let cached = spawn_local_to_send($idb_future).await;
            if cached.is_some() {
                cached
            } else {
                $api_future.await
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            $api_future.await
        }
    }};
}

macro_rules! load_entity_by_id {
    ($id:expr, $idb_loader:path, $api_loader:path) => {{
        let id = $id;
        load_with_idb_fallback!(
            async move { $idb_loader(id).await.ok().flatten() },
            async move { $api_loader(id).await.ok().flatten() }
        )
    }};
}

macro_rules! load_entity_by_slug {
    ($slug:expr, $idb_loader:path, $api_loader:path) => {{
        let slug = $slug;
        if slug.is_empty() {
            None
        } else {
            load_with_idb_fallback!(
                {
                    let idb_slug = slug.clone();
                    async move { $idb_loader(&idb_slug).await.ok().flatten() }
                },
                async move { $api_loader(slug).await.ok().flatten() }
            )
        }
    }};
}

macro_rules! load_with_hydrate_or_ssr_fallback {
    ($idb_loader:expr, $server_loader:expr) => {{
        #[cfg(feature = "hydrate")]
        {
            let local_items = spawn_local_to_send($idb_loader()).await.unwrap_or_default();
            if !local_items.is_empty() {
                local_items
            } else {
                $server_loader().await
            }
        }
        #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
        {
            $server_loader().await
        }
        #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
        {
            Vec::new()
        }
    }};
}

macro_rules! load_with_hydrate_or_ssr_list {
    ($idb_call:expr, $server_call:expr) => {{
        load_with_hydrate_or_ssr_fallback!(
            move || async move { $idb_call.await.ok() },
            move || async move { $server_call.await.unwrap_or_default() }
        )
    }};
}

#[path = "pages_detail_place_routes.rs"]
mod place;
#[path = "pages_detail_release.rs"]
mod release;
#[path = "pages_detail_song_guest.rs"]
mod song_guest;

pub use place::{tour_year_page, venue_detail_page};
pub use release::release_detail_page;
pub use song_guest::{guest_detail_page, song_detail_page};

#[must_use]
#[allow(clippy::too_many_lines)]
pub fn show_detail_page() -> impl IntoView {
    let show_id = route_param_or_default("showId");
    let seed_data_state = use_seed_data_state();
    let active_set = RwSignal::new("all".to_string());
    let setlist_query = RwSignal::new(String::new());
    let saved_show_ids = RwSignal::new(std::collections::HashSet::<i32>::new());
    let save_pending = RwSignal::new(false);
    let save_message = RwSignal::new(None::<(String, bool)>);

    #[cfg(feature = "hydrate")]
    {
        let saved_show_ids_signal = saved_show_ids.clone();
        spawn_local(async move {
            let ids = load_user_attended_shows()
                .await
                .into_iter()
                .map(|item| item.show_id)
                .collect::<std::collections::HashSet<_>>();
            saved_show_ids_signal.set(ids);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = &saved_show_ids;
    }

    reset_filter_and_query_on_route_change(show_id, active_set, setlist_query);

    let show = optional_resource_from_param!(
        show_id,
        |raw: &str| parse_positive_i32_param(raw, "showId"),
        |id: i32| async move {
            let show = load_entity_by_id!(id, dmb_idb::get_show, get_show)?;
            let venue = load_entity_by_id!(show.venue_id, dmb_idb::get_venue, get_venue);
            let tour = if let Some(tour_id) = show.tour_id {
                load_entity_by_id!(tour_id, dmb_idb::get_tour_by_id, get_tour_by_id)
            } else {
                None
            };
            Some(ShowContext { show, venue, tour })
        }
    );
    let setlist = optional_resource_from_param!(
        show_id,
        |raw: &str| parse_positive_i32_param(raw, "showId"),
        |_id| async move {
            Some(load_with_hydrate_or_ssr_list!(
                dmb_idb::list_setlist_entries(_id),
                get_setlist_entries(_id)
            ))
        }
    );

    let show_id_for_heading = show_id.clone();
    let show_id_for_render = show_id.clone();
    let save_message_for_render = save_message.clone();
    let seed_data_state_for_render = seed_data_state.clone();
    let saved_show_ids_for_render = saved_show_ids.clone();
    let save_pending_for_render = save_pending.clone();
    let save_message_for_context = save_message.clone();
    let active_set_for_setlist = active_set.clone();
    let setlist_query_for_setlist = setlist_query.clone();

    view! {
        <section class="page">
            {detail_nav("/shows", "Back to shows")}
            <h1>"Show Details"</h1>
            {move || render_route_param_subhead(
                "Show ID",
                &show_id_for_heading(),
                |raw: &str| parse_positive_i32_param(raw, "showId"),
            )}
            {move || {
                save_message_for_render.get().map(|(msg, is_error)| {
                    let class_name = if is_error {
                        "form-message form-message--error"
                    } else {
                        "form-message"
                    };
                    view! { <p class=class_name>{msg}</p> }
                })
            }}
            <Suspense fallback=move || loading_state("Loading show", "Fetching show summary and context.")>
                {move || {
                    render_show_context(
                        show.get().unwrap_or(None),
                        &show_id_for_render(),
                        seed_data_state_for_render.clone(),
                        saved_show_ids_for_render.clone(),
                        save_pending_for_render.clone(),
                        save_message_for_context.clone(),
                    )
                }}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Setlist"</h2>
            <Suspense fallback=move || loading_state("Loading setlist", "Building setlist sequence for this show.")>
                {move || {
                    match setlist.get().unwrap_or(None) {
                        Some(items) => render_show_setlist_content(
                            items,
                            active_set_for_setlist.clone(),
                            setlist_query_for_setlist.clone(),
                        )
                        .into_any(),
                        None => {
                            empty_state(
                                "Setlist unavailable",
                                "No setlist rows were found for this show.",
                            )
                            .into_any()
                        }
                    }
                }}
            </Suspense>
        </section>
    }
}
