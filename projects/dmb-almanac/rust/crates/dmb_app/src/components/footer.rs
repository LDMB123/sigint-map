use leptos::prelude::*;

#[component]
pub fn Footer() -> impl IntoView {
    view! {
        <footer class="footer">
            <div class="container">
                <span>"DMB Almanac • Rust-first PWA"</span>
                <a href="/about">"About"</a>
                <a href="/faq">"FAQ"</a>
                <a href="/contact">"Contact"</a>
                <a href="/ai-diagnostics">"AI Diagnostics"</a>
            </div>
        </footer>
    }
}
