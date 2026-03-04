use crate::{
    browser_apis, confetti, constants, db_client, dom, navigation, render, speech, synth_audio,
};
use wasm_bindgen::JsCast;

pub fn init() {
    crate::browser_apis::spawn_local_logged("onboarding", async {
        if is_automated_session() {
            return Ok(());
        }
        if has_completed_onboarding().await {
            return Ok(());
        }
        browser_apis::sleep_ms(500).await;
        if !active_panel_is_home() {
            dom::warn("[onboarding] skipped auto-start because app is not on home");
            return Ok(());
        }
        run_onboarding().await;
        Ok(())
    });
}

async fn has_completed_onboarding() -> bool {
    db_client::get_setting("onboarding_done").await.is_some()
}

async fn mark_onboarding_done() {
    db_client::set_setting("onboarding_done", "1").await;
}

// ── Helpers ──

fn is_automated_session() -> bool {
    let search = dom::window()
        .location()
        .search()
        .unwrap_or_default()
        .to_ascii_lowercase();
    search.contains("e2e=1") || search.contains("lite=1") || search.contains("demo=1")
}

fn active_panel_is_home() -> bool {
    let Some(app) = dom::query(constants::SELECTOR_APP) else {
        return true;
    };
    let Some(html) = app.dyn_ref::<web_sys::HtmlElement>() else {
        return true;
    };
    html.dataset()
        .get(constants::ATTR_ACTIVE_PANEL)
        .is_none_or(|value| value == constants::PANEL_HOME)
}

fn show_overlay() {
    let doc = dom::document();
    let Some(overlay) = render::create_el_with_class(&doc, "div", "onboarding-spotlight-overlay")
    else {
        return;
    };
    dom::set_attr(&overlay, "data-onboarding-overlay", "");
    let _ = dom::body().append_child(&overlay);
}

fn remove_overlay() {
    if let Some(el) = dom::query("[data-onboarding-overlay]") {
        el.remove();
    }
}

fn show_dialog(text: &str, btn_text: &str, with_sparkle: bool) {
    remove_dialog();
    let doc = dom::document();
    let Some(dialog) = render::create_el_with_class(&doc, "div", "onboarding-dialog") else {
        return;
    };
    dom::set_attr(&dialog, "data-onboarding-dialog", "");
    dom::set_attr(&dialog, "aria-live", "polite");

    if with_sparkle {
        if let Some(img) = render::create_img(
            &doc,
            "companions/default_happy.webp",
            "Sparkle the Unicorn",
            "onboarding-dialog-sparkle",
        ) {
            dom::set_attr(&img, "width", "120");
            dom::set_attr(&img, "height", "120");
            let _ = dialog.append_child(&img);
        }
    }

    if let Some(msg) = render::text_el(&doc, "div", "onboarding-dialog-text", text) {
        let _ = dialog.append_child(&msg);
    }

    if let Some(btn) = render::create_button(&doc, "onboarding-dialog-btn", "") {
        if !btn_text.is_empty() {
            dom::safe_set_inner_html(&btn, btn_text);
        }
        dom::set_attr(&btn, "data-onboarding-btn", "");
        let _ = dialog.append_child(&btn);
    }

    let _ = dom::body().append_child(&dialog);
    dom::focus_first(&dialog);
}

fn remove_dialog() {
    if let Some(el) = dom::query("[data-onboarding-dialog]") {
        el.remove();
    }
}

fn elevate_element(selector: &str) {
    if let Some(el) = dom::query(selector) {
        let _ = el.class_list().add_1("onboarding-elevated");
    }
}

fn de_elevate_element(selector: &str) {
    if let Some(el) = dom::query(selector) {
        let _ = el.class_list().remove_1("onboarding-elevated");
    }
}

async fn await_button_click() {
    if let Some(el) = dom::query("[data-onboarding-btn]") {
        let target: &web_sys::EventTarget = el.unchecked_ref();
        await_event_with_timeout(target, "click", None, |_| true, None).await;
    }
}

async fn await_custom_event_timeout(event_name: &str, timeout_ms: i32) {
    let doc = dom::document();
    let target: &web_sys::EventTarget = doc.unchecked_ref();
    await_event_with_timeout(
        target,
        event_name,
        Some(timeout_ms),
        |_| true,
        Some(format!(
            "[onboarding] timed out waiting for '{event_name}' after {timeout_ms}ms"
        )),
    )
    .await;
}

async fn await_panel_open_timeout(expected_panel: &str, timeout_ms: i32) {
    let expected = expected_panel.to_string();
    let doc = dom::document();
    let target: &web_sys::EventTarget = doc.unchecked_ref();
    await_event_with_timeout(
        target,
        constants::EVENT_PANEL_OPENED,
        Some(timeout_ms),
        move |event| {
            let Some(custom_event) = event.dyn_ref::<web_sys::CustomEvent>() else {
                return false;
            };
            let detail = custom_event.detail();
            let opened_panel = js_sys::Reflect::get(&detail, &"target_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            opened_panel.as_deref() == Some(expected.as_str())
        },
        Some(format!(
            "[onboarding] timed out waiting for panel '{expected_panel}' after {timeout_ms}ms"
        )),
    )
    .await;
}

async fn await_event_with_timeout<F>(
    target: &web_sys::EventTarget,
    event_name: &str,
    timeout_ms: Option<i32>,
    mut should_resolve: F,
    timeout_warning: Option<String>,
) where
    F: FnMut(&web_sys::Event) -> bool + 'static,
{
    let (tx, rx) = futures::channel::oneshot::channel::<()>();
    let tx = std::cell::RefCell::new(Some(tx));
    let _handle = browser_apis::new_abort_handle();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(
        move |event: web_sys::Event| {
            if !should_resolve(&event) {
                return;
            }
            if let Some(sender) = tx.borrow_mut().take() {
                let _ = sender.send(());
            }
        },
    );
    if let Some(ref handle) = _handle {
        let opts = web_sys::AddEventListenerOptions::new();
        opts.set_signal(&handle.signal());
        let _ = target.add_event_listener_with_callback_and_add_event_listener_options(
            event_name,
            cb.as_ref().unchecked_ref(),
            &opts,
        );
    }
    cb.forget();

    let event_fut = async {
        let _ = rx.await;
    };
    if let Some(timeout_ms) = timeout_ms {
        let timeout_fut = browser_apis::sleep_ms(timeout_ms);
        futures::pin_mut!(event_fut);
        futures::pin_mut!(timeout_fut);
        if let futures::future::Either::Right(_) = futures::future::select(event_fut, timeout_fut).await {
            if let Some(message) = timeout_warning {
                dom::warn(&message);
            }
        }
    } else {
        let _ = event_fut.await;
    }
}

// ── Steps ──

async fn step_welcome() {
    // Always begin onboarding from home so spotlight targets are visible and reachable.
    navigation::close_panel_to_home();
    browser_apis::sleep_ms(450).await;

    show_overlay();
    show_dialog(
        "Hi Blaire! I'm Sparkle! I'll show you how to be kind!",
        r#"Hi Sparkle! <img src="illustrations/stickers/glowing-star.webp" class="inline-emoji"/>"#,
        true,
    );
    speech::speak("Hi Blaire! I'm Sparkle the unicorn! Let me show you around!");
    confetti::burst_unicorn();
    await_button_click().await;
    synth_audio::chime();
    remove_dialog();
}

async fn step_first_act() {
    // Spotlight the "Be Kind!" button — elevate it above the overlay
    remove_overlay();
    navigation::close_panel_to_home();
    browser_apis::sleep_ms(600).await;

    show_overlay();
    elevate_element("[data-panel-open='panel-tracker']");
    show_dialog("Tap 'Be Kind!' to do your first kind act!", "", false);
    // Remove the button from dialog — user taps the real Be Kind button
    if let Some(btn) = dom::query("[data-onboarding-btn]") {
        btn.remove();
    }
    speech::speak("Tap Be Kind to start!");

    // Wait for the tracker panel to open
    await_panel_open_timeout("panel-tracker", 15_000).await;
    de_elevate_element("[data-panel-open='panel-tracker']");
    remove_overlay();
    remove_dialog();

    // Now wait for a kind act to be logged
    show_dialog("Now tap one of the hearts to be kind!", "", false);
    if let Some(btn) = dom::query("[data-onboarding-btn]") {
        btn.remove();
    }
    speech::speak("Pick a kind act!");

    await_custom_event_timeout("kindheart-kind-act-logged", 15_000).await;
    remove_dialog();

    // Epic celebration for first onboarding act
    confetti::celebrate(confetti::CelebrationTier::Epic);
    synth_audio::fanfare();
    speech::celebrate("WOW Blaire! Your first kind act! AMAZING!");
    browser_apis::sleep_ms(2000).await;
}

async fn step_see_stuff() {
    navigation::close_panel_to_home();
    browser_apis::sleep_ms(600).await;

    show_overlay();
    elevate_element("[data-panel-open='panel-mystuff']");
    show_dialog("Tap 'My Stuff' to see your stickers and more!", "", false);
    if let Some(btn) = dom::query("[data-onboarding-btn]") {
        btn.remove();
    }
    speech::speak("Now tap My Stuff!");

    await_panel_open_timeout("panel-mystuff", 15_000).await;
    de_elevate_element("[data-panel-open='panel-mystuff']");
    remove_overlay();
    remove_dialog();

    synth_audio::sparkle();
    speech::speak("This is where your stickers and rewards live!");
    browser_apis::sleep_ms(1500).await;
}

async fn step_done() {
    navigation::close_panel_to_home();
    browser_apis::sleep_ms(600).await;

    show_dialog(
        "Now you know what to do, Blaire! Let's be kind every day!",
        r#"Let's Go! <img src="illustrations/stickers/party-popper.webp" class="inline-emoji"/>"#,
        true,
    );
    synth_audio::fanfare();
    confetti::burst_party();
    speech::celebrate("You're ready! Let's be kind every day, Blaire!");

    await_button_click().await;
    remove_dialog();
    confetti::burst_unicorn();
    synth_audio::level_up();
}

// ── Main flow ──

async fn run_onboarding() {
    step_welcome().await;
    step_first_act().await;
    step_see_stuff().await;
    step_done().await;
    mark_onboarding_done().await;
}
