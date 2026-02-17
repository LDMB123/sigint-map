use leptos::prelude::*;
use leptos_router::hooks::use_location;

const PRIMARY_NAV_LINKS: [(&str, &str); 8] = [
    ("/shows", "Shows"),
    ("/songs", "Songs"),
    ("/venues", "Venues"),
    ("/guests", "Guests"),
    ("/tours", "Tours"),
    ("/releases", "Releases"),
    ("/stats", "Stats"),
    ("/search", "Search"),
];

const SECONDARY_NAV_LINKS: [(&str, &str); 11] = [
    ("/liberation", "Liberation"),
    ("/lists", "Lists"),
    ("/visualizations", "Visuals"),
    ("/assistant", "AI Assistant"),
    ("/ai-diagnostics", "AI Diagnostics"),
    ("/ai-benchmark", "AI Benchmark"),
    ("/my-shows", "My Shows"),
    ("/about", "About"),
    ("/contact", "Contact"),
    ("/faq", "FAQ"),
    ("/offline", "Offline Help"),
];

fn path_matches(path: &str, href: &str) -> bool {
    if href == "/" {
        return path == "/";
    }
    path == href || (path.starts_with(href) && path.as_bytes().get(href.len()) == Some(&b'/'))
}

#[component]
fn NavLink(current_path: Memo<String>, href: &'static str, label: &'static str) -> impl IntoView {
    view! {
        <a
            href=href
            aria-current=move || {
                let path = current_path.get();
                let is_current = path_matches(&path, href);
                if is_current { Some("page") } else { None }
            }
        >
            {label}
        </a>
    }
}

#[component]
fn NavItems(
    current_path: Memo<String>,
    links: &'static [(&'static str, &'static str)],
) -> impl IntoView {
    links
        .iter()
        .map(|(href, label)| {
            let href = *href;
            let label = *label;
            view! {
                <li><NavLink current_path href=href label=label /></li>
            }
        })
        .collect_view()
}

#[component]
pub fn Header() -> impl IntoView {
    let location = use_location();
    let current_path = Memo::new(move |_| location.pathname.get());
    let secondary_active = Memo::new(move |_| {
        let path = current_path.get();
        SECONDARY_NAV_LINKS
            .iter()
            .any(|(href, _)| path_matches(&path, href))
    });
    view! {
        <header class="header" role="banner">
            <div class="container header-main">
                <a class="brand" href="/" aria-label="DMB Almanac home">
                    "DMB Almanac"
                </a>
                <div class="nav-cluster">
                    <nav class="nav nav-primary" aria-label="Primary navigation">
                        <ul>
                            <NavItems current_path links=&PRIMARY_NAV_LINKS />
                        </ul>
                    </nav>
                    <details class="nav-more" open=move || secondary_active.get()>
                        <summary
                            class="nav-more__summary"
                            class:nav-more__summary--active=move || secondary_active.get()
                        >
                            "More"
                        </summary>
                        <nav class="nav nav-secondary" aria-label="Secondary navigation">
                            <ul>
                                <NavItems current_path links=&SECONDARY_NAV_LINKS />
                            </ul>
                        </nav>
                    </details>
                </div>
            </div>
        </header>
    }
}
