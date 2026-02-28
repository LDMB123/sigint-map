use crate::dom;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimeOfDay {
    Morning,
    Afternoon,
    Evening,
    Night,
}

impl TimeOfDay {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Morning => "morning",
            Self::Afternoon => "afternoon",
            Self::Evening => "evening",
            Self::Night => "night",
        }
    }
}

pub fn detect() -> TimeOfDay {
    let hour = js_sys::Date::new_0().get_hours();
    match hour {
        6..=11 => TimeOfDay::Morning,
        12..=16 => TimeOfDay::Afternoon,
        17..=19 => TimeOfDay::Evening,
        _ => TimeOfDay::Night,
    }
}

pub fn apply() {
    let tod = detect();
    if let Some(root) = dom::document().document_element() {
        dom::set_attr(&root, "data-time-of-day", tod.as_str());
    }
}

pub fn refresh_if_changed() {
    let tod = detect();
    if let Some(root) = dom::document().document_element() {
        let current = dom::get_attr(&root, "data-time-of-day").unwrap_or_default();
        if current != tod.as_str() {
            dom::set_attr(&root, "data-time-of-day", tod.as_str());
        }
    }
}
