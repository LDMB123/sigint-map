use crate::{
    browser_apis, confetti, dom, games, native_apis, render, speech, state::AppState, synth_audio,
    theme, ui, weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use web_sys::{CanvasRenderingContext2d, Event, HtmlCanvasElement, PointerEvent};
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
const BRUSHES: &[(&str, f64)] = &[("\u{25CF}", 4.0), ("\u{2B24}", 12.0), ("\u{2588}", 24.0)];
const STAMPS: &[&str] = &[
    "\u{1F496}",
    "\u{2B50}",
    "\u{1F984}",
    "\u{1F33A}",
    "\u{1F308}",
    "\u{1F98B}",
    "\u{1F451}",
    "\u{1F48E}",
    "\u{1F42C}",
    "\u{1F409}",
    "\u{1F319}",
    "\u{2601}",
    "\u{1F525}",
    "\u{1F52E}",
    "\u{1F48B}",
    "\u{1F31E}",
    "\u{26A1}",
    "\u{1F490}",
    "\u{1F3F0}",
    "\u{1F995}",
    "\u{1F697}",
    "\u{1F680}",
    "\u{1F339}",
    "\u{1F47B}",
];
const STAMP_SIZES: &[(&str, f64)] = &[("S", 24.0), ("M", 40.0), ("L", 64.0)];
const PAINT_CATEGORIES: &[(&str, &str, &str)] = &[
    ("free", "\u{1F58C}", "Free Draw"),
    ("animals", "\u{1F98B}", "Animals"),
    ("fantasy", "\u{1F3F0}", "Fantasy"),
    ("food", "\u{1F355}", "Food"),
    ("space", "\u{1F680}", "Space"),
];
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
#[derive(Clone, PartialEq)]
enum PaintTool {
    Brush,
    Eraser,
    Stamp(String),
    MagicWand,
    Fill,
    Gradient,
    Pattern(String),
}
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
    wand_distance: f64,
    gradient_start_x: Option<f64>,
    gradient_start_y: Option<f64>,
    active: bool,
    active_template: String,
    abort: browser_apis::AbortHandle,
}
thread_local! {
    static GAME: RefCell<Option<PaintState>> = const { RefCell::new(None) };
    static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) };
}
pub fn start(state: Rc<RefCell<AppState>>) {
    show_category_picker(state);
}
fn show_category_picker(state: Rc<RefCell<AppState>>) {
    let Some((arena, buttons)) = render::build_game_picker("\u{1F3A8} What Do You Want to Paint?")
    else {
        return;
    };
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let signal = abort.signal();
    let doc = dom::document();
    for &(id, emoji, label) in PAINT_CATEGORIES {
        dom::with_buf(|buf| {
            let _ = write!(buf, "{emoji} {label}");
            let Some(btn) = render::create_button(&doc, "game-card game-card--paint", buf) else {
                return;
            };
            dom::set_attr(&btn, "data-paint-category", id);
            let _ = buttons.append_child(&btn);
        });
    }
    let state_click = state;
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        &signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if dom::closest(&el, "[data-paint-category]").is_some() {
                synth_audio::sparkle();
                native_apis::vibrate_tap();
                start_painting(state_click.clone());
            }
        },
    );
    PICKER_ABORT.with(|p| {
        *p.borrow_mut() = Some(abort);
    });
}
fn start_painting(state: Rc<RefCell<AppState>>) {
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    let Some(container) = render::create_el_with_class(&doc, "div", "paint-container") else {
        return;
    };
    let arena_rect = arena.get_bounding_client_rect();
    let toolbar_height = 130.0;
    let css_w = arena_rect.width().max(f64::from(theme::PAINT_MIN_CANVAS));
    let css_h = (arena_rect.height() - toolbar_height).max(f64::from(theme::PAINT_MIN_CANVAS));
    let dpr = dom::window().device_pixel_ratio().max(1.0);
    let pixel_w = (css_w * dpr) as u32;
    let pixel_h = (css_h * dpr) as u32;
    let Some(canvas_el) = games::create_canvas_or_bail(&doc, "paint") else {
        return;
    };
    dom::set_attr(&canvas_el, "class", "paint-canvas paint-canvas--responsive");
    dom::set_attr(&canvas_el, "data-paint-canvas", "");
    dom::with_buf(|buf| {
        let _ = write!(buf, "{pixel_w}");
        dom::set_attr(&canvas_el, "width", buf);
        buf.clear();
        let _ = write!(buf, "{pixel_h}");
        dom::set_attr(&canvas_el, "height", buf);
        buf.clear();
        let _ = write!(
            buf,
            "width:{}px;height:{}px;touch-action:none",
            css_w as u32, css_h as u32
        );
        dom::set_attr(&canvas_el, "style", buf);
    });
    let Some(toolbar) = render::create_el_with_class(&doc, "div", "paint-toolbar") else {
        return;
    };
    let Some(palette) = render::create_el_with_class(&doc, "div", "paint-palette") else {
        return;
    };
    for &(name, hex) in COLORS {
        let Some(swatch) = render::create_el_with_class(&doc, "button", "paint-swatch") else {
            continue;
        };
        for (k, v) in [
            ("type", "button"),
            ("data-paint-color", hex),
            ("aria-label", name),
        ] {
            dom::set_attr(&swatch, k, v);
        }
        if hex == "rainbow" {
            dom::set_attr(
                &swatch,
                "style",
                "background: linear-gradient(135deg, red, orange, yellow, green, blue, purple)",
            );
        } else {
            dom::with_buf(|buf| {
                let _ = write!(buf, "background: {hex}");
                dom::set_attr(&swatch, "style", buf);
            });
        }
        if hex == "#FF4444" {
            let _ = swatch.class_list().add_1("paint-swatch--active");
        }
        let _ = palette.append_child(&swatch);
    }
    let Some(sizes_row) = render::create_el_with_class(&doc, "div", "paint-sizes") else {
        return;
    };
    render::append_text(&doc, &sizes_row, "span", "paint-section-label", "Brush:");
    for (i, &(label, radius)) in BRUSHES.iter().enumerate() {
        let Some(btn) = render::create_button(&doc, "paint-size-btn", label) else {
            continue;
        };
        dom::set_attr(&btn, "data-paint-size", &radius.to_string());
        if i == 1 {
            let _ = btn.class_list().add_1("paint-size-btn--active");
        }
        let _ = sizes_row.append_child(&btn);
    }
    render::append_text(&doc, &sizes_row, "span", "paint-section-label", "Stamp:");
    for (i, &(label, size)) in STAMP_SIZES.iter().enumerate() {
        let Some(btn) = render::create_button(&doc, "paint-stamp-size", label) else {
            continue;
        };
        dom::set_attr(&btn, "data-paint-stamp-size", &size.to_string());
        if i == 1 {
            let _ = btn.class_list().add_1("paint-stamp-size--active");
        }
        let _ = sizes_row.append_child(&btn);
    }
    let Some(stamps_el) = render::create_el_with_class(&doc, "div", "paint-stamps") else {
        return;
    };
    for &stamp in STAMPS {
        let Some(btn) = render::create_button(&doc, "paint-stamp-btn", stamp) else {
            continue;
        };
        dom::set_attr(&btn, "data-paint-stamp", stamp);
        let _ = stamps_el.append_child(&btn);
    }
    let Some(tools) = render::create_el_with_class(&doc, "div", "paint-tools") else {
        return;
    };
    const TOOL_BUTTONS: &[(&str, &str, &str)] = &[
        (
            "paint-tool-btn paint-tool-btn--active",
            "\u{1F58C} Brush",
            "data-paint-brush",
        ),
        ("paint-tool-btn", "\u{1F6AB} Eraser", "data-paint-eraser"),
        ("paint-tool-btn", "\u{2728} Magic", "data-paint-wand"),
        ("paint-tool-btn", "\u{1FAA3} Fill", "data-paint-fill"),
        (
            "paint-tool-btn",
            "\u{1F308} Gradient",
            "data-paint-gradient",
        ),
        ("paint-tool-btn", "\u{25A6} Patterns", "data-paint-patterns"),
        ("paint-tool-btn", "\u{21A9} Undo", "data-paint-undo"),
        ("paint-tool-btn", "\u{1F5D1} Clear", "data-paint-clear"),
        (
            "paint-tool-btn",
            "\u{1F4D0} Templates",
            "data-paint-templates",
        ),
        (
            "paint-tool-btn paint-tool-btn--done",
            "\u{2705} Done!",
            "data-paint-done",
        ),
    ];
    for &(class, label, attr) in TOOL_BUTTONS {
        let Some(btn) = render::create_button(&doc, class, label) else {
            continue;
        };
        dom::set_attr(&btn, attr, "");
        let _ = tools.append_child(&btn);
    }
    for child in [&palette, &sizes_row, &stamps_el, &tools] {
        let _ = toolbar.append_child(child);
    }
    let Some(tpl_overlay) = render::create_el_with_data(
        &doc,
        "div",
        "paint-template-picker",
        "data-paint-tpl-overlay",
    ) else {
        return;
    };
    dom::set_attr(&tpl_overlay, "hidden", "");
    render::append_text(
        &doc,
        &tpl_overlay,
        "div",
        "paint-template-picker-title",
        "\u{1F3A8} Choose a Template!",
    );
    let Some(tpl_grid) = render::create_el_with_class(&doc, "div", "paint-template-grid") else {
        return;
    };
    for &(id, label) in TEMPLATES {
        let Some(btn) = render::create_button(&doc, "paint-template-btn", label) else {
            continue;
        };
        dom::set_attr(&btn, "data-paint-tpl", id);
        let _ = tpl_grid.append_child(&btn);
    }
    let _ = tpl_overlay.append_child(&tpl_grid);
    let Some(pattern_overlay) = render::create_el_with_data(
        &doc,
        "div",
        "paint-pattern-picker",
        "data-paint-pattern-overlay",
    ) else {
        return;
    };
    dom::set_attr(&pattern_overlay, "hidden", "");
    render::append_text(
        &doc,
        &pattern_overlay,
        "div",
        "paint-pattern-picker-title",
        "\u{25A6} Choose a Pattern!",
    );
    let Some(pattern_grid) = render::create_el_with_class(&doc, "div", "paint-pattern-grid") else {
        return;
    };
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
        let Some(btn) = render::create_button(&doc, "paint-pattern-btn", label) else {
            continue;
        };
        dom::set_attr(&btn, "data-paint-pattern", id);
        let _ = pattern_grid.append_child(&btn);
    }
    let _ = pattern_overlay.append_child(&pattern_grid);
    for child in [&canvas_el, &toolbar, &tpl_overlay, &pattern_overlay] {
        let _ = container.append_child(child);
    }
    let _ = arena.append_child(&container);
    let canvas: HtmlCanvasElement = canvas_el.unchecked_into();
    let ctx = canvas
        .get_context("2d")
        .ok()
        .flatten()
        .and_then(|c| c.dyn_into::<CanvasRenderingContext2d>().ok());
    if let Some(ref ctx) = ctx {
        let _ = ctx.scale(dpr, dpr);
        ctx.set_fill_style_str("white");
        ctx.fill_rect(0.0, 0.0, css_w, css_h);
    }
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
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
            abort,
        });
    });
    synth_audio::chime();
    bind_paint_events(state, &signal);
}
fn bind_paint_events(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    if let Some(canvas_el) = dom::query("[data-paint-canvas]") {
        dom::on_pointer_with_signal(
            canvas_el.unchecked_ref(),
            "pointerdown",
            signal,
            move |event: PointerEvent| {
                let x = f64::from(event.offset_x());
                let y = f64::from(event.offset_y());
                GAME.with(|g| {
                    let mut borrow = g.borrow_mut();
                    let Some(game) = borrow.as_mut() else { return };
                    if !game.active {
                        return;
                    }
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
                                game.gradient_start_x = Some(x);
                                game.gradient_start_y = Some(y);
                                synth_audio::tap();
                            } else {
                                if let (Some(start_x), Some(start_y)) =
                                    (game.gradient_start_x, game.gradient_start_y)
                                {
                                    draw_gradient(game, start_x, start_y, x, y);
                                    synth_audio::rainbow_burst();
                                    native_apis::vibrate_success();
                                }
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
                            if game.tool == PaintTool::MagicWand {
                                if let Some(ref ctx) = game.ctx {
                                    ctx.set_shadow_blur(12.0);
                                    let hue = game.rainbow_hue;
                                    dom::with_buf(|buf| {
                                        let _ = write!(buf, "hsl({hue}, 100%, 60%)");
                                        ctx.set_shadow_color(buf);
                                    });
                                }
                                synth_audio::dreamy();
                            }
                        }
                    }
                });
            },
        );
        dom::on_pointer_with_signal(
            canvas_el.unchecked_ref(),
            "pointermove",
            signal,
            move |event: PointerEvent| {
                let x = f64::from(event.offset_x());
                let y = f64::from(event.offset_y());
                GAME.with(|g| {
                    let mut borrow = g.borrow_mut();
                    let Some(game) = borrow.as_mut() else { return };
                    if !game.drawing || !game.active {
                        return;
                    }
                    let Some(ref ctx) = game.ctx else { return };
                    let now = js_sys::Date::now();
                    let dt = (now - game.last_time).max(1.0);
                    let dx = x - game.last_x;
                    let dy = y - game.last_y;
                    let dist = (dx * dx + dy * dy).sqrt();
                    let speed = dist / dt;
                    match &game.tool {
                        PaintTool::Brush => {
                            let velocity_factor = (1.3 - speed * 2.0).clamp(0.6, 1.4);
                            let width = game.brush_size * velocity_factor;
                            if game.color == "rainbow" {
                                game.rainbow_hue = (game.rainbow_hue + 8.0) % 360.0;
                                dom::with_buf(|buf| {
                                    let _ = write!(buf, "hsl({}, 90%, 60%)", game.rainbow_hue);
                                    ctx.set_stroke_style_str(buf);
                                });
                            } else {
                                ctx.set_stroke_style_str(&game.color);
                            }
                            ctx.set_line_width(width);
                            ctx.set_line_cap("round");
                            ctx.set_line_join("round");
                            ctx.set_shadow_blur(0.0);
                            let mid_x = f64::midpoint(game.last_x, x);
                            let mid_y = f64::midpoint(game.last_y, y);
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
                            game.rainbow_hue = (game.rainbow_hue + 12.0) % 360.0;
                            let hue = game.rainbow_hue;
                            dom::with_buf(|buf| {
                                let _ = write!(buf, "hsl({hue}, 100%, 65%)");
                                ctx.set_stroke_style_str(buf);
                                buf.clear();
                                let _ = write!(buf, "hsl({hue}, 100%, 75%)");
                                ctx.set_shadow_color(buf);
                            });
                            ctx.set_line_width(12.0);
                            ctx.set_line_cap("round");
                            ctx.set_shadow_blur(12.0);
                            ctx.begin_path();
                            ctx.move_to(game.last_x, game.last_y);
                            ctx.line_to(x, y);
                            ctx.stroke();
                            game.wand_distance += dist;
                            if game.wand_distance > 30.0 {
                                game.wand_distance -= 30.0;
                                ctx.set_shadow_blur(0.0);
                                let sparkles = [
                                    "\u{2728}",
                                    "\u{1F31F}",
                                    "\u{2B50}",
                                    "\u{1F496}",
                                    "\u{1F4AB}",
                                ];
                                let idx = (js_sys::Math::random() * sparkles.len() as f64) as usize;
                                let emoji = sparkles[idx.min(sparkles.len() - 1)];
                                ctx.set_font("20px serif");
                                ctx.set_text_align("center");
                                ctx.set_text_baseline("middle");
                                let ox = x + (js_sys::Math::random() - 0.5) * 40.0;
                                let oy = y + (js_sys::Math::random() - 0.5) * 40.0;
                                let _ = ctx.fill_text(emoji, ox, oy);
                                ctx.set_shadow_blur(12.0);
                            }
                            if dist > 0.1
                                && game.wand_distance > 15.0
                                && js_sys::Math::random() > 0.4
                            {
                                ctx.set_shadow_blur(0.0);
                                ctx.set_font("14px serif");
                                ctx.set_text_align("center");
                                ctx.set_text_baseline("middle");
                                let _ = ctx.fill_text(
                                    "\u{2B50}",
                                    x + (js_sys::Math::random() - 0.5) * 20.0,
                                    y + (js_sys::Math::random() - 0.5) * 20.0,
                                );
                                ctx.set_shadow_blur(12.0);
                            }
                        }
                        _ => {}
                    }
                    game.last_x = x;
                    game.last_y = y;
                    game.last_time = now;
                });
            },
        );
        dom::on_with_signal(
            canvas_el.unchecked_ref(),
            "pointerup",
            signal,
            move |_: Event| {
                GAME.with(|g| {
                    let mut borrow = g.borrow_mut();
                    let Some(game) = borrow.as_mut() else { return };
                    game.drawing = false;
                    if let Some(ref ctx) = game.ctx {
                        ctx.set_shadow_blur(0.0);
                        ctx.set_shadow_color("transparent");
                    }
                });
            },
        );
        dom::on_with_signal(
            canvas_el.unchecked_ref(),
            "pointerleave",
            signal,
            move |_: Event| {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.drawing = false;
                        game.gradient_start_x = None;
                        game.gradient_start_y = None;
                        if let Some(ref ctx) = game.ctx {
                            ctx.set_shadow_blur(0.0);
                        }
                    }
                });
            },
        );
        dom::on_with_signal(
            canvas_el.unchecked_ref(),
            "pointercancel",
            signal,
            move |_: Event| {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.drawing = false;
                        game.gradient_start_x = None;
                        game.gradient_start_y = None;
                        if let Some(ref ctx) = game.ctx {
                            ctx.set_shadow_blur(0.0);
                            ctx.set_shadow_color("transparent");
                        }
                    }
                });
            },
        );
    }
    if let Some(arena) = dom::query(crate::constants::SELECTOR_GAME_ARENA) {
        let s = state;
        dom::on_with_signal(
            arena.unchecked_ref(),
            "click",
            signal,
            move |event: Event| {
                let Some(el) = dom::event_target_element(&event) else {
                    return;
                };
                if let Some(swatch) = dom::closest(&el, "[data-paint-color]") {
                    let color = dom::get_attr(&swatch, "data-paint-color").unwrap_or_default();
                    dom::set_active_class("paint-swatch--active", &swatch);
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.color = color;
                            if game.tool != PaintTool::MagicWand {
                                game.tool = PaintTool::Brush;
                                update_tool_active("brush");
                            }
                        }
                    });
                    synth_audio::tap();
                    return;
                }
                if let Some(btn) = dom::closest(&el, "[data-paint-size]") {
                    let size: f64 = dom::get_attr(&btn, "data-paint-size")
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(12.0);
                    dom::set_active_class("paint-size-btn--active", &btn);
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.brush_size = size;
                        }
                    });
                    synth_audio::tap();
                    return;
                }
                if let Some(btn) = dom::closest(&el, "[data-paint-stamp-size]") {
                    let size: f64 = dom::get_attr(&btn, "data-paint-stamp-size")
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(40.0);
                    dom::set_active_class("paint-stamp-size--active", &btn);
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.stamp_size = size;
                        }
                    });
                    synth_audio::tap();
                    return;
                }
                if let Some(btn) = dom::closest(&el, "[data-paint-stamp]") {
                    let stamp = dom::get_attr(&btn, "data-paint-stamp").unwrap_or_default();
                    dom::set_active_class("paint-stamp-btn--active", &btn);
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.tool = PaintTool::Stamp(stamp);
                        }
                    });
                    synth_audio::tap();
                    return;
                }
                let simple_tools: &[(&str, PaintTool, &str)] = &[
                    ("[data-paint-brush]", PaintTool::Brush, "brush"),
                    ("[data-paint-eraser]", PaintTool::Eraser, "eraser"),
                    ("[data-paint-fill]", PaintTool::Fill, "fill"),
                ];
                let matched_tool = simple_tools
                    .iter()
                    .find(|(sel, _, _)| dom::closest(&el, sel).is_some());
                if let Some((_, tool, name)) = matched_tool {
                    let tool = tool.clone();
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.tool = tool;
                        }
                    });
                    update_tool_active(name);
                    synth_audio::tap();
                    return;
                }
                if dom::closest(&el, "[data-paint-wand]").is_some() {
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.tool = PaintTool::MagicWand;
                        }
                    });
                    update_tool_active("wand");
                    synth_audio::magic_wand();
                    return;
                }
                if dom::closest(&el, "[data-paint-gradient]").is_some() {
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
                if dom::closest(&el, "[data-paint-patterns]").is_some() {
                    toggle_overlay("[data-paint-pattern-overlay]");
                    return;
                }
                if let Some(btn) = dom::closest(&el, "[data-paint-pattern]") {
                    let pattern_id = dom::get_attr(&btn, "data-paint-pattern").unwrap_or_default();
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.tool = PaintTool::Pattern(pattern_id);
                        }
                    });
                    update_tool_active("pattern");
                    dom::hide("[data-paint-pattern-overlay]");
                    synth_audio::sparkle();
                    return;
                }
                if dom::closest(&el, "[data-paint-undo]").is_some() {
                    undo();
                    synth_audio::tap();
                    return;
                }
                if dom::closest(&el, "[data-paint-clear]").is_some() {
                    clear_canvas();
                    synth_audio::whoops();
                    return;
                }
                if dom::closest(&el, "[data-paint-templates]").is_some() {
                    toggle_overlay("[data-paint-tpl-overlay]");
                    return;
                }
                if let Some(btn) = dom::closest(&el, "[data-paint-tpl]") {
                    let tpl_id = dom::get_attr(&btn, "data-paint-tpl").unwrap_or_default();
                    apply_template(&tpl_id);
                    dom::hide("[data-paint-tpl-overlay]");
                    synth_audio::sparkle();
                    return;
                }
                if dom::closest(&el, "[data-paint-done]").is_some() {
                    finish_painting(s.clone());
                }
            },
        );
    }
}
fn toggle_overlay(selector: &str) {
    if let Some(overlay) = dom::query(selector) {
        if dom::has_attr(&overlay, "hidden") {
            dom::remove_attr(&overlay, "hidden");
            synth_audio::page_turn();
        } else {
            dom::set_attr(&overlay, "hidden", "");
        }
    }
}
fn update_tool_active(tool: &str) {
    dom::for_each_match(".paint-tool-btn--active", |old| {
        if dom::get_attr(&old, "data-paint-done").is_none() {
            let _ = old.class_list().remove_1("paint-tool-btn--active");
        }
    });
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
fn draw_stamp(game: &mut PaintState, x: f64, y: f64, emoji: String) {
    let Some(ref ctx) = game.ctx else { return };
    let angle = (js_sys::Math::random() - 0.5) * 0.52;
    let size = game.stamp_size;
    ctx.save();
    let _ = ctx.translate(x, y);
    let _ = ctx.rotate(angle);
    dom::with_buf(|buf| {
        let _ = write!(buf, "{size}px serif");
        ctx.set_font(buf);
    });
    ctx.set_text_align("center");
    ctx.set_text_baseline("middle");
    ctx.set_shadow_blur(0.0);
    let _ = ctx.fill_text(&emoji, 0.0, 0.0);
    ctx.restore();
    spawn_animated_stamp(x, y, &emoji, size);
}
fn spawn_animated_stamp(x: f64, y: f64, emoji: &str, size: f64) {
    let doc = dom::document();
    let Some(container) = dom::query(".paint-container") else { return };
    if let Ok(particle) = doc.create_element("div") {
        dom::set_attr(&particle, "class", "paint-animated-stamp");
        particle.set_text_content(Some(emoji));

        // Random butterfly flutter/burst vector
        let dx = (js_sys::Math::random() - 0.5) * 200.0;
        let dy = -100.0 - js_sys::Math::random() * 100.0;
        let rot = (js_sys::Math::random() - 0.5) * 90.0;

        dom::with_buf(|b| {
            let _ = write!(
                b,
                "position: absolute; left: {}px; top: {}px; font-size: {}px; \
                 pointer-events: none; z-index: 50; user-select: none; \
                 transition: transform 2.0s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 2.0s ease-in; \
                 text-shadow: 0 0 10px rgba(255,255,255,0.8);",
                x - size / 2.0,
                y - size / 2.0,
                size
            );
            dom::set_attr(&particle, "style", b);
        });

        let _ = container.append_child(&particle);

        let p_clone = particle.clone();
        dom::set_timeout_once(50, move || {
            dom::with_buf(|b| {
                let _ = write!(
                    b,
                    "position: absolute; left: {}px; top: {}px; font-size: {}px; \
                     pointer-events: none; z-index: 50; user-select: none; \
                     transition: transform 2.0s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 2.0s ease-in; \
                     text-shadow: 0 0 10px rgba(255,255,255,0.8); \
                     transform: translate({}px, {}px) rotate({}deg) scale(2.0); opacity: 0;",
                    x - size / 2.0,
                    y - size / 2.0,
                    size,
                    dx,
                    dy,
                    rot
                );
                dom::set_attr(&p_clone, "style", b);
            });
        });

        dom::set_timeout_once(2000, move || {
            particle.remove();
        });
    }
}
fn scanline_fill(
    game: &mut PaintState,
    css_x: f64,
    css_y: f64,
    mut write_pixel: impl FnMut(&mut [u8], usize, i32, i32),
) {
    let Some(ref ctx) = game.ctx else { return };
    let Some(ref canvas) = game.canvas else {
        return;
    };
    let w = canvas.width() as i32;
    let h = canvas.height() as i32;
    if w == 0 || h == 0 {
        return;
    }
    let px = (css_x * game.dpr) as i32;
    let py = (css_y * game.dpr) as i32;
    if px < 0 || px >= w || py < 0 || py >= h {
        return;
    }
    let Ok(image_data) = ctx.get_image_data(0.0, 0.0, f64::from(w), f64::from(h)) else {
        return;
    };
    let mut data = image_data.data().0;
    let idx = ((py * w + px) * 4) as usize;
    let (target_r, target_g, target_b) = (data[idx], data[idx + 1], data[idx + 2]);
    let (fill_r, fill_g, fill_b) = parse_hex_color(&game.color);
    if color_match(target_r, target_g, target_b, fill_r, fill_g, fill_b, 10) {
        return;
    }
    let tolerance = 30u8;
    let mut stack: Vec<(i32, i32)> = vec![(px, py)];
    let matches = |d: &[u8], i: usize| -> bool {
        i + 3 < d.len()
            && color_match(
                d[i],
                d[i + 1],
                d[i + 2],
                target_r,
                target_g,
                target_b,
                tolerance,
            )
    };
    while let Some((sx, sy)) = stack.pop() {
        if sx < 0 || sx >= w || sy < 0 || sy >= h {
            continue;
        }
        let i = ((sy * w + sx) * 4) as usize;
        if !matches(&data, i) {
            continue;
        }
        write_pixel(&mut data, i, sx, sy);
        let mut left = sx;
        while left > 0 {
            let li = ((sy * w + (left - 1)) * 4) as usize;
            if !matches(&data, li) {
                break;
            }
            left -= 1;
            write_pixel(&mut data, li, left, sy);
        }
        let mut right = sx;
        while right < w - 1 {
            let ri = ((sy * w + (right + 1)) * 4) as usize;
            if !matches(&data, ri) {
                break;
            }
            right += 1;
            write_pixel(&mut data, ri, right, sy);
        }
        for scan_x in left..=right {
            if sy > 0 {
                let ui = (((sy - 1) * w + scan_x) * 4) as usize;
                if matches(&data, ui) {
                    stack.push((scan_x, sy - 1));
                }
            }
            if sy < h - 1 {
                let di = (((sy + 1) * w + scan_x) * 4) as usize;
                if matches(&data, di) {
                    stack.push((scan_x, sy + 1));
                }
            }
        }
    }
    let clamped = wasm_bindgen::Clamped(data.as_slice());
    if let Ok(new_data) =
        web_sys::ImageData::new_with_u8_clamped_array_and_sh(clamped, w as u32, h as u32)
    {
        let _ = ctx.put_image_data(&new_data, 0.0, 0.0);
    }
}
fn flood_fill(game: &mut PaintState, css_x: f64, css_y: f64) {
    let (r, g, b) = parse_hex_color(&game.color);
    scanline_fill(game, css_x, css_y, |data, i, _, _| {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
    });
}
fn parse_hex_color(hex: &str) -> (u8, u8, u8) {
    if hex == "rainbow" {
        return (255, 0, 128);
    }
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 {
        return (0, 0, 0);
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
    (r, g, b)
}
fn color_match(r1: u8, g1: u8, b1: u8, r2: u8, g2: u8, b2: u8, tolerance: u8) -> bool {
    let dr = (i16::from(r1) - i16::from(r2)).unsigned_abs() as u8;
    let dg = (i16::from(g1) - i16::from(g2)).unsigned_abs() as u8;
    let db = (i16::from(b1) - i16::from(b2)).unsigned_abs() as u8;
    dr <= tolerance && dg <= tolerance && db <= tolerance
}
fn draw_gradient(game: &mut PaintState, start_x: f64, start_y: f64, end_x: f64, end_y: f64) {
    let Some(ref ctx) = game.ctx else { return };
    let color = if game.color == "rainbow" {
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
        let gradient = ctx.create_linear_gradient(start_x, start_y, end_x, end_y);
        let _ = gradient.add_color_stop(0.0, &game.color);
        let (cr, cg, cb) = parse_hex_color(&game.color);
        dom::with_buf(|buf| {
            let _ = write!(
                buf,
                "rgb({}, {}, {})",
                (f64::from(cr) * 1.6).min(255.0) as u8,
                (f64::from(cg) * 1.6).min(255.0) as u8,
                (f64::from(cb) * 1.6).min(255.0) as u8
            );
            let _ = gradient.add_color_stop(1.0, buf);
        });
        gradient
    };
    ctx.set_fill_style_canvas_gradient(&color);
    ctx.fill_rect(0.0, 0.0, game.canvas_w, game.canvas_h);
}
fn apply_pattern_pixel(
    data: &mut [u8],
    i: usize,
    pattern_type: &str,
    x: i32,
    y: i32,
    ps: i32,
    rgb: (u8, u8, u8),
) {
    let hit = match pattern_type {
        "dots" => (x % ps == 0) && (y % ps == 0),
        "stripes" => (x / ps) % 2 == 0,
        "checkerboard" => ((x / ps) + (y / ps)) % 2 == 0,
        "waves" => {
            let wave = ((f64::from(x) / 10.0).sin() * 3.0) as i32;
            (y + wave) % ps < ps / 2
        }
        "diamonds" => {
            let dx = (x % ps) - ps / 2;
            let dy = (y % ps) - ps / 2;
            dx.abs() + dy.abs() < ps / 3
        }
        "hearts" => {
            let dx = x % (ps * 2);
            let dy = y % (ps * 2);
            let mid = ps;
            (dx - mid).pow(2) + (dy - mid / 2).pow(2) < (ps / 2).pow(2)
        }
        "clouds" => {
            let cx = x % 80;
            let cy = y % 60;
            let d1 = f64::from((cx - 40) * (cx - 40) + (cy - 30) * (cy - 30));
            let d2 = f64::from((cx - 55) * (cx - 55) + (cy - 25) * (cy - 25));
            d1 < 400.0 || d2 < 225.0
        }
        "polkadots" => {
            let cx = x % 40;
            let cy = y % 40;
            let dist = f64::from((cx - 20) * (cx - 20) + (cy - 20) * (cy - 20));
            dist < 64.0
        }
        "zigzag" => {
            let phase = x % 20;
            let ey = if phase < 10 {
                phase * 15 / 10
            } else {
                (20 - phase) * 15 / 10
            };
            (y % 30 - ey).abs() < 3
        }
        _ => true,
    };
    if hit {
        data[i] = rgb.0;
        data[i + 1] = rgb.1;
        data[i + 2] = rgb.2;
    } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
    }
    data[i + 3] = 255;
}
fn flood_fill_pattern(game: &mut PaintState, css_x: f64, css_y: f64, pattern_type: &str) {
    let rgb = parse_hex_color(&game.color);
    let ps = 12i32;
    scanline_fill(game, css_x, css_y, |data, i, x, y| {
        apply_pattern_pixel(data, i, pattern_type, x, y, ps, rgb);
    });
}
fn stroke_line(ctx: &CanvasRenderingContext2d, x1: f64, y1: f64, x2: f64, y2: f64) {
    ctx.begin_path();
    ctx.move_to(x1, y1);
    ctx.line_to(x2, y2);
    ctx.stroke();
}
fn stroke_circle(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, r: f64) {
    ctx.begin_path();
    let _ = ctx.arc(cx, cy, r, 0.0, std::f64::consts::TAU);
    ctx.stroke();
}
fn stroke_polyline(ctx: &CanvasRenderingContext2d, points: &[(f64, f64)]) {
    if points.is_empty() {
        return;
    }
    ctx.begin_path();
    ctx.move_to(points[0].0, points[0].1);
    for &(x, y) in &points[1..] {
        ctx.line_to(x, y);
    }
    ctx.stroke();
}
fn stroke_bezier(
    ctx: &CanvasRenderingContext2d,
    m: (f64, f64),
    c1: (f64, f64),
    c2: (f64, f64),
    e: (f64, f64),
) {
    ctx.begin_path();
    ctx.move_to(m.0, m.1);
    ctx.bezier_curve_to(c1.0, c1.1, c2.0, c2.1, e.0, e.1);
    ctx.stroke();
}
fn apply_template(id: &str) {
    GAME.with(|g| {
        {
            let borrow = g.borrow();
            let Some(game) = borrow.as_ref() else { return };
            let Some(ref ctx) = game.ctx else { return };
            let w = game.canvas_w;
            let h = game.canvas_h;
            ctx.set_fill_style_str("white");
            ctx.fill_rect(0.0, 0.0, w, h);
            if id == "free" {
                return;
            }
            ctx.set_stroke_style_str("#E0E0E0");
            ctx.set_line_width(2.5);
            ctx.set_line_cap("round");
            ctx.set_line_join("round");
            ctx.set_shadow_blur(0.0);
            let cx = w / 2.0;
            let cy = h / 2.0;
            let scale = (w.min(h) / 400.0).max(0.5);
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
        } // drop immutable borrow
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active_template = id.to_string();
        }
    });
}
fn draw_template_heart(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    ctx.begin_path();
    let size = 120.0 * s;
    ctx.move_to(cx, cy + size * 0.7);
    ctx.bezier_curve_to(
        cx - size * 1.2,
        cy - size * 0.2,
        cx - size * 0.6,
        cy - size * 0.9,
        cx,
        cy - size * 0.4,
    );
    ctx.bezier_curve_to(
        cx + size * 0.6,
        cy - size * 0.9,
        cx + size * 1.2,
        cy - size * 0.2,
        cx,
        cy + size * 0.7,
    );
    ctx.stroke();
}
fn draw_template_star(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    let outer = 120.0 * s;
    let inner = 50.0 * s;
    let points = 5;
    ctx.begin_path();
    for i in 0..(points * 2) {
        let angle =
            f64::from(i) * std::f64::consts::PI / f64::from(points) - std::f64::consts::FRAC_PI_2;
        let r = if i % 2 == 0 { outer } else { inner };
        let px = cx + r * angle.cos();
        let py = cy + r * angle.sin();
        if i == 0 {
            ctx.move_to(px, py);
        } else {
            ctx.line_to(px, py);
        }
    }
    ctx.close_path();
    ctx.stroke();
}
fn draw_template_unicorn(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    let r = 80.0 * s;
    stroke_circle(ctx, cx, cy, r);
    stroke_circle(ctx, cx + r * 0.3, cy - r * 0.15, r * 0.08);
    stroke_polyline(
        ctx,
        &[
            (cx + r * 0.3, cy - r * 0.8),
            (cx + r * 0.15, cy - r * 1.6),
            (cx - r * 0.1, cy - r * 0.85),
        ],
    );
    stroke_polyline(
        ctx,
        &[
            (cx - r * 0.3, cy - r * 0.7),
            (cx - r * 0.5, cy - r * 1.1),
            (cx - r * 0.1, cy - r * 0.85),
        ],
    );
    stroke_bezier(
        ctx,
        (cx - r * 0.7, cy - r * 0.5),
        (cx - r * 1.1, cy),
        (cx - r * 0.9, cy + r * 0.5),
        (cx - r * 0.6, cy + r * 0.8),
    );
}
fn draw_template_rainbow(ctx: &CanvasRenderingContext2d, _cx: f64, cy: f64, w: f64, s: f64) {
    let base_y = cy + 60.0 * s;
    let start_r = 140.0 * s;
    let band_width = 18.0 * s;
    let cx = w / 2.0;
    for i in 0..6 {
        let r = start_r - f64::from(i) * band_width;
        if r < 10.0 {
            break;
        }
        ctx.begin_path();
        let _ = ctx.arc(cx, base_y, r, std::f64::consts::PI, 0.0);
        ctx.stroke();
    }
    stroke_line(
        ctx,
        cx - start_r - 10.0,
        base_y,
        cx + start_r + 10.0,
        base_y,
    );
}
fn draw_template_flower(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    let petal_r = 40.0 * s;
    let center_r = 25.0 * s;
    let flower_y = cy - 30.0 * s;
    for i in 0..6 {
        let angle = f64::from(i) * std::f64::consts::TAU / 6.0;
        let px = cx + (center_r + petal_r * 0.5) * angle.cos();
        let py = flower_y + (center_r + petal_r * 0.5) * angle.sin();
        stroke_circle(ctx, px, py, petal_r);
    }
    stroke_circle(ctx, cx, flower_y, center_r);
    stroke_bezier(
        ctx,
        (cx, flower_y + center_r + petal_r),
        (cx - 10.0 * s, cy + 60.0 * s),
        (cx + 10.0 * s, cy + 80.0 * s),
        (cx, cy + 120.0 * s),
    );
    stroke_bezier(
        ctx,
        (cx, cy + 50.0 * s),
        (cx + 30.0 * s, cy + 30.0 * s),
        (cx + 50.0 * s, cy + 50.0 * s),
        (cx + 30.0 * s, cy + 60.0 * s),
    );
}
fn draw_template_castle(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    stroke_polyline(
        ctx,
        &[
            (cx - 80.0 * s, cy + 80.0 * s),
            (cx - 80.0 * s, cy - 20.0 * s),
            (cx + 80.0 * s, cy - 20.0 * s),
            (cx + 80.0 * s, cy + 80.0 * s),
        ],
    );
    stroke_polyline(
        ctx,
        &[
            (cx - 80.0 * s, cy - 20.0 * s),
            (cx - 80.0 * s, cy - 80.0 * s),
            (cx - 50.0 * s, cy - 80.0 * s),
            (cx - 50.0 * s, cy - 20.0 * s),
        ],
    );
    stroke_polyline(
        ctx,
        &[
            (cx + 50.0 * s, cy - 20.0 * s),
            (cx + 50.0 * s, cy - 80.0 * s),
            (cx + 80.0 * s, cy - 80.0 * s),
            (cx + 80.0 * s, cy - 20.0 * s),
        ],
    );
    ctx.begin_path();
    let _ = ctx.arc(cx, cy + 80.0 * s, 25.0 * s, std::f64::consts::PI, 0.0);
    ctx.stroke();
    stroke_polyline(
        ctx,
        &[
            (cx - 65.0 * s, cy - 80.0 * s),
            (cx - 65.0 * s, cy - 110.0 * s),
            (cx - 45.0 * s, cy - 100.0 * s),
            (cx - 65.0 * s, cy - 90.0 * s),
        ],
    );
}
fn draw_template_butterfly(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    stroke_line(ctx, cx, cy - 60.0 * s, cx, cy + 60.0 * s);
    stroke_bezier(
        ctx,
        (cx, cy - 20.0 * s),
        (cx - 90.0 * s, cy - 80.0 * s),
        (cx - 100.0 * s, cy - 10.0 * s),
        (cx, cy + 10.0 * s),
    );
    stroke_bezier(
        ctx,
        (cx, cy - 20.0 * s),
        (cx + 90.0 * s, cy - 80.0 * s),
        (cx + 100.0 * s, cy - 10.0 * s),
        (cx, cy + 10.0 * s),
    );
    stroke_bezier(
        ctx,
        (cx, cy + 10.0 * s),
        (cx - 70.0 * s, cy + 20.0 * s),
        (cx - 60.0 * s, cy + 70.0 * s),
        (cx, cy + 50.0 * s),
    );
    stroke_bezier(
        ctx,
        (cx, cy + 10.0 * s),
        (cx + 70.0 * s, cy + 20.0 * s),
        (cx + 60.0 * s, cy + 70.0 * s),
        (cx, cy + 50.0 * s),
    );
    stroke_line(ctx, cx, cy - 60.0 * s, cx - 20.0 * s, cy - 90.0 * s);
    stroke_line(ctx, cx, cy - 60.0 * s, cx + 20.0 * s, cy - 90.0 * s);
}
fn draw_template_dinosaur(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, s: f64) {
    ctx.begin_path();
    let _ = ctx.ellipse(
        cx,
        cy + 10.0 * s,
        70.0 * s,
        50.0 * s,
        0.0,
        0.0,
        std::f64::consts::TAU,
    );
    ctx.stroke();
    stroke_circle(ctx, cx + 80.0 * s, cy - 40.0 * s, 30.0 * s);
    stroke_line(
        ctx,
        cx + 50.0 * s,
        cy - 20.0 * s,
        cx + 60.0 * s,
        cy - 30.0 * s,
    );
    stroke_bezier(
        ctx,
        (cx - 70.0 * s, cy + 10.0 * s),
        (cx - 100.0 * s, cy - 10.0 * s),
        (cx - 120.0 * s, cy + 20.0 * s),
        (cx - 110.0 * s, cy + 40.0 * s),
    );
    stroke_line(
        ctx,
        cx - 30.0 * s,
        cy + 55.0 * s,
        cx - 30.0 * s,
        cy + 90.0 * s,
    );
    stroke_line(
        ctx,
        cx + 30.0 * s,
        cy + 55.0 * s,
        cx + 30.0 * s,
        cy + 90.0 * s,
    );
    stroke_circle(ctx, cx + 88.0 * s, cy - 45.0 * s, 4.0 * s);
    stroke_polyline(
        ctx,
        &[
            (cx - 30.0 * s, cy - 35.0 * s),
            (cx - 20.0 * s, cy - 55.0 * s),
            (cx - 5.0 * s, cy - 35.0 * s),
            (cx + 10.0 * s, cy - 55.0 * s),
            (cx + 25.0 * s, cy - 35.0 * s),
        ],
    );
}
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
        let Some(data_bytes) = game.undo_stack.pop() else {
            return;
        };
        let Ok(data_url) = String::from_utf8(data_bytes) else {
            return;
        };
        let Some(ctx) = game.ctx.as_ref() else { return };
        let doc = dom::document();
        let Ok(img) = doc.create_element("img") else {
            dom::warn("Failed to create img element for undo restore");
            return;
        };
        dom::set_attr(&img, "src", &data_url);
        let ctx_clone = ctx.clone();
        let w = game.canvas_w;
        let h = game.canvas_h;
        let dpr = game.dpr;
        dom::set_timeout_once(50, move || {
            let html_img: web_sys::HtmlImageElement = img.unchecked_into();
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
        save_undo(game);
        if let Some(ref ctx) = game.ctx {
            ctx.set_fill_style_str("white");
            ctx.fill_rect(0.0, 0.0, game.canvas_w, game.canvas_h);
        }
        let tpl = game.active_template.clone();
        drop(borrow);
        if tpl != "free" {
            apply_template(&tpl);
        }
    });
}
fn finish_painting(state: Rc<RefCell<AppState>>) {
    let hearts = theme::HEARTS_PER_PAINTING;
    let (total, paintings_today) = {
        let mut s = state.borrow_mut();
        s.hearts_total += hearts;
        s.hearts_today += hearts;
        s.games_played_today += 1;
        s.paintings_today += 1;
        (s.hearts_total, s.paintings_today)
    };
    ui::update_heart_counter(total);
    weekly_goals::record_game_played(hearts);
    games::save_game_score("paint-save", "paint", u64::from(paintings_today), 1, 0, 0);
    synth_audio::fanfare();
    native_apis::vibrate_success();
    confetti::burst_stars();
    speech::celebrate("Beautiful painting!");
    if let Some(canvas) = dom::query("[data-paint-canvas]") {
        let _ = canvas.class_list().add_1("paint-canvas--masterpiece");
    }
    dom::set_timeout_once(1500, move || {
        confetti::burst_party();
        synth_audio::rainbow_burst();
        show_paint_end(state);
    });
}
fn show_paint_end(state: Rc<RefCell<AppState>>) {
    let Some((arena, _doc)) = games::clear_game_arena() else {
        return;
    };
    let Some((screen, title, stats)) = games::build_end_screen() else {
        return;
    };
    title.set_text_content(Some("\u{1F3A8} Masterpiece! \u{1F3A8}"));
    games::append_hearts_line(&stats, theme::HEARTS_PER_PAINTING);
    let paintings = state.borrow().paintings_today;
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{1F5BC} Painting #{paintings} today!");
        games::append_stat_line(&stats, "", buf);
    });
    let msg = match paintings {
        1 => "\u{2728} Sparkle loves your first painting!",
        2..=3 => "\u{1F31F} You're on a creative roll!",
        4..=6 => "\u{1F308} What an artist you are!",
        _ => "\u{1F3A8} Painting superstar!",
    };
    games::append_stat_line(&stats, "game-end-stat--sparkle", msg);
    games::finish_end_screen(&screen, &stats, &arena, "paint");
    let sig = GAME.with(|g| g.borrow().as_ref().map(|game| game.abort.signal()));
    let s = state;
    games::bind_end_buttons(
        sig.as_ref(),
        move || {
            cleanup();
            show_category_picker(s.clone());
        },
        || {
            cleanup();
            games::return_to_menu();
        },
    );
}
pub fn cleanup() {
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            game.drawing = false;
        }
        *g.borrow_mut() = None;
    });
}
