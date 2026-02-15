use leptos::prelude::*;

#[component]
pub fn Footer() -> impl IntoView {
    view! {
        <footer class="footer">
            <div class="container">
                <span>"DMB Almanac • Rust-first PWA"</span>
                <nav aria-label="Footer links">
                    <ul class="footer-links">
                        <li><a href="/about">"About"</a></li>
                        <li><a href="/faq">"FAQ"</a></li>
                        <li><a href="/contact">"Contact"</a></li>
                        <li><a href="/ai-diagnostics">"AI Diagnostics"</a></li>
                    </ul>
                </nav>
            </div>
        </footer>
    }
}
