use leptos::prelude::*;
use leptos_router::hooks::use_location;

#[component]
fn NavLink(current_path: Memo<String>, href: &'static str, label: &'static str) -> impl IntoView {
    let href_prefix = format!("{href}/");
    view! {
        <a
            href=href
            aria-current=move || {
                let path = current_path.get();
                let is_current = if href == "/" {
                    path == "/"
                } else {
                    path == href || path.starts_with(&href_prefix)
                };
                if is_current { Some("page") } else { None }
            }
        >
            {label}
        </a>
    }
}

#[component]
pub fn Header() -> impl IntoView {
    let location = use_location();
    let current_path = Memo::new(move |_| location.pathname.get());
    view! {
        <header class="header">
            <div class="container">
                <a class="brand" href="/">"DMB Almanac"</a>
                <nav class="nav" aria-label="Main navigation">
                    <ul>
                        <li><NavLink current_path href="/shows" label="Shows" /></li>
                        <li><NavLink current_path href="/songs" label="Songs" /></li>
                        <li><NavLink current_path href="/venues" label="Venues" /></li>
                        <li><NavLink current_path href="/guests" label="Guests" /></li>
                        <li><NavLink current_path href="/tours" label="Tours" /></li>
                        <li><NavLink current_path href="/releases" label="Releases" /></li>
                        <li><NavLink current_path href="/liberation" label="Liberation" /></li>
                        <li><NavLink current_path href="/lists" label="Lists" /></li>
                        <li><NavLink current_path href="/stats" label="Stats" /></li>
                        <li><NavLink current_path href="/visualizations" label="Visuals" /></li>
                        <li><NavLink current_path href="/search" label="Search" /></li>
                        <li><NavLink current_path href="/assistant" label="AI" /></li>
                        <li><NavLink current_path href="/ai-diagnostics" label="AI Diagnostics" /></li>
                        <li><NavLink current_path href="/ai-benchmark" label="AI Benchmark" /></li>
                    </ul>
                </nav>
            </div>
        </header>
    }
}
