//! First-launch onboarding — introduces Blaire to Sparkle and the app.
//! Shows a welcome overlay with Sparkle saying hello, then guides through features.
//! Checks `settings` table for `onboarding_done` key. Only runs once.

use wasm_bindgen::JsCast;
use crate::{browser_apis, confetti, db_client, dom, render, speech, synth_audio};

pub fn init() {
    wasm_bindgen_futures::spawn_local(async {
        if has_completed_onboarding().await {
            return;
        }
        // Small delay to let main UI render first
        browser_apis::sleep_ms(500).await;
        show_welcome().await;
    });
}

async fn has_completed_onboarding() -> bool {
    if let Ok(rows) = db_client::query(
        "SELECT value FROM settings WHERE key = 'onboarding_done'",
        vec![],
    ).await {
        rows.as_array().map(|a| !a.is_empty()).unwrap_or(false)
    } else {
        false
    }
}

async fn mark_onboarding_done() {
    let _ = db_client::exec(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_done', '1')",
        vec![],
    ).await;
}

async fn show_welcome() {
    let doc = dom::document();

    // Step 1: Sparkle introduction
    let overlay = render::create_el_with_class(&doc, "dialog", "onboarding-overlay");
    let _ = overlay.set_attribute("aria-live", "polite");
    let _ = overlay.set_attribute("aria-label", "Welcome to Blaire's Kind Heart");

    let sparkle = render::create_el_with_class(&doc, "div", "onboarding-sparkle");
    sparkle.set_text_content(Some("\u{1F984}"));

    let title = render::create_el_with_class(&doc, "div", "onboarding-title");
    title.set_text_content(Some("Hi Blaire!"));

    let subtitle = render::create_el_with_class(&doc, "div", "onboarding-subtitle");
    subtitle.set_text_content(Some("I'm Sparkle! I'll be your friend on your kindness adventure!"));

    let btn = render::create_button(&doc, "onboarding-btn", "Let's Go! \u{2728}");

    let _ = overlay.append_child(&sparkle);
    let _ = overlay.append_child(&title);
    let _ = overlay.append_child(&subtitle);
    let _ = overlay.append_child(&btn);

    if let Some(body) = dom::query("body") {
        let _ = body.append_child(&overlay);
    }
    // Native <dialog> showModal() provides focus trap + Escape + backdrop
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        web_sys::console::warn_1(&format!("[onboarding] dialog.show_modal() failed: {:?}", e).into());
        return;  // Don't show broken onboarding UI
    }

    speech::speak("Hi Blaire! I'm Sparkle the unicorn! Let's go on a kindness adventure!");
    confetti::burst_unicorn();

    // Wait for button click
    let (tx, rx) = futures_channel::oneshot::channel::<()>();
    let tx = std::cell::RefCell::new(Some(tx));
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
        if let Some(sender) = tx.borrow_mut().take() {
            let _ = sender.send(());
        }
    });
    if let Some(el) = dom::query(".onboarding-btn") {
        let _ = el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    }
    cb.forget();
    let _ = rx.await;

    synth_audio::fanfare();
    confetti::burst_party();

    // Close and remove overlay
    if let Some(el) = dom::query(".onboarding-overlay") {
        let dlg: &web_sys::HtmlDialogElement = el.unchecked_ref();
        dlg.close();
        el.remove();
    }

    mark_onboarding_done().await;
}
