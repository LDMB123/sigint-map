use leptos::prelude::*;

#[component]
pub fn Header() -> impl IntoView {
    view! {
        <header class="header">
            <div class="container">
                <a class="brand" href="/">"DMB Almanac"</a>
                <nav class="nav" aria-label="Main navigation">
                    <a href="/shows">"Shows"</a>
                    <a href="/songs">"Songs"</a>
                    <a href="/venues">"Venues"</a>
                    <a href="/guests">"Guests"</a>
                    <a href="/tours">"Tours"</a>
                    <a href="/releases">"Releases"</a>
                    <a href="/liberation">"Liberation"</a>
                    <a href="/lists">"Lists"</a>
                    <a href="/stats">"Stats"</a>
                    <a href="/visualizations">"Visuals"</a>
                    <a href="/search">"Search"</a>
                    <a href="/assistant">"AI"</a>
                    <a href="/ai-diagnostics">"AI Diagnostics"</a>
                    <a href="/ai-benchmark">"AI Benchmark"</a>
                </nav>
            </div>
        </header>
    }
}
