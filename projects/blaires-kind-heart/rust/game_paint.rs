//! Magic Painting Studio — Canvas2D creativity game.
//! Responsive canvas, 8 coloring templates, fill bucket, enhanced magic wand,
//! 24 stamps (3 sizes), velocity brush, bezier smoothing, "Masterpiece!" celebration.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use web_sys::{CanvasRenderingContext2d, Element, Event, HtmlCanvasElement, PointerEvent};

use crate::{
    browser_apis, confetti, db_client, dom, games, native_apis, render,
    speech, state::AppState, synth_audio, theme, ui, utils, weekly_goals,
};

// ── Colors ───────────────────────────────────────────────────────────────

const COLORS: &[(&str, &str)] = &[
    ("Red", "#FF4444"),
    ("Orange", "#FF9F43"),
    ("Yellow", "#FFD700"),
    ("Green", "#4CAF50"),
    ("Blue", "#2196F3"),
    ("Purple", "#9C27B0"),
    ("Pink", "#FF69B4"),
    ("White", "#FFFFFF"),
    ("Brown", "#8D6E63"),
    ("Black", "#222222"),
    ("Rainbow", "rainbow"),
];

// ── Brush sizes ──────────────────────────────────────────────────────────

const BRUSHES: &[(&str, f64)] = &[
    ("\u{25CF}", 4.0),   // small dot
    ("\u{2B24}", 12.0),  // medium
    ("\u{2588}", 24.0),  // big chunky
];

// ── 24 Stamp emojis ─────────────────────────────────────────────────────

const STAMPS: &[&str] = &[
    "\u{1F496}", // sparkling heart
    "\u{2B50}",  // star
    "\u{1F984}", // unicorn
    "\u{1F33A}", // flower
    "\u{1F308}", // rainbow
    "\u{1F98B}", // butterfly
    "\u{1F451}", // crown
    "\u{1F48E}", // diamond
    "\u{1F42C}", // dolphin
    "\u{1F409}", // dragon
    "\u{1F319}", // moon
    "\u{2601}",  // cloud
    "\u{1F525}", // fire
    "\u{1F52E}", // crystal ball
    "\u{1F48B}", // kiss mark
    "\u{1F31E}", // sun
    "\u{26A1}",  // lightning
    "\u{1F490}", // bouquet
    "\u{1F3F0}", // castle
    "\u{1F995}", // dinosaur
    "\u{1F697}", // car
    "\u{1F680}", // rocket
    "\u{1F339}", // rose
    "\u{1F47B}", // ghost
];

// ── Stamp sizes ──────────────────────────────────────────────────────────

const STAMP_SIZES: &[(&str, f64)] = &[
    ("S", 24.0),
    ("M", 40.0),
    ("L", 64.0),
];

// ── Paint categories ────────────────────────────────────────────────────

const PAINT_CATEGORIES: &[(&str, &str, &str)] = &[
    ("free", "\u{1F58C}", "Free Draw"),
    ("animals", "\u{1F98B}", "Animals"),
    ("fantasy", "\u{1F3F0}", "Fantasy"),
    ("food", "\u{1F355}", "Food"),
    ("space", "\u{1F680}", "Space"),
];

// ── Template IDs ─────────────────────────────────────────────────────────

const TEMPLATES: &[(&str, &str)] = &[
    ("free", "\u{1F58C} Free Draw"),
    ("heart", "\u{1F496} Heart"),
    ("star", "\u{2B50} Star"),
    ("unicorn", "\u{1F984} Unicorn"),
    ("rainbow", "\u{1F308} Rainbow"),
    ("flower", "\u{1F33A} Flower"),
    ("castle", "\u{1F3F0} Castle"),
    ("butterfly", "\u{1F98B} Butterfly"),
    ("dinosaur", "\u{1F995} Dinosaur"),
];

// ── Tool enum ────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq)]
enum PaintTool {
    Brush,
    Eraser,
    Stamp(String),
    MagicWand,
    Fill,
    Gradient,
    Pattern(String), // dots, stripes, checkerboard
}

// ── Paint state ──────────────────────────────────────────────────────────

struct PaintState {
    canvas: Option<HtmlCanvasElement>,
    ctx: Option<CanvasRenderingContext2d>,
    canvas_w: f64,
    canvas_h: f64,
    dpr: f64,
    drawing: bool,
    color: String,
    brush_size: f64,
    stamp_size: f64,
    tool: PaintTool,
    last_x: f64,
    last_y: f64,
    last_time: f64,
    undo_stack: Vec<Vec<u8>>,
    rainbow_hue: f64,
    wand_distance: f64, // accumulated distance for wand star stamps
    gradient_start_x: Option<f64>,
    gradient_start_y: Option<f64>,
    active: bool,
    active_template: String,
    _state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
}

thread_local! {
    static GAME: RefCell<Option<PaintState>> = const { RefCell::new(None) };
    static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) };
}


// ── Start ────────────────────────────────────────────────────────────────

pub fn start(state: Rc<RefCell<AppState>>) {
    show_category_picker(state);
}

fn show_category_picker(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    // Clean up previous picker listener if any
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F3A8} What Do You Want to Paint?"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    for &(id, emoji, label) in PAINT_CATEGORIES {
        let text = format!("{} {}", emoji, label);
        let btn = render::create_button(&doc, "game-card game-card--paint", &text);
        let _ = btn.set_attribute("data-paint-category", id);
        let _ = buttons.append_child(&btn);
    }

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);

    // Bind click handler for category selection
    let state_click = state.clone();
    dom::on_with_signal(arena.unchecked_ref(), "click", &signal, move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        if let Ok(Some(btn)) = el.closest("[data-paint-category]") {
            let _category = btn.get_attribute("data-paint-category").unwrap_or_default();
            synth_audio::sparkle();
            native_apis::vibrate_tap();
            // Category selection noted — future: pre-select stamps/templates by category
            start_painting(state_click.clone());
        }
    });

    PICKER_ABORT.with(|p| { *p.borrow_mut() = Some(abort); });
}

fn start_painting(state: Rc<RefCell<AppState>>) {
    // Abort picker click handler
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });

    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "paint-container");

    // Responsive canvas sizing: use arena bounds minus toolbar height (~120px)
    let arena_rect = arena.get_bounding_client_rect();
    let toolbar_height = 130.0;
    let css_w = arena_rect.width().max(theme::PAINT_MIN_CANVAS as f64);
    let css_h = (arena_rect.height() - toolbar_height).max(theme::PAINT_MIN_CANVAS as f64);
    let dpr = dom::window().device_pixel_ratio().max(1.0);
    let pixel_w = (css_w * dpr) as u32;
    let pixel_h = (css_h * dpr) as u32;

    // Canvas element — CSS size matches layout, pixel size for Retina
    let Ok(canvas_el) = doc.create_element("canvas") else {
        web_sys::console::error_1(&"Failed to create canvas element for paint game".into());
        dom::toast("Sorry, painting game couldn't start. Try again?");
        games::return_to_menu();
        return;
    };
    let _ = canvas_el.set_attribute("class", "paint-canvas paint-canvas--responsive");
    let _ = canvas_el.set_attribute("data-paint-canvas", "");
    let _ = canvas_el.set_attribute("width", &pixel_w.to_string());
    let _ = canvas_el.set_attribute("height", &pixel_h.to_string());
    let _ = canvas_el.set_attribute("style",
        &format!("width:{}px;height:{}px;touch-action:none", css_w as u32, css_h as u32));

    // Toolbar
    let toolbar = render::create_el_with_class(&doc, "div", "paint-toolbar");

    // Row 1: Color palette
    let palette = render::create_el_with_class(&doc, "div", "paint-palette");
    for &(name, hex) in COLORS {
        let swatch = render::create_el_with_class(&doc, "button", "paint-swatch");
        let _ = swatch.set_attribute("type", "button");
        let _ = swatch.set_attribute("data-paint-color", hex);
        let _ = swatch.set_attribute("aria-label", name);
        if hex == "rainbow" {
            let _ = swatch.set_attribute("style",
                "background: linear-gradient(135deg, red, orange, yellow, green, blue, purple)");
        } else {
            let _ = swatch.set_attribute("style", &format!("background: {hex}"));
        }
        if hex == "#FF4444" {
            let _ = swatch.class_list().add_1("paint-swatch--active");
        }
        let _ = palette.append_child(&swatch);
    }

    // Row 2: Brush sizes + Stamp sizes
    let sizes_row = render::create_el_with_class(&doc, "div", "paint-sizes");

    let size_label = render::create_el_with_class(&doc, "span", "paint-section-label");
    size_label.set_text_content(Some("Brush:"));
    let _ = sizes_row.append_child(&size_label);

    for (i, &(label, radius)) in BRUSHES.iter().enumerate() {
        let btn = render::create_button(&doc, "paint-size-btn", label);
        let _ = btn.set_attribute("data-paint-size", &radius.to_string());
        if i == 1 { let _ = btn.class_list().add_1("paint-size-btn--active"); }
        let _ = sizes_row.append_child(&btn);
    }

    let stamp_label = render::create_el_with_class(&doc, "span", "paint-section-label");
    stamp_label.set_text_content(Some("Stamp:"));
    let _ = sizes_row.append_child(&stamp_label);

    for (i, &(label, _size)) in STAMP_SIZES.iter().enumerate() {
        let btn = render::create_button(&doc, "paint-stamp-size", label);
        let _ = btn.set_attribute("data-paint-stamp-size", &_size.to_string());
        if i == 1 { let _ = btn.class_list().add_1("paint-stamp-size--active"); }
        let _ = sizes_row.append_child(&btn);
    }

    // Row 3: Stamps (scrollable)
    let stamps_el = render::create_el_with_class(&doc, "div", "paint-stamps");
    for &stamp in STAMPS {
        let btn = render::create_button(&doc, "paint-stamp-btn", stamp);
        let _ = btn.set_attribute("data-paint-stamp", stamp);
        let _ = stamps_el.append_child(&btn);
    }

    // Row 4: Tools + Templates
    let tools = render::create_el_with_class(&doc, "div", "paint-tools");

    let brush_btn = render::create_button(&doc, "paint-tool-btn paint-tool-btn--active", "\u{1F58C} Brush");
    let _ = brush_btn.set_attribute("data-paint-brush", "");
    let eraser_btn = render::create_button(&doc, "paint-tool-btn", "\u{1F6AB} Eraser");
    let _ = eraser_btn.set_attribute("data-paint-eraser", "");
    let wand_btn = render::create_button(&doc, "paint-tool-btn", "\u{2728} Magic");
    let _ = wand_btn.set_attribute("data-paint-wand", "");
    let fill_btn = render::create_button(&doc, "paint-tool-btn", "\u{1FAA3} Fill");
    let _ = fill_btn.set_attribute("data-paint-fill", "");
    let gradient_btn = render::create_button(&doc, "paint-tool-btn", "\u{1F308} Gradient");
    let _ = gradient_btn.set_attribute("data-paint-gradient", "");
    let pattern_btn = render::create_button(&doc, "paint-tool-btn", "\u{25A6} Patterns");
    let _ = pattern_btn.set_attribute("data-paint-patterns", "");
    let undo_btn = render::create_button(&doc, "paint-tool-btn", "\u{21A9} Undo");
    let _ = undo_btn.set_attribute("data-paint-undo", "");
    let clear_btn = render::create_button(&doc, "paint-tool-btn", "\u{1F5D1} Clear");
    let _ = clear_btn.set_attribute("data-paint-clear", "");
    let template_btn = render::create_button(&doc, "paint-tool-btn", "\u{1F4D0} Templates");
    let _ = template_btn.set_attribute("data-paint-templates", "");
    let done_btn = render::create_button(&doc, "paint-tool-btn paint-tool-btn--done", "\u{2705} Done!");
    let _ = done_btn.set_attribute("data-paint-done", "");

    let _ = tools.append_child(&brush_btn);
    let _ = tools.append_child(&eraser_btn);
    let _ = tools.append_child(&wand_btn);
    let _ = tools.append_child(&fill_btn);
    let _ = tools.append_child(&gradient_btn);
    let _ = tools.append_child(&pattern_btn);
    let _ = tools.append_child(&undo_btn);
    let _ = tools.append_child(&clear_btn);
    let _ = tools.append_child(&template_btn);
    let _ = tools.append_child(&done_btn);

    let _ = toolbar.append_child(&palette);
    let _ = toolbar.append_child(&sizes_row);
    let _ = toolbar.append_child(&stamps_el);
    let _ = toolbar.append_child(&tools);

    // Template picker overlay (hidden by default)
    let tpl_overlay = render::create_el_with_class(&doc, "div", "paint-template-picker");
    let _ = tpl_overlay.set_attribute("data-paint-tpl-overlay", "");
    let _ = tpl_overlay.set_attribute("hidden", "");
    let tpl_title = render::create_el_with_class(&doc, "div", "paint-template-picker-title");
    tpl_title.set_text_content(Some("\u{1F3A8} Choose a Template!"));
    let _ = tpl_overlay.append_child(&tpl_title);
    let tpl_grid = render::create_el_with_class(&doc, "div", "paint-template-grid");
    for &(id, label) in TEMPLATES {
        let btn = render::create_button(&doc, "paint-template-btn", label);
        let _ = btn.set_attribute("data-paint-tpl", id);
        let _ = tpl_grid.append_child(&btn);
    }
    let _ = tpl_overlay.append_child(&tpl_grid);

    // Pattern picker overlay (hidden by default)
    let pattern_overlay = render::create_el_with_class(&doc, "div", "paint-pattern-picker");
    let _ = pattern_overlay.set_attribute("data-paint-pattern-overlay", "");
    let _ = pattern_overlay.set_attribute("hidden", "");
    let pattern_title = render::create_el_with_class(&doc, "div", "paint-pattern-picker-title");
    pattern_title.set_text_content(Some("\u{25A6} Choose a Pattern!"));
    let _ = pattern_overlay.append_child(&pattern_title);
    let pattern_grid = render::create_el_with_class(&doc, "div", "paint-pattern-grid");

    let patterns = [
        ("dots", "\u{2022} Dots"),
        ("stripes", "\u{2014} Stripes"),
        ("checkerboard", "\u{25A6} Checkerboard"),
        ("waves", "\u{223C} Waves"),
        ("diamonds", "\u{1F48E} Diamonds"),
        ("hearts", "\u{1F496} Hearts"),
        ("clouds", "\u{2601} Clouds"),
        ("polkadots", "\u{25CF} Polka Dots"),
        ("zigzag", "\u{26A1} Zigzag"),
    ];
    for &(id, label) in &patterns {
        let btn = render::create_button(&doc, "paint-pattern-btn", label);
        let _ = btn.set_attribute("data-paint-pattern", id);
        let _ = pattern_grid.append_child(&btn);
    }
    let _ = pattern_overlay.append_child(&pattern_grid);

    let _ = container.append_child(&canvas_el);
    let _ = container.append_child(&toolbar);
    let _ = container.append_child(&tpl_overlay);
    let _ = container.append_child(&pattern_overlay);
    let _ = arena.append_child(&container);

    // Setup canvas context
    let canvas: HtmlCanvasElement = canvas_el.unchecked_into();
    let ctx = canvas.get_context("2d").ok().flatten()
        .and_then(|c| c.dyn_into::<CanvasRenderingContext2d>().ok());

    // Scale for Retina — all drawing ops use CSS coordinates
    if let Some(ref ctx) = ctx {
        let _ = ctx.scale(dpr, dpr);
        ctx.set_fill_style_str("white");
        ctx.fill_rect(0.0, 0.0, css_w, css_h);
    }

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    GAME.with(|g| {
        *g.borrow_mut() = Some(PaintState {
            canvas: Some(canvas),
            ctx,
            canvas_w: css_w,
            canvas_h: css_h,
            dpr,
            drawing: false,
            color: "#FF4444".to_string(),
            brush_size: 12.0,
            stamp_size: 40.0,
            tool: PaintTool::Brush,
            last_x: 0.0,
            last_y: 0.0,
            last_time: 0.0,
            undo_stack: Vec::new(),
            rainbow_hue: 0.0,
            wand_distance: 0.0,
            gradient_start_x: None,
            gradient_start_y: None,
            active: true,
            active_template: "free".to_string(),
            _state: state.clone(),
            abort,
        });
    });

    synth_audio::chime();
    bind_paint_events(state, &signal);
}

// ── Event binding ────────────────────────────────────────────────────────

fn bind_paint_events(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    // Canvas pointer events
    if let Some(canvas_el) = dom::query("[data-paint-canvas]") {
        // Pointer down
        dom::on_pointer_with_signal(canvas_el.unchecked_ref(), "pointerdown", signal, move |event: PointerEvent| {
            let x = event.offset_x() as f64;
            let y = event.offset_y() as f64;
            GAME.with(|g| {
                let mut borrow = g.borrow_mut();
                let Some(game) = borrow.as_mut() else { return };
                if !game.active { return; }

                save_undo(game);
                game.last_time = js_sys::Date::now();

                match &game.tool {
                    PaintTool::Stamp(emoji) => {
                        draw_stamp(game, x, y, emoji.clone());
                        synth_audio::tap();
                        native_apis::vibrate_tap();
                    }
                    PaintTool::Fill => {
                        flood_fill(game, x, y);
                        synth_audio::whoosh();
                        native_apis::vibrate_tap();
                    }
                    PaintTool::Gradient => {
                        if game.gradient_start_x.is_none() {
                            // First click: set start point
                            game.gradient_start_x = Some(x);
                            game.gradient_start_y = Some(y);
                            synth_audio::tap();
                        } else {
                            // Second click: draw gradient from start to end
                            if let (Some(start_x), Some(start_y)) = (game.gradient_start_x, game.gradient_start_y) {
                                draw_gradient(game, start_x, start_y, x, y);
                                synth_audio::rainbow_burst();
                                native_apis::vibrate_success();
                            }
                            // Reset for next gradient
                            game.gradient_start_x = None;
                            game.gradient_start_y = None;
                        }
                    }
                    PaintTool::Pattern(pattern_type) => {
                        let pattern = pattern_type.clone();
                        flood_fill_pattern(game, x, y, &pattern);
                        synth_audio::whoosh();
                        native_apis::vibrate_tap();
                    }
                    _ => {
                        game.drawing = true;
                        game.last_x = x;
                        game.last_y = y;
                        game.wand_distance = 0.0;

                        // For MagicWand — start glow
                        if game.tool == PaintTool::MagicWand {
                            if let Some(ref ctx) = game.ctx {
                                ctx.set_shadow_blur(8.0);
                                let hue = game.rainbow_hue;
                                ctx.set_shadow_color(&format!("hsl({hue}, 90%, 65%)"));
                            }
                            synth_audio::dreamy();
                        }
                    }
                }
            });
        });

        // Pointer move
        dom::on_pointer_with_signal(canvas_el.unchecked_ref(), "pointermove", signal, move |event: PointerEvent| {
            let x = event.offset_x() as f64;
            let y = event.offset_y() as f64;
            GAME.with(|g| {
                let mut borrow = g.borrow_mut();
                let Some(game) = borrow.as_mut() else { return };
                if !game.drawing || !game.active { return; }

                let Some(ref ctx) = game.ctx else { return };

                // Velocity-based brush width (slower = thicker)
                let now = js_sys::Date::now();
                let dt = (now - game.last_time).max(1.0);
                let dx = x - game.last_x;
                let dy = y - game.last_y;
                let dist = (dx * dx + dy * dy).sqrt();
                let speed = dist / dt; // px/ms

                match &game.tool {
                    PaintTool::Brush => {
                        let color = if game.color == "rainbow" {
                            game.rainbow_hue = (game.rainbow_hue + 5.0) % 360.0;
                            format!("hsl({}, 80%, 55%)", game.rainbow_hue)
                        } else {
                            game.color.clone()
                        };

                        // Velocity width: base ± 40% based on speed
                        let velocity_factor = (1.3 - speed * 2.0).clamp(0.6, 1.4);
                        let width = game.brush_size * velocity_factor;

                        ctx.set_stroke_style_str(&color);
                        ctx.set_line_width(width);
                        ctx.set_line_cap("round");
                        ctx.set_line_join("round");
                        ctx.set_shadow_blur(0.0);

                        // Quadratic bezier smoothing
                        let mid_x = (game.last_x + x) / 2.0;
                        let mid_y = (game.last_y + y) / 2.0;
                        ctx.begin_path();
                        ctx.move_to(game.last_x, game.last_y);
                        ctx.quadratic_curve_to(game.last_x, game.last_y, mid_x, mid_y);
                        ctx.stroke();
                    }
                    PaintTool::Eraser => {
                        ctx.set_stroke_style_str("white");
                        ctx.set_line_width(game.brush_size * 3.0);
                        ctx.set_line_cap("round");
                        ctx.set_line_join("round");
                        ctx.set_shadow_blur(0.0);
                        ctx.begin_path();
                        ctx.move_to(game.last_x, game.last_y);
                        ctx.line_to(x, y);
                        ctx.stroke();
                    }
                    PaintTool::MagicWand => {
                        game.rainbow_hue = (game.rainbow_hue + 8.0) % 360.0;
                        let hue = game.rainbow_hue;
                        let color = format!("hsl({hue}, 90%, 65%)");

                        // Wide glowing trail (8-12px)
                        ctx.set_stroke_style_str(&color);
                        ctx.set_line_width(10.0);
                        ctx.set_line_cap("round");
                        ctx.set_shadow_blur(8.0);
                        ctx.set_shadow_color(&format!("hsl({hue}, 90%, 70%)"));

                        ctx.begin_path();
                        ctx.move_to(game.last_x, game.last_y);
                        ctx.line_to(x, y);
                        ctx.stroke();

                        // Sparkle particles along trail (every ~40px)
                        game.wand_distance += dist;
                        if game.wand_distance > 40.0 {
                            game.wand_distance -= 40.0;
                            // Emoji sparkle
                            ctx.set_shadow_blur(0.0);
                            let sparkles = ["\u{2728}", "\u{1F31F}", "\u{2B50}", "\u{1F4AB}"];
                            let idx = (js_sys::Math::random() * sparkles.len() as f64) as usize;
                            let emoji = sparkles[idx.min(sparkles.len() - 1)];
                            ctx.set_font("16px serif");
                            ctx.set_text_align("center");
                            ctx.set_text_baseline("middle");
                            let ox = x + (js_sys::Math::random() - 0.5) * 30.0;
                            let oy = y + (js_sys::Math::random() - 0.5) * 30.0;
                            let _ = ctx.fill_text(emoji, ox, oy);
                            ctx.set_shadow_blur(8.0);
                        }

                        // Star stamps every 80px
                        if dist > 0.1 && game.wand_distance > 20.0 && js_sys::Math::random() > 0.6 {
                            ctx.set_shadow_blur(0.0);
                            ctx.set_font("12px serif");
                            ctx.set_text_align("center");
                            ctx.set_text_baseline("middle");
                            let _ = ctx.fill_text("\u{2B50}", x, y);
                            ctx.set_shadow_blur(8.0);
                        }
                    }
                    _ => {} // Fill and Stamp are tap-only
                }

                game.last_x = x;
                game.last_y = y;
                game.last_time = now;
            });
        });

        // Pointer up
        dom::on_with_signal(canvas_el.unchecked_ref(), "pointerup", signal, move |_: Event| {
            GAME.with(|g| {
                let mut borrow = g.borrow_mut();
                let Some(game) = borrow.as_mut() else { return };
                game.drawing = false;
                // Clear shadow for MagicWand
                if let Some(ref ctx) = game.ctx {
                    ctx.set_shadow_blur(0.0);
                    ctx.set_shadow_color("transparent");
                }
            });
        });

        // Pointer leave
        dom::on_with_signal(canvas_el.unchecked_ref(), "pointerleave", signal, move |_: Event| {
            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    game.drawing = false;
                    if let Some(ref ctx) = game.ctx {
                        ctx.set_shadow_blur(0.0);
                    }
                }
            });
        });
    }

    // Toolbar clicks (event delegation on arena)
    if let Some(arena) = dom::query("#game-arena") {
        let s = state.clone();
        dom::on_with_signal(arena.unchecked_ref(), "click", signal, move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };

            // Color swatch
            if let Ok(Some(swatch)) = el.closest("[data-paint-color]") {
                let color = swatch.get_attribute("data-paint-color").unwrap_or_default();
                // Update active class
                for old in dom::query_all(".paint-swatch--active") {
                    let _ = old.class_list().remove_1("paint-swatch--active");
                }
                let _ = swatch.class_list().add_1("paint-swatch--active");
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.color = color;
                        // Switch to brush if was using fill/stamp
                        if game.tool != PaintTool::MagicWand {
                            game.tool = PaintTool::Brush;
                            update_tool_active("brush");
                        }
                    }
                });
                synth_audio::tap();
                return;
            }

            // Brush size
            if let Ok(Some(btn)) = el.closest("[data-paint-size]") {
                let size: f64 = btn.get_attribute("data-paint-size")
                    .and_then(|s| s.parse().ok()).unwrap_or(12.0);
                for old in dom::query_all(".paint-size-btn--active") {
                    let _ = old.class_list().remove_1("paint-size-btn--active");
                }
                let _ = btn.class_list().add_1("paint-size-btn--active");
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.brush_size = size;
                    }
                });
                synth_audio::tap();
                return;
            }

            // Stamp size
            if let Ok(Some(btn)) = el.closest("[data-paint-stamp-size]") {
                let size: f64 = btn.get_attribute("data-paint-stamp-size")
                    .and_then(|s| s.parse().ok()).unwrap_or(40.0);
                for old in dom::query_all(".paint-stamp-size--active") {
                    let _ = old.class_list().remove_1("paint-stamp-size--active");
                }
                let _ = btn.class_list().add_1("paint-stamp-size--active");
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.stamp_size = size;
                    }
                });
                synth_audio::tap();
                return;
            }

            // Stamp selection
            if let Ok(Some(btn)) = el.closest("[data-paint-stamp]") {
                let stamp = btn.get_attribute("data-paint-stamp").unwrap_or_default();
                for old in dom::query_all(".paint-stamp-btn--active") {
                    let _ = old.class_list().remove_1("paint-stamp-btn--active");
                }
                let _ = btn.class_list().add_1("paint-stamp-btn--active");
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Stamp(stamp);
                    }
                });
                update_tool_active("stamp");
                synth_audio::tap();
                return;
            }

            // Tool buttons
            if let Ok(Some(_)) = el.closest("[data-paint-brush]") {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Brush;
                    }
                });
                update_tool_active("brush");
                synth_audio::tap();
                return;
            }
            if let Ok(Some(_)) = el.closest("[data-paint-eraser]") {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Eraser;
                    }
                });
                update_tool_active("eraser");
                synth_audio::tap();
                return;
            }
            if let Ok(Some(_)) = el.closest("[data-paint-wand]") {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::MagicWand;
                    }
                });
                update_tool_active("wand");
                synth_audio::magic_wand();
                return;
            }
            if let Ok(Some(_)) = el.closest("[data-paint-fill]") {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Fill;
                    }
                });
                update_tool_active("fill");
                synth_audio::tap();
                return;
            }
            if let Ok(Some(_)) = el.closest("[data-paint-gradient]") {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Gradient;
                        game.gradient_start_x = None;
                        game.gradient_start_y = None;
                    }
                });
                update_tool_active("gradient");
                synth_audio::rainbow_burst();
                return;
            }

            // Patterns button — toggle overlay
            if let Ok(Some(_)) = el.closest("[data-paint-patterns]") {
                if let Some(overlay) = dom::query("[data-paint-pattern-overlay]") {
                    if overlay.has_attribute("hidden") {
                        let _ = overlay.remove_attribute("hidden");
                        synth_audio::page_turn();
                    } else {
                        let _ = overlay.set_attribute("hidden", "");
                    }
                }
                return;
            }

            // Pattern selection
            if let Ok(Some(btn)) = el.closest("[data-paint-pattern]") {
                let pattern_id = btn.get_attribute("data-paint-pattern").unwrap_or_default();
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.tool = PaintTool::Pattern(pattern_id.clone());
                    }
                });
                update_tool_active("pattern");
                // Hide overlay
                if let Some(overlay) = dom::query("[data-paint-pattern-overlay]") {
                    let _ = overlay.set_attribute("hidden", "");
                }
                synth_audio::sparkle();
                return;
            }

            // Undo
            if let Ok(Some(_)) = el.closest("[data-paint-undo]") {
                undo();
                synth_audio::tap();
                return;
            }

            // Clear
            if let Ok(Some(_)) = el.closest("[data-paint-clear]") {
                clear_canvas();
                synth_audio::whoops();
                return;
            }

            // Templates button — toggle overlay
            if let Ok(Some(_)) = el.closest("[data-paint-templates]") {
                if let Some(overlay) = dom::query("[data-paint-tpl-overlay]") {
                    if overlay.has_attribute("hidden") {
                        let _ = overlay.remove_attribute("hidden");
                        synth_audio::page_turn();
                    } else {
                        let _ = overlay.set_attribute("hidden", "");
                    }
                }
                return;
            }

            // Template selection
            if let Ok(Some(btn)) = el.closest("[data-paint-tpl]") {
                let tpl_id = btn.get_attribute("data-paint-tpl").unwrap_or_default();
                apply_template(&tpl_id);
                // Hide overlay
                if let Some(overlay) = dom::query("[data-paint-tpl-overlay]") {
                    let _ = overlay.set_attribute("hidden", "");
                }
                synth_audio::sparkle();
                return;
            }

            // Done
            if let Ok(Some(_)) = el.closest("[data-paint-done]") {
                finish_painting(s.clone());
            }
        });
    }
}

// ── Tool active state ────────────────────────────────────────────────────

fn update_tool_active(tool: &str) {
    for old in dom::query_all(".paint-tool-btn--active") {
        // Don't remove from Done button
        if old.get_attribute("data-paint-done").is_some() { continue; }
        let _ = old.class_list().remove_1("paint-tool-btn--active");
    }
    let selector = match tool {
        "brush" => "[data-paint-brush]",
        "eraser" => "[data-paint-eraser]",
        "wand" => "[data-paint-wand]",
        "fill" => "[data-paint-fill]",
        "gradient" => "[data-paint-gradient]",
        "pattern" => "[data-paint-patterns]",
        _ => return,
    };
    if let Some(btn) = dom::query(selector) {
        let _ = btn.class_list().add_1("paint-tool-btn--active");
    }
}

// ── Stamp drawing ────────────────────────────────────────────────────────

fn draw_stamp(game: &mut PaintState, x: f64, y: f64, emoji: String) {
    let Some(ref ctx) = game.ctx else { return };

    // Random ±15deg rotation for natural look
    let angle = (js_sys::Math::random() - 0.5) * 0.52; // ~30deg range in radians
    let size = game.stamp_size;

    ctx.save();
    let _ = ctx.translate(x, y);
    let _ = ctx.rotate(angle);
    ctx.set_font(&format!("{size}px serif"));
    ctx.set_text_align("center");
    ctx.set_text_baseline("middle");
    ctx.set_shadow_blur(0.0);
    let _ = ctx.fill_text(&emoji, 0.0, 0.0);
    ctx.restore();
}

// ── Flood fill (scanline) ────────────────────────────────────────────────

fn flood_fill(game: &mut PaintState, css_x: f64, css_y: f64) {
    let Some(ref ctx) = game.ctx else { return };
    let Some(ref canvas) = game.canvas else { return };

    let w = canvas.width() as i32;
    let h = canvas.height() as i32;
    if w == 0 || h == 0 { return; }

    // Convert CSS coords to pixel coords
    let px = (css_x * game.dpr) as i32;
    let py = (css_y * game.dpr) as i32;
    if px < 0 || px >= w || py < 0 || py >= h { return; }

    // Get image data
    let Ok(image_data) = ctx.get_image_data(0.0, 0.0, w as f64, h as f64) else { return };
    let mut data = image_data.data().0;

    let idx = ((py * w + px) * 4) as usize;
    let target_r = data[idx];
    let target_g = data[idx + 1];
    let target_b = data[idx + 2];
    let _target_a = data[idx + 3];

    // Parse fill color
    let (fill_r, fill_g, fill_b) = parse_hex_color(&game.color);

    // Don't fill if target == fill color (with tolerance)
    if color_match(target_r, target_g, target_b, fill_r, fill_g, fill_b, 10) {
        return;
    }

    // Scanline flood fill
    let tolerance = 30u8;
    let mut stack: Vec<(i32, i32)> = vec![(px, py)];

    while let Some((sx, sy)) = stack.pop() {
        if sx < 0 || sx >= w || sy < 0 || sy >= h { continue; }
        let i = ((sy * w + sx) * 4) as usize;
        if i + 3 >= data.len() { continue; }

        if !color_match(data[i], data[i + 1], data[i + 2], target_r, target_g, target_b, tolerance) {
            continue;
        }

        // Fill this pixel
        data[i] = fill_r;
        data[i + 1] = fill_g;
        data[i + 2] = fill_b;
        data[i + 3] = 255;

        // Scanline: expand left and right
        let mut left = sx;
        while left > 0 {
            let li = (((sy) * w + (left - 1)) * 4) as usize;
            if li + 3 >= data.len() { break; }
            if !color_match(data[li], data[li + 1], data[li + 2], target_r, target_g, target_b, tolerance) { break; }
            left -= 1;
            data[li] = fill_r;
            data[li + 1] = fill_g;
            data[li + 2] = fill_b;
            data[li + 3] = 255;
        }

        let mut right = sx;
        while right < w - 1 {
            let ri = (((sy) * w + (right + 1)) * 4) as usize;
            if ri + 3 >= data.len() { break; }
            if !color_match(data[ri], data[ri + 1], data[ri + 2], target_r, target_g, target_b, tolerance) { break; }
            right += 1;
            data[ri] = fill_r;
            data[ri + 1] = fill_g;
            data[ri + 2] = fill_b;
            data[ri + 3] = 255;
        }

        // Push rows above and below the filled span
        for scan_x in left..=right {
            if sy > 0 {
                let ui = (((sy - 1) * w + scan_x) * 4) as usize;
                if ui + 3 < data.len() && color_match(data[ui], data[ui + 1], data[ui + 2], target_r, target_g, target_b, tolerance) {
                    stack.push((scan_x, sy - 1));
                }
            }
            if sy < h - 1 {
                let di = (((sy + 1) * w + scan_x) * 4) as usize;
                if di + 3 < data.len() && color_match(data[di], data[di + 1], data[di + 2], target_r, target_g, target_b, tolerance) {
                    stack.push((scan_x, sy + 1));
                }
            }
        }
    }

    // Write back
    let clamped = wasm_bindgen::Clamped(data.as_slice());
    if let Ok(new_data) = web_sys::ImageData::new_with_u8_clamped_array_and_sh(clamped, w as u32, h as u32) {
        let _ = ctx.put_image_data(&new_data, 0.0, 0.0);
    }
}

fn parse_hex_color(hex: &str) -> (u8, u8, u8) {
    if hex == "rainbow" { return (255, 0, 128); }
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 { return (0, 0, 0); }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
    (r, g, b)
}

fn color_match(r1: u8, g1: u8, b1: u8, r2: u8, g2: u8, b2: u8, tolerance: u8) -> bool {
    let dr = (r1 as i16 - r2 as i16).unsigned_abs() as u8;
    let dg = (g1 as i16 - g2 as i16).unsigned_abs() as u8;
    let db = (b1 as i16 - b2 as i16).unsigned_abs() as u8;
    dr <= tolerance && dg <= tolerance && db <= tolerance
}

// ── Gradient drawing ─────────────────────────────────────────────────────

fn draw_gradient(game: &mut PaintState, start_x: f64, start_y: f64, end_x: f64, end_y: f64) {
    let Some(ref ctx) = game.ctx else { return };

    let color = if game.color == "rainbow" {
        // Rainbow gradient using multiple color stops
        let gradient = ctx.create_linear_gradient(start_x, start_y, end_x, end_y);
        let _ = gradient.add_color_stop(0.0, "rgb(255, 0, 0)");
        let _ = gradient.add_color_stop(0.16, "rgb(255, 127, 0)");
        let _ = gradient.add_color_stop(0.33, "rgb(255, 255, 0)");
        let _ = gradient.add_color_stop(0.5, "rgb(0, 255, 0)");
        let _ = gradient.add_color_stop(0.66, "rgb(0, 0, 255)");
        let _ = gradient.add_color_stop(0.83, "rgb(75, 0, 130)");
        let _ = gradient.add_color_stop(1.0, "rgb(148, 0, 211)");
        gradient
    } else {
        // Single color gradient from dark to light
        let gradient = ctx.create_linear_gradient(start_x, start_y, end_x, end_y);
        let _ = gradient.add_color_stop(0.0, &game.color);
        let (r, g, b) = parse_hex_color(&game.color);
        let light = format!("rgb({}, {}, {})",
            (r as f64 * 1.6).min(255.0) as u8,
            (g as f64 * 1.6).min(255.0) as u8,
            (b as f64 * 1.6).min(255.0) as u8
        );
        let _ = gradient.add_color_stop(1.0, &light);
        gradient
    };

    ctx.set_fill_style_canvas_gradient(&color);
    ctx.fill_rect(0.0, 0.0, game.canvas_w, game.canvas_h);
}

// ── Pattern fill ─────────────────────────────────────────────────────────

fn flood_fill_pattern(game: &mut PaintState, css_x: f64, css_y: f64, pattern_type: &str) {
    let Some(ref ctx) = game.ctx else { return };
    let Some(ref canvas) = game.canvas else { return };

    let w = canvas.width() as i32;
    let h = canvas.height() as i32;
    if w == 0 || h == 0 { return; }

    // Convert CSS coords to pixel coords
    let px = (css_x * game.dpr) as i32;
    let py = (css_y * game.dpr) as i32;
    if px < 0 || px >= w || py < 0 || py >= h { return; }

    // Get image data
    let Ok(image_data) = ctx.get_image_data(0.0, 0.0, w as f64, h as f64) else { return };
    let mut data = image_data.data().0;

    let idx = ((py * w + px) * 4) as usize;
    let target_r = data[idx];
    let target_g = data[idx + 1];
    let target_b = data[idx + 2];

    let (fill_r, fill_g, fill_b) = parse_hex_color(&game.color);

    // Don't fill if target == fill color
    if color_match(target_r, target_g, target_b, fill_r, fill_g, fill_b, 10) {
        return;
    }

    // Scanline flood fill with pattern
    let tolerance = 30u8;
    let mut stack: Vec<(i32, i32)> = vec![(px, py)];
    let pattern_size = 12; // pattern grid size

    while let Some((sx, sy)) = stack.pop() {
        if sx < 0 || sx >= w || sy < 0 || sy >= h { continue; }
        let i = ((sy * w + sx) * 4) as usize;
        if i + 3 >= data.len() { continue; }

        if !color_match(data[i], data[i + 1], data[i + 2], target_r, target_g, target_b, tolerance) {
            continue;
        }

        // Determine if this pixel should be filled based on pattern
        let should_fill = match pattern_type {
            "dots" => {
                let dx = sx % pattern_size;
                let dy = sy % pattern_size;
                dx == 0 && dy == 0
            }
            "stripes" => {
                (sx / pattern_size) % 2 == 0
            }
            "checkerboard" => {
                ((sx / pattern_size) + (sy / pattern_size)) % 2 == 0
            }
            "waves" => {
                let wave = ((sx as f64 / 10.0).sin() * 3.0) as i32;
                (sy + wave) % pattern_size < pattern_size / 2
            }
            "diamonds" => {
                let dx = (sx % pattern_size) - pattern_size / 2;
                let dy = (sy % pattern_size) - pattern_size / 2;
                dx.abs() + dy.abs() < pattern_size / 3
            }
            "hearts" => {
                let dx = sx % (pattern_size * 2);
                let dy = sy % (pattern_size * 2);
                let mid = pattern_size;
                // Simple heart shape
                (dx - mid).pow(2) + (dy - mid / 2).pow(2) < (pattern_size / 2).pow(2)
            }
            "clouds" => {
                let cx = sx % 80;
                let cy = sy % 60;
                let dist = ((cx - 40) * (cx - 40) + (cy - 30) * (cy - 30)) as f64;
                dist < 400.0 || (((cx - 55) * (cx - 55) + (cy - 25) * (cy - 25)) as f64) < 225.0
            }
            "polkadots" => {
                let cx = sx % 40;
                let cy = sy % 40;
                let dist = ((cx - 20) * (cx - 20) + (cy - 20) * (cy - 20)) as f64;
                dist < 64.0
            }
            "zigzag" => {
                let phase = sx % 20;
                let expected_y = if phase < 10 { phase * 15 / 10 } else { (20 - phase) * 15 / 10 };
                let actual_y = sy % 30;
                (actual_y - expected_y).abs() < 3
            }
            _ => true, // solid fill as fallback
        };

        if should_fill {
            data[i] = fill_r;
            data[i + 1] = fill_g;
            data[i + 2] = fill_b;
            data[i + 3] = 255;
        } else {
            // Mark as white for unfilled pattern areas
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
        }

        // Scanline: expand left and right
        let mut left = sx;
        while left > 0 {
            let li = (((sy) * w + (left - 1)) * 4) as usize;
            if li + 3 >= data.len() { break; }
            if !color_match(data[li], data[li + 1], data[li + 2], target_r, target_g, target_b, tolerance) { break; }
            left -= 1;

            let lx = left;
            let ly = sy;
            let should_fill_left = match pattern_type {
                "dots" => (lx % pattern_size == 0) && (ly % pattern_size == 0),
                "stripes" => (lx / pattern_size) % 2 == 0,
                "checkerboard" => ((lx / pattern_size) + (ly / pattern_size)) % 2 == 0,
                "waves" => {
                    let wave = ((lx as f64 / 10.0).sin() * 3.0) as i32;
                    (ly + wave) % pattern_size < pattern_size / 2
                }
                "diamonds" => {
                    let dx = (lx % pattern_size) - pattern_size / 2;
                    let dy = (ly % pattern_size) - pattern_size / 2;
                    dx.abs() + dy.abs() < pattern_size / 3
                }
                "hearts" => {
                    let dx = lx % (pattern_size * 2);
                    let dy = ly % (pattern_size * 2);
                    let mid = pattern_size;
                    (dx - mid).pow(2) + (dy - mid / 2).pow(2) < (pattern_size / 2).pow(2)
                }
                "clouds" => {
                    let cx = lx % 80;
                    let cy = ly % 60;
                    let dist = ((cx - 40) * (cx - 40) + (cy - 30) * (cy - 30)) as f64;
                    dist < 400.0 || (((cx - 55) * (cx - 55) + (cy - 25) * (cy - 25)) as f64) < 225.0
                }
                "polkadots" => {
                    let cx = lx % 40;
                    let cy = ly % 40;
                    let dist = ((cx - 20) * (cx - 20) + (cy - 20) * (cy - 20)) as f64;
                    dist < 64.0
                }
                "zigzag" => {
                    let phase = lx % 20;
                    let expected_y = if phase < 10 { phase * 15 / 10 } else { (20 - phase) * 15 / 10 };
                    let actual_y = ly % 30;
                    (actual_y - expected_y).abs() < 3
                }
                _ => true,
            };

            if should_fill_left {
                data[li] = fill_r;
                data[li + 1] = fill_g;
                data[li + 2] = fill_b;
                data[li + 3] = 255;
            } else {
                data[li] = 255;
                data[li + 1] = 255;
                data[li + 2] = 255;
                data[li + 3] = 255;
            }
        }

        let mut right = sx;
        while right < w - 1 {
            let ri = (((sy) * w + (right + 1)) * 4) as usize;
            if ri + 3 >= data.len() { break; }
            if !color_match(data[ri], data[ri + 1], data[ri + 2], target_r, target_g, target_b, tolerance) { break; }
            right += 1;

            let rx = right;
            let ry = sy;
            let should_fill_right = match pattern_type {
                "dots" => (rx % pattern_size == 0) && (ry % pattern_size == 0),
                "stripes" => (rx / pattern_size) % 2 == 0,
                "checkerboard" => ((rx / pattern_size) + (ry / pattern_size)) % 2 == 0,
                "waves" => {
                    let wave = ((rx as f64 / 10.0).sin() * 3.0) as i32;
                    (ry + wave) % pattern_size < pattern_size / 2
                }
                "diamonds" => {
                    let dx = (rx % pattern_size) - pattern_size / 2;
                    let dy = (ry % pattern_size) - pattern_size / 2;
                    dx.abs() + dy.abs() < pattern_size / 3
                }
                "hearts" => {
                    let dx = rx % (pattern_size * 2);
                    let dy = ry % (pattern_size * 2);
                    let mid = pattern_size;
                    (dx - mid).pow(2) + (dy - mid / 2).pow(2) < (pattern_size / 2).pow(2)
                }
                "clouds" => {
                    let cx = rx % 80;
                    let cy = ry % 60;
                    let dist = ((cx - 40) * (cx - 40) + (cy - 30) * (cy - 30)) as f64;
                    dist < 400.0 || (((cx - 55) * (cx - 55) + (cy - 25) * (cy - 25)) as f64) < 225.0
                }
                "polkadots" => {
                    let cx = rx % 40;
                    let cy = ry % 40;
                    let dist = ((cx - 20) * (cx - 20) + (cy - 20) * (cy - 20)) as f64;
                    dist < 64.0
                }
                "zigzag" => {
                    let phase = rx % 20;
                    let expected_y = if phase < 10 { phase * 15 / 10 } else { (20 - phase) * 15 / 10 };
                    let actual_y = ry % 30;
                    (actual_y - expected_y).abs() < 3
                }
                _ => true,
            };

            if should_fill_right {
                data[ri] = fill_r;
                data[ri + 1] = fill_g;
                data[ri + 2] = fill_b;
                data[ri + 3] = 255;
            } else {
                data[ri] = 255;
                data[ri + 1] = 255;
                data[ri + 2] = 255;
                data[ri + 3] = 255;
            }
        }

        // Push rows above and below the filled span
        for scan_x in left..=right {
            if sy > 0 {
                let ui = (((sy - 1) * w + scan_x) * 4) as usize;
                if ui + 3 < data.len() && color_match(data[ui], data[ui + 1], data[ui + 2], target_r, target_g, target_b, tolerance) {
                    stack.push((scan_x, sy - 1));
                }
            }
            if sy < h - 1 {
                let di = (((sy + 1) * w + scan_x) * 4) as usize;
                if di + 3 < data.len() && color_match(data[di], data[di + 1], data[di + 2], target_r, target_g, target_b, tolerance) {
                    stack.push((scan_x, sy + 1));
                }
            }
        }
    }

    // Write back
    let clamped = wasm_bindgen::Clamped(data.as_slice());
    if let Ok(new_data) = web_sys::ImageData::new_with_u8_clamped_array_and_sh(clamped, w as u32, h as u32) {
        let _ = ctx.put_image_data(&new_data, 0.0, 0.0);
    }
}

// ── Templates ────────────────────────────────────────────────────────────

fn apply_template(id: &str) {
    GAME.with(|g| {
        let borrow = g.borrow();
        let Some(game) = borrow.as_ref() else { return };
        let Some(ref ctx) = game.ctx else { return };
        let w = game.canvas_w;
        let h = game.canvas_h;

        // Clear to white
        ctx.set_fill_style_str("white");
        ctx.fill_rect(0.0, 0.0, w, h);

        if id == "free" { return; }

        // Draw template outlines in light gray
        ctx.set_stroke_style_str("#E0E0E0");
        ctx.set_line_width(2.5);
        ctx.set_line_cap("round");
        ctx.set_line_join("round");
        ctx.set_shadow_blur(0.0);

        let cx = w / 2.0;
        let cy = h / 2.0;
        let scale = (w.min(h) / 400.0).max(0.5); // scale templates to canvas

        match id {
            "heart" => draw_template_heart(ctx, cx, cy, scale),
            "star" => draw_template_star(ctx, cx, cy, scale),
            "unicorn" => draw_template_unicorn(ctx, cx, cy, scale),
            "rainbow" => draw_template_rainbow(ctx, cx, cy, w, scale),
            "flower" => draw_template_flower(ctx, cx, cy, scale),
            "castle" => draw_template_castle(ctx, cx, cy, scale),
            "butterfly" => draw_template_butterfly(ctx, cx, cy, scale),
            "dinosaur" => draw_template_dinosaur(ctx, cx, cy, scale),
            _ => {}
        }
    });

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active_template = id.to_string();
        }
    });
}

fn draw_template_heart(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    ctx.begin_path();
    let size = 120.0 * s;
    ctx.move_to(cx, cy + size * 0.7);
    // Left curve
    ctx.bezier_curve_to(
        cx - size * 1.2, cy - size * 0.2,
        cx - size * 0.6, cy - size * 0.9,
        cx, cy - size * 0.4,
    );
    // Right curve
    ctx.bezier_curve_to(
        cx + size * 0.6, cy - size * 0.9,
        cx + size * 1.2, cy - size * 0.2,
        cx, cy + size * 0.7,
    );
    ctx.stroke();
}

fn draw_template_star(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    let outer = 120.0 * s;
    let inner = 50.0 * s;
    let points = 5;
    ctx.begin_path();
    for i in 0..(points * 2) {
        let angle = (i as f64) * std::f64::consts::PI / points as f64 - std::f64::consts::FRAC_PI_2;
        let r = if i % 2 == 0 { outer } else { inner };
        let px = cx + r * angle.cos();
        let py = cy + r * angle.sin();
        if i == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
    }
    ctx.close_path();
    ctx.stroke();
}

fn draw_template_unicorn(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    // Simple unicorn head silhouette profile (facing right)
    let r = 80.0 * s;
    // Head circle
    ctx.begin_path();
    let _ = ctx.arc(cx, cy, r, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Horn (triangle above head)
    ctx.begin_path();
    ctx.move_to(cx + r * 0.3, cy - r * 0.8);
    ctx.line_to(cx + r * 0.15, cy - r * 1.6);
    ctx.line_to(cx - r * 0.1, cy - r * 0.85);
    ctx.stroke();
    // Eye
    ctx.begin_path();
    let _ = ctx.arc(cx + r * 0.3, cy - r * 0.15, r * 0.08, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Ear
    ctx.begin_path();
    ctx.move_to(cx - r * 0.3, cy - r * 0.7);
    ctx.line_to(cx - r * 0.5, cy - r * 1.1);
    ctx.line_to(cx - r * 0.1, cy - r * 0.85);
    ctx.stroke();
    // Mane (wavy lines down the back)
    ctx.begin_path();
    ctx.move_to(cx - r * 0.7, cy - r * 0.5);
    ctx.bezier_curve_to(cx - r * 1.1, cy, cx - r * 0.9, cy + r * 0.5, cx - r * 0.6, cy + r * 0.8);
    ctx.stroke();
}

fn draw_template_rainbow(ctx: &CanvasRenderingContext2d, _cx: f64, cy: f64, w: f64, s: f64) {
    let base_y = cy + 60.0 * s;
    let start_r = 140.0 * s;
    let band_width = 18.0 * s;
    let cx = w / 2.0;
    // 6 arc bands
    for i in 0..6 {
        let r = start_r - (i as f64) * band_width;
        if r < 10.0 { break; }
        ctx.begin_path();
        let _ = ctx.arc(cx, base_y, r, std::f64::consts::PI, 0.0);
        ctx.stroke();
    }
    // Ground line
    ctx.begin_path();
    ctx.move_to(cx - start_r - 10.0, base_y);
    ctx.line_to(cx + start_r + 10.0, base_y);
    ctx.stroke();
}

fn draw_template_flower(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    let petal_r = 40.0 * s;
    let center_r = 25.0 * s;
    // 6 petal circles
    for i in 0..6 {
        let angle = (i as f64) * std::f64::consts::TAU / 6.0;
        let px = cx + (center_r + petal_r * 0.5) * angle.cos();
        let py = (cy - 30.0 * s) + (center_r + petal_r * 0.5) * angle.sin();
        ctx.begin_path();
        let _ = ctx.arc(px, py, petal_r, 0.0, std::f64::consts::TAU);
        ctx.stroke();
    }
    // Center circle
    ctx.begin_path();
    let _ = ctx.arc(cx, cy - 30.0 * s, center_r, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Stem
    ctx.begin_path();
    ctx.move_to(cx, cy - 30.0 * s + center_r + petal_r);
    ctx.bezier_curve_to(
        cx - 10.0 * s, cy + 60.0 * s,
        cx + 10.0 * s, cy + 80.0 * s,
        cx, cy + 120.0 * s,
    );
    ctx.stroke();
    // Leaf
    ctx.begin_path();
    ctx.move_to(cx, cy + 50.0 * s);
    ctx.bezier_curve_to(
        cx + 30.0 * s, cy + 30.0 * s,
        cx + 50.0 * s, cy + 50.0 * s,
        cx + 30.0 * s, cy + 60.0 * s,
    );
    ctx.stroke();
}

fn draw_template_castle(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    // Main wall
    ctx.begin_path();
    ctx.move_to(cx - 80.0 * s, cy + 80.0 * s);
    ctx.line_to(cx - 80.0 * s, cy - 20.0 * s);
    ctx.line_to(cx + 80.0 * s, cy - 20.0 * s);
    ctx.line_to(cx + 80.0 * s, cy + 80.0 * s);
    ctx.stroke();
    // Left tower
    ctx.begin_path();
    ctx.move_to(cx - 80.0 * s, cy - 20.0 * s);
    ctx.line_to(cx - 80.0 * s, cy - 80.0 * s);
    ctx.line_to(cx - 50.0 * s, cy - 80.0 * s);
    ctx.line_to(cx - 50.0 * s, cy - 20.0 * s);
    ctx.stroke();
    // Right tower
    ctx.begin_path();
    ctx.move_to(cx + 50.0 * s, cy - 20.0 * s);
    ctx.line_to(cx + 50.0 * s, cy - 80.0 * s);
    ctx.line_to(cx + 80.0 * s, cy - 80.0 * s);
    ctx.line_to(cx + 80.0 * s, cy - 20.0 * s);
    ctx.stroke();
    // Door arch
    ctx.begin_path();
    let _ = ctx.arc(cx, cy + 80.0 * s, 25.0 * s, std::f64::consts::PI, 0.0);
    ctx.stroke();
    // Flag on left tower
    ctx.begin_path();
    ctx.move_to(cx - 65.0 * s, cy - 80.0 * s);
    ctx.line_to(cx - 65.0 * s, cy - 110.0 * s);
    ctx.line_to(cx - 45.0 * s, cy - 100.0 * s);
    ctx.line_to(cx - 65.0 * s, cy - 90.0 * s);
    ctx.stroke();
}

fn draw_template_butterfly(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    // Body (vertical line)
    ctx.begin_path();
    ctx.move_to(cx, cy - 60.0 * s);
    ctx.line_to(cx, cy + 60.0 * s);
    ctx.stroke();
    // Left upper wing
    ctx.begin_path();
    ctx.move_to(cx, cy - 20.0 * s);
    ctx.bezier_curve_to(
        cx - 90.0 * s, cy - 80.0 * s,
        cx - 100.0 * s, cy - 10.0 * s,
        cx, cy + 10.0 * s,
    );
    ctx.stroke();
    // Right upper wing
    ctx.begin_path();
    ctx.move_to(cx, cy - 20.0 * s);
    ctx.bezier_curve_to(
        cx + 90.0 * s, cy - 80.0 * s,
        cx + 100.0 * s, cy - 10.0 * s,
        cx, cy + 10.0 * s,
    );
    ctx.stroke();
    // Left lower wing
    ctx.begin_path();
    ctx.move_to(cx, cy + 10.0 * s);
    ctx.bezier_curve_to(
        cx - 70.0 * s, cy + 20.0 * s,
        cx - 60.0 * s, cy + 70.0 * s,
        cx, cy + 50.0 * s,
    );
    ctx.stroke();
    // Right lower wing
    ctx.begin_path();
    ctx.move_to(cx, cy + 10.0 * s);
    ctx.bezier_curve_to(
        cx + 70.0 * s, cy + 20.0 * s,
        cx + 60.0 * s, cy + 70.0 * s,
        cx, cy + 50.0 * s,
    );
    ctx.stroke();
    // Antennae
    ctx.begin_path();
    ctx.move_to(cx, cy - 60.0 * s);
    ctx.line_to(cx - 20.0 * s, cy - 90.0 * s);
    ctx.stroke();
    ctx.begin_path();
    ctx.move_to(cx, cy - 60.0 * s);
    ctx.line_to(cx + 20.0 * s, cy - 90.0 * s);
    ctx.stroke();
}

fn draw_template_dinosaur(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    // Body (big oval)
    ctx.begin_path();
    let _ = ctx.ellipse(cx, cy + 10.0 * s, 70.0 * s, 50.0 * s, 0.0, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Head (smaller circle)
    ctx.begin_path();
    let _ = ctx.arc(cx + 80.0 * s, cy - 40.0 * s, 30.0 * s, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Neck
    ctx.begin_path();
    ctx.move_to(cx + 50.0 * s, cy - 20.0 * s);
    ctx.line_to(cx + 60.0 * s, cy - 30.0 * s);
    ctx.stroke();
    // Tail
    ctx.begin_path();
    ctx.move_to(cx - 70.0 * s, cy + 10.0 * s);
    ctx.bezier_curve_to(
        cx - 100.0 * s, cy - 10.0 * s,
        cx - 120.0 * s, cy + 20.0 * s,
        cx - 110.0 * s, cy + 40.0 * s,
    );
    ctx.stroke();
    // Legs (two simple lines)
    ctx.begin_path();
    ctx.move_to(cx - 30.0 * s, cy + 55.0 * s);
    ctx.line_to(cx - 30.0 * s, cy + 90.0 * s);
    ctx.stroke();
    ctx.begin_path();
    ctx.move_to(cx + 30.0 * s, cy + 55.0 * s);
    ctx.line_to(cx + 30.0 * s, cy + 90.0 * s);
    ctx.stroke();
    // Eye
    ctx.begin_path();
    let _ = ctx.arc(cx + 88.0 * s, cy - 45.0 * s, 4.0 * s, 0.0, std::f64::consts::TAU);
    ctx.stroke();
    // Spikes on back
    ctx.begin_path();
    ctx.move_to(cx - 30.0 * s, cy - 35.0 * s);
    ctx.line_to(cx - 20.0 * s, cy - 55.0 * s);
    ctx.line_to(cx - 5.0 * s, cy - 35.0 * s);
    ctx.line_to(cx + 10.0 * s, cy - 55.0 * s);
    ctx.line_to(cx + 25.0 * s, cy - 35.0 * s);
    ctx.stroke();
}

// ── Undo ─────────────────────────────────────────────────────────────────

fn save_undo(game: &mut PaintState) {
    if game.undo_stack.len() >= theme::PAINT_MAX_UNDO {
        game.undo_stack.remove(0);
    }
    if let Some(ref canvas) = game.canvas {
        if let Ok(data_url) = canvas.to_data_url() {
            game.undo_stack.push(data_url.into_bytes());
        }
    }
}

fn undo() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        let Some(data_bytes) = game.undo_stack.pop() else { return };
        let Ok(data_url) = String::from_utf8(data_bytes) else { return };
        let Some(ctx) = game.ctx.as_ref() else { return };
        let _canvas = game.canvas.as_ref();

        let doc = dom::document();
        let Ok(img) = doc.create_element("img") else {
            web_sys::console::error_1(&"Failed to create img element for sticker".into());
            return;
        };
        let _ = img.set_attribute("src", &data_url);

        let ctx_clone = ctx.clone();
        let w = game.canvas_w;
        let h = game.canvas_h;
        let dpr = game.dpr;

        dom::set_timeout_once(50, move || {
            let html_img: web_sys::HtmlImageElement = img.unchecked_into();
            // Reset transform, draw, re-scale
            let _ = ctx_clone.set_transform(1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
            ctx_clone.clear_rect(0.0, 0.0, w * dpr, h * dpr);
            let _ = ctx_clone.draw_image_with_html_image_element(&html_img, 0.0, 0.0);
            let _ = ctx_clone.scale(dpr, dpr);
        });
    });
}

fn clear_canvas() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        // Save before clear for undo
        save_undo(game);
        if let Some(ref ctx) = game.ctx {
            ctx.set_fill_style_str("white");
            ctx.fill_rect(0.0, 0.0, game.canvas_w, game.canvas_h);
        }
        // Re-apply template if one was active
        let tpl = game.active_template.clone();
        drop(borrow);
        if tpl != "free" {
            apply_template(&tpl);
        }
    });
}

// ── Finish painting ──────────────────────────────────────────────────────

fn finish_painting(state: Rc<RefCell<AppState>>) {
    let hearts = theme::HEARTS_PER_PAINTING;
    let paintings_today;
    {
        let mut s = state.borrow_mut();
        s.hearts_total += hearts;
        s.hearts_today += hearts;
        s.games_played_today += 1;
        s.paintings_today += 1;
        paintings_today = s.paintings_today;
    }
    let total = state.borrow().hearts_total;
    ui::update_heart_counter(total);

    weekly_goals::increment_progress("games", 1);
    weekly_goals::increment_progress("hearts", hearts);

    // Save score
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        "paint-save",
        "INSERT INTO game_scores (id, game_id, score, level, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![id, "paint".into(), paintings_today.to_string(), "1".into(), "0".into(), now.to_string(), day_key],
    );

    // "Masterpiece!" celebration
    synth_audio::fanfare();
    native_apis::vibrate_success();
    confetti::burst_stars();
    speech::celebrate("Beautiful painting!");

    // Golden frame flash on canvas
    if let Some(canvas) = dom::query("[data-paint-canvas]") {
        let _ = canvas.class_list().add_1("paint-canvas--masterpiece");
    }

    // Delayed second wave
    let s2 = state.clone();
    dom::set_timeout_once(1500, move || {
        confetti::burst_party();
        synth_audio::rainbow_burst();
        show_paint_end(s2);
    });
}

// ── End screen ───────────────────────────────────────────────────────────

fn show_paint_end(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let screen = render::create_el_with_class(&doc, "div", "game-end-screen");

    let title = render::create_el_with_class(&doc, "div", "game-end-title");
    title.set_text_content(Some("\u{1F3A8} Masterpiece! \u{1F3A8}"));

    let stats = render::create_el_with_class(&doc, "div", "game-end-stats");

    let hearts_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--hearts");
    hearts_line.set_text_content(Some(&format!("\u{1F49C} +{} hearts earned!", theme::HEARTS_PER_PAINTING)));
    let _ = stats.append_child(&hearts_line);

    let paintings = state.borrow().paintings_today;
    let count_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    count_line.set_text_content(Some(&format!("\u{1F5BC} Painting #{paintings} today!")));
    let _ = stats.append_child(&count_line);

    // Sparkle encouragement
    let sparkle_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--sparkle");
    let msg = match paintings {
        1 => "\u{2728} Sparkle loves your first painting!",
        2..=3 => "\u{1F31F} You're on a creative roll!",
        4..=6 => "\u{1F308} What an artist you are!",
        _ => "\u{1F3A8} Painting superstar!",
    };
    sparkle_line.set_text_content(Some(msg));
    let _ = stats.append_child(&sparkle_line);

    let buttons = render::create_el_with_class(&doc, "div", "game-end-buttons");
    let again_btn = render::create_button(&doc, "game-end-btn game-end-btn--again", "\u{1F504} Paint Again");
    let _ = again_btn.set_attribute("data-game-again", "paint");
    let back_btn = render::create_button(&doc, "game-end-btn game-end-btn--back", "\u{2190} Back to Games");
    let _ = back_btn.set_attribute("data-game-back", "");
    let _ = buttons.append_child(&again_btn);
    let _ = buttons.append_child(&back_btn);

    let _ = screen.append_child(&title);
    let _ = screen.append_child(&stats);
    let _ = screen.append_child(&buttons);
    let _ = arena.append_child(&screen);

    // Bind end-screen buttons
    let end_signal = GAME.with(|g| {
        g.borrow().as_ref().map(|game| game.abort.signal())
    });
    let s = state.clone();
    games::bind_end_buttons(
        end_signal.as_ref(),
        move || { cleanup(); show_category_picker(s.clone()); },
        || { cleanup(); games::return_to_menu(); },
    );
}

// ── Cleanup ──────────────────────────────────────────────────────────────

pub fn cleanup() {
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            game.drawing = false;
        }
        *g.borrow_mut() = None;
    });
}
