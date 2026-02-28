//! Debug panel component with tabbed interface.

use crate::dom;
use std::cell::Cell;
use wasm_bindgen::JsCast;
use web_sys::Element;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum DebugTab {
    Errors,
    Performance,
    Database,
    Queue,
    Memory,
}

pub struct DebugPanel {
    visible: Cell<bool>,
    active_tab: Cell<DebugTab>,
}

impl DebugPanel {
    pub const fn new() -> Self {
        DebugPanel {
            visible: Cell::new(false),
            active_tab: Cell::new(DebugTab::Errors),
        }
    }

    pub fn toggle(&self) {
        let new_state = !self.visible.get();
        self.visible.set(new_state);

        if new_state {
            self.render();
        } else {
            self.destroy();
        }
    }

    fn render(&self) {
        // Remove existing panel if any
        self.destroy();

        let panel = self.create_panel_element();
        dom::body().append_child(&panel).ok();
    }

    fn destroy(&self) {
        if let Some(panel) = dom::query("#debug-panel") {
            panel.remove();
        }
    }

    fn create_panel_element(&self) -> Element {
        let panel = dom::document().create_element("div").expect("create div");
        panel.set_id("debug-panel");
        panel.set_class_name("debug-panel");

        // Header with close button
        let header = self.create_header();
        panel.append_child(&header).ok();

        // Tab bar
        let tabs = self.create_tab_bar();
        panel.append_child(&tabs).ok();

        // Content area
        let content = self.create_content_area();
        panel.append_child(&content).ok();

        // Add styles
        self.inject_styles();

        panel
    }

    fn create_header(&self) -> Element {
        let header = dom::document().create_element("div").expect("create div");
        header.set_class_name("debug-header");

        // Title
        let title = dom::document().create_element("h3").expect("create h3");
        title.set_text_content(Some("🔧 Debug Panel"));
        header.append_child(&title).ok();

        // Close button
        let close_btn = dom::document()
            .create_element("button")
            .expect("create button");
        close_btn.set_text_content(Some("✕"));
        close_btn.set_class_name("debug-close-btn");

        // Close on click
        let closure = wasm_bindgen::closure::Closure::wrap(Box::new(move |_: web_sys::Event| {
            super::toggle();
        }) as Box<dyn FnMut(_)>);
        close_btn
            .add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())
            .ok();
        closure.forget();

        header.append_child(&close_btn).ok();

        header
    }

    fn create_tab_bar(&self) -> Element {
        let tabs = dom::document().create_element("div").expect("create div");
        tabs.set_class_name("debug-tabs");

        let tab_names = [
            (DebugTab::Errors, "Errors", "🐛"),
            (DebugTab::Performance, "Performance", "⚡"),
            (DebugTab::Database, "Database", "💾"),
            (DebugTab::Queue, "Queue", "📋"),
            (DebugTab::Memory, "Memory", "🧠"),
        ];

        for (tab_type, name, emoji) in tab_names {
            let btn = self.create_tab_button(tab_type, name, emoji);
            tabs.append_child(&btn).ok();
        }

        tabs
    }

    fn create_tab_button(&self, tab_type: DebugTab, name: &str, emoji: &str) -> Element {
        let btn = dom::document()
            .create_element("button")
            .expect("create button");
        btn.set_text_content(Some(&format!("{emoji} {name}")));
        btn.set_class_name("debug-tab-btn");

        if tab_type == self.active_tab.get() {
            btn.class_list().add_1("active").ok();
        }

        // Click handler to switch tabs
        let active_tab = self.active_tab.clone();
        let closure = wasm_bindgen::closure::Closure::wrap(Box::new(move |_: web_sys::Event| {
            active_tab.set(tab_type);
            // Re-render content
            if let Some(content) = dom::query("#debug-content") {
                let html = match tab_type {
                    DebugTab::Errors => super::tabs::errors::render(),
                    DebugTab::Performance => super::tabs::performance::render(),
                    DebugTab::Database => super::tabs::database::render(),
                    DebugTab::Queue => super::tabs::queue::render(),
                    DebugTab::Memory => super::tabs::memory::render(),
                };
                dom::safe_set_inner_html(&content, &html);
            }
            // Update active state
            if let Some(_tabs_container) = dom::query(".debug-tabs") {
                let buttons = dom::query_all(".debug-tab-btn");
                for button in &buttons {
                    button.class_list().remove_1("active").ok();
                }
                if let Some(active_btn) = buttons.get(tab_type as usize) {
                    active_btn.class_list().add_1("active").ok();
                }
            }
        }) as Box<dyn FnMut(_)>);
        btn.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())
            .ok();
        closure.forget();

        btn
    }

    fn create_content_area(&self) -> Element {
        let content = dom::document().create_element("div").expect("create div");
        content.set_id("debug-content");
        content.set_class_name("debug-content");

        // Initial content - render the active tab
        let html = match self.active_tab.get() {
            DebugTab::Errors => super::tabs::errors::render(),
            DebugTab::Performance => super::tabs::performance::render(),
            DebugTab::Database => super::tabs::database::render(),
            DebugTab::Queue => super::tabs::queue::render(),
            DebugTab::Memory => super::tabs::memory::render(),
        };
        dom::safe_set_inner_html(&content, &html);

        content
    }

    fn inject_styles(&self) {
        // Check if styles already injected
        if dom::query("#debug-panel-styles").is_some() {
            return;
        }

        let style = dom::document()
            .create_element("style")
            .expect("create style");
        style.set_id("debug-panel-styles");
        style.set_text_content(Some(r".debug-panel {
                position: fixed; bottom: 0; left: 0; right: 0;
                height: 60vh; background: rgba(0, 0, 0, 0.95); color: #fff; z-index: 10000;
                display: flex; flex-direction: column;
                border-top: 2px solid #00ff88; font-family: 'SF Mono', 'Monaco', monospace;
                font-size: 12px; animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }.debug-header {
                display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
                background: #111; border-bottom: 1px solid #333;
            }.debug-header h3 { margin: 0; font-size: 16px; font-weight: 600; }.debug-close-btn {
                background: #ff4444; border: none; color: white; width: 32px;
                height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px;
                font-weight: bold; transition: background 0.2s;
            }.debug-close-btn:active { background: #cc0000; }.debug-tabs {
                display: flex; gap: 4px; padding: 8px 16px; background: #1a1a1a;
                border-bottom: 1px solid #333; overflow-x: auto;
            }.debug-tab-btn {
                padding: 8px 16px; background: transparent; border: 1px solid #444; color: #aaa;
                border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;
                transition: all 0.2s;
            }.debug-tab-btn.active { background: #00ff88; color: #000; border-color: #00ff88; font-weight: 600; }
.debug-content { flex: 1; padding: 16px; overflow-y: auto; background: #0a0a0a; }
        "));

        dom::body().append_child(&style).ok();
    }
}
