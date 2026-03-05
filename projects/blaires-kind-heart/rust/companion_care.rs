use crate::{browser_apis, companion_care_store, dom, state, utils};

const FEED_COOLDOWN_MS: f64 = 600_000.0; // 10 minutes
const PLAY_COOLDOWN_MS: f64 = 3_000.0; // 3 seconds

pub async fn get_state(key: &str) -> Option<String> {
    companion_care_store::fetch_state_value(key).await
}

pub async fn set_state(key: &str, value: &str) {
    let now = browser_apis::now_ms() as u64;
    if let Err(e) = companion_care_store::upsert_state(key, value, now).await {
        dom::warn(&format!("[companion_care] set_state failed: {e:?}"));
    }
}

pub async fn hydrate() {
    let rows = match companion_care_store::fetch_all_state_rows().await {
        Ok(r) => r,
        Err(e) => {
            dom::warn(&format!("[companion_care] hydrate query failed: {e:?}"));
            return;
        }
    };

    let today = utils::today_key();
    let mut mood = String::new();
    let mut last_fed_ms: f64 = 0.0;
    let mut last_pet_ms: f64 = 0.0;
    let mut last_play_ms: f64 = 0.0;
    let mut feeds_today: u32 = 0;
    let mut feeds_day_key = String::new();

    if let Some(arr) = rows.as_array() {
        for row in arr {
            let key = row.get("key").and_then(|v| v.as_str()).unwrap_or("");
            let val = row.get("value").and_then(|v| v.as_str()).unwrap_or("");
            match key {
                "mood" => mood = val.to_string(),
                "last_fed_at" => last_fed_ms = val.parse().unwrap_or(0.0),
                "last_pet_at" => last_pet_ms = val.parse().unwrap_or(0.0),
                "last_play_at" => last_play_ms = val.parse().unwrap_or(0.0),
                "feeds_today" => feeds_today = val.parse().unwrap_or(0),
                "feeds_day_key" => feeds_day_key = val.to_string(),
                _ => {}
            }
        }
    }

    // Reset feeds_today if day has changed
    if feeds_day_key != today {
        feeds_today = 0;
    }

    // Default mood to "sleepy" if empty (follows active_skin pattern)
    if mood.is_empty() {
        mood = "sleepy".to_string();
    }

    state::with_state_mut(|s| {
        s.sparkle_mood = mood;
        s.sparkle_last_fed_ms = last_fed_ms;
        s.sparkle_last_pet_ms = last_pet_ms;
        s.sparkle_last_play_ms = last_play_ms;
        s.sparkle_feeds_today = feeds_today;
    });
}

pub const fn calculate_mood(hearts_today: u32, streak: u32, fed_today: bool) -> &'static str {
    if hearts_today >= 3 || streak >= 7 {
        "excited"
    } else if hearts_today >= 1 || fed_today {
        "happy"
    } else {
        "sleepy"
    }
}

pub async fn update_mood() {
    let (hearts_today, streak, feeds_today) =
        state::with_state(|s| (s.hearts_today, s.streak_days, s.sparkle_feeds_today));
    let fed_today = feeds_today > 0;
    let mood = calculate_mood(hearts_today, streak, fed_today);

    set_state("mood", mood).await;
    state::with_state_mut(|s| {
        s.sparkle_mood = mood.to_string();
    });

    crate::companion_speech::on_mood_change(mood);
}

pub async fn record_feed() {
    let now = browser_apis::now_ms();
    let now_str = (now as u64).to_string();
    let today = utils::today_key();

    // Check if day rolled over; reset counter if so
    let feeds_today = state::with_state(|s| s.sparkle_feeds_today);
    let stored_day = get_state("feeds_day_key").await.unwrap_or_default();
    let new_feeds = if stored_day == today {
        feeds_today + 1
    } else {
        1
    };

    set_state("last_fed_at", &now_str).await;
    set_state("feeds_today", &new_feeds.to_string()).await;
    set_state("feeds_day_key", &today).await;

    // Increment total_feeds
    let total = get_state("total_feeds")
        .await
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        + 1;
    set_state("total_feeds", &total.to_string()).await;

    state::with_state_mut(|s| {
        s.sparkle_last_fed_ms = now;
        s.sparkle_feeds_today = new_feeds;
    });

    update_mood().await;
}

pub async fn record_pet() {
    let now = browser_apis::now_ms();
    let now_str = (now as u64).to_string();

    set_state("last_pet_at", &now_str).await;

    // Increment total_pets
    let total = get_state("total_pets")
        .await
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        + 1;
    set_state("total_pets", &total.to_string()).await;

    state::with_state_mut(|s| {
        s.sparkle_last_pet_ms = now;
    });

    update_mood().await;
}

pub async fn record_play() {
    let now = browser_apis::now_ms();
    let now_str = (now as u64).to_string();

    set_state("last_play_at", &now_str).await;

    // Increment total_plays
    let total = get_state("total_plays")
        .await
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        + 1;
    set_state("total_plays", &total.to_string()).await;

    state::with_state_mut(|s| {
        s.sparkle_last_play_ms = now;
    });
}

fn cooldown_remaining(last_ms: f64, cooldown_ms: f64) -> f64 {
    (cooldown_ms - (browser_apis::now_ms() - last_ms)).max(0.0)
}
pub fn feed_cooldown_remaining() -> f64 {
    cooldown_remaining(state::with_state(|s| s.sparkle_last_fed_ms), FEED_COOLDOWN_MS)
}
pub fn play_cooldown_remaining() -> f64 {
    cooldown_remaining(state::with_state(|s| s.sparkle_last_play_ms), PLAY_COOLDOWN_MS)
}
