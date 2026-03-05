use leptos::prelude::*;

#[component]
#[allow(clippy::must_use_candidate)]
#[must_use]
pub fn Footer() -> impl IntoView {
    view! {
        <footer class="footer" role="contentinfo">
            <div class="container">
                <p><strong>"DMB Almanac • Rust-first PWA"</strong></p>
                <nav aria-label="Support and status links">
                    <ul class="footer-links">
                        <li><a href="/">"Home"</a></li>
                        <li><a href="/search">"Search"</a></li>
                        <li><a href="/about">"About"</a></li>
                        <li><a href="/faq">"FAQ"</a></li>
                        <li><a href="/contact">"Contact"</a></li>
                        <li><a href="/open-file">"Open File"</a></li>
                        <li><a href="/ai-diagnostics">"AI Diagnostics"</a></li>
                        <li><a href="/offline">"Offline Help"</a></li>
                        <li><a href="/protocol">"Protocol"</a></li>
                    </ul>
                </nav>
                <p class="muted">
                    "If content appears stale, reconnect, refresh once, and check AI/PWA status banners."
                </p>
            </div>
        </footer>
    }
}
