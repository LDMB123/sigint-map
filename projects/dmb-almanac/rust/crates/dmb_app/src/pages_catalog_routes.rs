use super::*;
use crate::server::{
    get_recent_releases, get_recent_tours, get_top_guests, get_top_songs, get_top_venues,
};

#[path = "pages_catalog_activity.rs"]
mod activity;
#[path = "pages_catalog_rankings.rs"]
mod rankings;

pub use activity::{releases_page, shows_page, tours_page};
pub use rankings::{guests_page, songs_page, venues_page};

async fn load_with_limit_sources<T, IdbLoader, IdbFuture, ServerLoader, ServerFuture, Normalize>(
    limit: usize,
    idb_loader: IdbLoader,
    server_loader: ServerLoader,
    normalize: Normalize,
) -> Vec<T>
where
    T: Send + 'static,
    IdbLoader: FnOnce(usize) -> IdbFuture + 'static,
    IdbFuture: std::future::Future<Output = Option<Vec<T>>> + 'static,
    ServerLoader: FnOnce(usize) -> ServerFuture,
    ServerFuture: std::future::Future<Output = Vec<T>>,
    Normalize: Fn(Vec<T>, usize) -> Vec<T>,
{
    #[cfg(feature = "hydrate")]
    {
        match spawn_local_to_send(async move { idb_loader(limit).await }).await {
            Some(items) if !items.is_empty() => normalize(items, limit),
            _ => normalize(server_loader(limit).await, limit),
        }
    }
    #[cfg(not(feature = "hydrate"))]
    {
        normalize(server_loader(limit).await, limit)
    }
}

fn render_result_list<T, Summary, RenderItem>(
    items: Vec<T>,
    empty_title: &'static str,
    empty_description: &'static str,
    empty_href: &'static str,
    empty_link: &'static str,
    summary_text: Summary,
    render_item: RenderItem,
) -> AnyView
where
    Summary: Fn(usize) -> String,
    RenderItem: Fn(usize, T) -> AnyView,
{
    if items.is_empty() {
        empty_state_with_link(empty_title, empty_description, empty_href, empty_link).into_any()
    } else {
        let total = items.len();
        view! {
            <>
                <p class="list-summary">{summary_text(total)}</p>
                <ul class="result-list">
                    {items
                        .into_iter()
                        .enumerate()
                        .map(|(idx, item)| render_item(idx, item))
                        .collect::<Vec<_>>()}
                </ul>
            </>
        }
        .into_any()
    }
}

fn render_result_page<T, Loader, LoaderFuture, Render>(
    title: &'static str,
    lead: &'static str,
    loading_title: &'static str,
    loading_description: &'static str,
    loader: Loader,
    render_items: Render,
) -> impl IntoView
where
    T: Clone + serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    Loader: Fn() -> LoaderFuture + Copy + Send + Sync + 'static,
    LoaderFuture: std::future::Future<Output = Vec<T>> + Send + 'static,
    Render: Fn(Vec<T>) -> AnyView + Copy + Send + Sync + 'static,
{
    let items = unit_resource(loader);
    view! {
        <section class="page">
            <h1>{title}</h1>
            <p class="lead">{lead}</p>
            <Suspense fallback=move || loading_state(loading_title, loading_description)>
                {move || render_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}
