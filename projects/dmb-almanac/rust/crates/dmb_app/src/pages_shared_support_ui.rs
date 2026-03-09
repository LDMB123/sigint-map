use super::*;

pub(crate) fn use_seed_data_state() -> RwSignal<crate::data::SeedDataState> {
    let state = RwSignal::new(crate::data::SeedDataState::default());
    #[cfg(feature = "hydrate")]
    {
        let state_signal = state.clone();
        spawn_local(async move {
            state_signal.set(crate::data::detect_seed_data_state().await);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        state.set(crate::data::SeedDataState::Ready);
    }
    state
}

pub(crate) fn import_in_progress_state(
    title: &'static str,
    href: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--loading" role="status" aria-live="polite">
            <p class="status-title">{title}</p>
            <p class="muted">
                "Offline data is still importing. This detail view will populate when local data is ready."
            </p>
            <p><a class="result-label" href=href>{label}</a></p>
        </section>
    }
}

pub(crate) fn loading_state(title: &'static str, message: &'static str) -> impl IntoView {
    view! {
        <section class="status-card status-card--loading" role="status" aria-live="polite">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
        </section>
    }
}

pub(crate) fn empty_state(title: &'static str, message: &'static str) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
        </section>
    }
}

pub(crate) fn empty_state_with_link(
    title: &'static str,
    message: &'static str,
    href: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">{title}</p>
            <p class="muted">{message}</p>
            <p><a class="result-label" href=href>{label}</a></p>
        </section>
    }
}

pub(crate) fn unit_resource<T, Loader, LoaderFuture>(loader: Loader) -> Resource<T>
where
    T: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    Loader: Fn() -> LoaderFuture + Copy + Send + Sync + 'static,
    LoaderFuture: std::future::Future<Output = T> + Send + 'static,
{
    Resource::new(|| (), move |()| loader())
}

#[cfg(feature = "hydrate")]
pub(crate) async fn load_user_attended_shows() -> Vec<UserAttendedShow> {
    dmb_idb::list_user_attended_shows()
        .await
        .unwrap_or_default()
}

#[cfg(feature = "hydrate")]
pub(crate) async fn add_user_attended_show(show_id: i32, show_date: Option<String>) -> bool {
    dmb_idb::add_user_attended_show(show_id, show_date)
        .await
        .is_ok()
}

#[cfg(feature = "hydrate")]
pub(crate) async fn remove_user_attended_show(show_id: i32) -> bool {
    dmb_idb::remove_user_attended_show(show_id).await.is_ok()
}
