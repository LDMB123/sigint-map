use crate::{browser_apis, confetti, db_client, dom, rewards, speech, synth_audio, utils};
use std::cell::Cell;

thread_local! {
    static CHECKED_THIS_SESSION: Cell<bool> = const { Cell::new(false) };
}

struct SparkleMailEntry {
    message: &'static str,
    has_sticker: bool,
}

const SPARKLE_MAIL: &[SparkleMailEntry] = &[
    SparkleMailEntry {
        message: "You're the kindest friend ever!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Sparkle is SO proud of you!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "Did you know? Hugging makes everyone feel better!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Your kind acts make the world sparkle!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Sparkle loves you SO much, Blaire!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "Every kind act grows our garden!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "You make everyone around you smile!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Kindness is your superpower!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "Sparkle collected extra sparkles for you!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Your heart is as big as a rainbow!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "The unicorns are cheering for you!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "You're a kindness champion, Blaire!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Sharing is caring, and you're amazing at it!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Sparkle wants to give you the biggest hug!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Every smile you give lights up the world!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "You're braver than you know, Blaire!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "The garden grows because of YOUR kindness!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Sparkle is dancing with joy because of you!",
        has_sticker: true,
    },
    SparkleMailEntry {
        message: "Your family loves watching you be kind!",
        has_sticker: false,
    },
    SparkleMailEntry {
        message: "Keep spreading kindness everywhere you go!",
        has_sticker: false,
    },
];

pub async fn check_and_deliver() {
    if CHECKED_THIS_SESSION.with(Cell::get) {
        return;
    }
    CHECKED_THIS_SESSION.with(|c| c.set(true));

    let current_week = utils::week_key();
    let last_week = db_client::get_setting("last_sparkle_mail_week")
        .await
        .unwrap_or_default();

    if last_week == current_week {
        return;
    }

    let week_num: usize = current_week
        .split('W')
        .next_back()
        .and_then(|w| w.parse().ok())
        .unwrap_or(0);
    let mail = &SPARKLE_MAIL[week_num % SPARKLE_MAIL.len()];

    db_client::set_setting("last_sparkle_mail_week", &current_week).await;

    deliver_mail(mail).await;
}

async fn deliver_mail(mail: &SparkleMailEntry) {
    browser_apis::sleep_ms(500).await;
    speech::celebrate("You have Sparkle Mail!");
    synth_audio::treasure_reveal();

    browser_apis::sleep_ms(1500).await;
    dom::toast(&format!("\u{2709}\u{FE0F} {}", mail.message));
    speech::speak(mail.message);
    confetti::burst_unicorn();

    if mail.has_sticker {
        browser_apis::sleep_ms(2000).await;
        speech::celebrate("And a special sticker!");
        rewards::award_sticker("sparkle-mail");
    }
}
