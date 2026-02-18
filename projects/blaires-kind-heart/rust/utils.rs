/// Generate a random u32 via crypto.getRandomValues (single CSPRNG call).
pub fn random_u32() -> u32 {
    let buf = js_sys::Uint32Array::new_with_length(1);
    crypto().get_random_values_with_array_buffer_view(&buf).ok();
    buf.get_index(0)
}

/// Generate a random 12-character alphanumeric ID via crypto.getRandomValues.
/// Single wasm→JS boundary crossing instead of 12 Math.random() calls.
pub fn create_id() -> String {
    let buf = js_sys::Uint8Array::new_with_length(12);
    crypto().get_random_values_with_array_buffer_view(&buf).ok();
    let mut id = String::with_capacity(12);
    for i in 0..12 {
        let n = buf.get_index(i) % 36;
        let c = if n < 10 { b'0' + n } else { b'a' + (n - 10) };
        id.push(c as char);
    }
    id
}

fn crypto() -> web_sys::Crypto {
    crate::dom::window().crypto().expect("crypto unavailable")
}

/// Get today's date as "YYYY-MM-DD" using JS Date.
pub fn today_key() -> String {
  let date = js_sys::Date::new_0();
  let y = date.get_full_year();
  let m = date.get_month() + 1; // 0-indexed
  let d = date.get_date();
  format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Get current Unix timestamp in milliseconds.
pub fn now_epoch_ms() -> f64 {
  js_sys::Date::now()
}

/// Get ISO week key as "YYYY-Www" (e.g. "2026-W06"). Week starts Monday.
pub fn week_key() -> String {
    let date = js_sys::Date::new_0();
    let y = date.get_full_year() as i32;
    let m = date.get_month() + 1;
    let d = date.get_date();

    // Day of year
    let doy = day_of_year(y, m, d);

    // ISO weekday: Monday = 1, Sunday = 7
    let js_day = date.get_day(); // 0 = Sunday
    let iso_weekday = if js_day == 0 { 7 } else { js_day };

    // ISO week number
    let w = (doy + 10 - iso_weekday) / 7;

    if w == 0 {
        // Last week of previous year — use previous year's week 52 or 53
        let prev_y = y - 1;
        let last_week = max_iso_weeks(prev_y);
        format!("{prev_y:04}-W{last_week:02}")
    } else if w == 53 {
        // Check if this year actually has 53 weeks
        if max_iso_weeks(y) == 53 {
            format!("{y:04}-W53")
        } else {
            format!("{:04}-W01", y + 1)
        }
    } else if w > 53 {
        format!("{:04}-W01", y + 1)
    } else {
        format!("{y:04}-W{w:02}")
    }
}

fn is_leap(y: i32) -> bool {
    y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)
}

/// ISO weekday of Jan 1 for a given year (1=Mon..7=Sun) using Gauss's algorithm.
fn jan1_iso_weekday(y: i32) -> u32 {
    // Gauss: 0=Sun, 1=Mon..6=Sat
    let y0 = y - 1;
    let gauss = (1 + 5 * (y0 % 4) + 4 * (y0 % 100) + 6 * (y0 % 400)) % 7;
    // Convert 0=Sun → ISO 7=Sun, 1=Mon → 1, etc.
    if gauss == 0 { 7 } else { gauss as u32 }
}

/// Number of ISO weeks in a given year (52 or 53).
fn max_iso_weeks(y: i32) -> u32 {
    let jan1 = jan1_iso_weekday(y);
    // A year has 53 weeks if Jan 1 is Thursday, or if it's a leap year and Jan 1 is Wednesday
    if jan1 == 4 || (is_leap(y) && jan1 == 3) { 53 } else { 52 }
}

fn day_of_year(y: i32, m: u32, d: u32) -> u32 {
    let days_in_months: [u32; 13] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let leap: u32 = if is_leap(y) { 1 } else { 0 };
    let mut doy = d;
    for i in 1..m {
        doy += days_in_months[i as usize];
        if i == 2 { doy += leap; }
    }
    doy
}

/// Number of days in a given month (1-indexed).
fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(y) { 29 } else { 28 },
        _ => 30,
    }
}

/// Compute the previous day from a "YYYY-MM-DD" string.
pub fn prev_day_key(day: &str) -> String {
    let parts: Vec<&str> = day.split('-').collect();
    if parts.len() != 3 { return String::new(); }
    let y: i32 = parts[0].parse().unwrap_or(2025);
    let m: u32 = parts[1].parse().unwrap_or(1);
    let d: u32 = parts[2].parse().unwrap_or(1);

    if d > 1 {
        format!("{y:04}-{m:02}-{:02}", d - 1)
    } else {
        let (py, pm) = if m > 1 { (y, m - 1) } else { (y - 1, 12) };
        let dim = days_in_month(py, pm);
        format!("{py:04}-{pm:02}-{dim:02}")
    }
}

/// Get the day_key N days ago from today.
pub fn day_key_n_days_ago(n: u32) -> String {
    let mut current = today_key();
    for _ in 0..n {
        current = prev_day_key(&current);
    }
    current
}

/// Convert a day_key "YYYY-MM-DD" to a week_key "YYYY-Www".
pub fn week_key_from_day(day_key: &str) -> String {
    let parts: Vec<&str> = day_key.split('-').collect();
    if parts.len() != 3 { return week_key(); }

    let y: u32 = parts[0].parse().unwrap_or(2025);
    let m: i32 = parts[1].parse().unwrap_or(1);
    let d: i32 = parts[2].parse().unwrap_or(1);

    // Create a Date object for this specific day
    let date = js_sys::Date::new_with_year_month_day(y, m - 1, d);

    // Calculate day of year
    let doy = day_of_year(y as i32, m as u32, d as u32);

    // Get ISO weekday (Monday = 1, Sunday = 7)
    let js_day = date.get_day();
    let iso_weekday = if js_day == 0 { 7 } else { js_day };

    // Calculate ISO week number
    let w = (doy + 10 - iso_weekday) / 7;

    if w == 0 {
        let prev_y = (y as i32) - 1;
        let last_week = max_iso_weeks(prev_y);
        format!("{prev_y:04}-W{last_week:02}")
    } else if w == 53 {
        if max_iso_weeks(y as i32) == 53 {
            format!("{y:04}-W53")
        } else {
            format!("{:04}-W01", y + 1)
        }
    } else if w > 53 {
        format!("{:04}-W01", y + 1)
    } else {
        format!("{y:04}-W{w:02}")
    }
}

/// Get the last day of a week from a week_key "YYYY-Www".
/// Returns "YYYY-MM-DD" format (Sunday of that week).
pub fn week_key_end(week_start: &str) -> String {
    // Parse week_key "YYYY-Www"
    let parts: Vec<&str> = week_start.split('-').collect();
    if parts.len() != 2 { return today_key(); }

    let y: i32 = parts[0].parse().unwrap_or(2025);
    let week_str = parts[1].trim_start_matches('W');
    let w: u32 = week_str.parse().unwrap_or(1);

    // ISO week 1 is the first week with Thursday in it
    // Calculate the first day of week 1
    let jan1_weekday = jan1_iso_weekday(y);
    let week1_monday_offset = if jan1_weekday <= 4 {
        1 - jan1_weekday as i32
    } else {
        8 - jan1_weekday as i32
    };

    // Days from Jan 1 to the start of this week (Monday)
    let days_from_jan1 = week1_monday_offset + (w as i32 - 1) * 7;

    // End of week is 6 days after Monday (Sunday)
    let days_to_sunday = days_from_jan1 + 6;

    // Convert to actual date
    add_days_to_jan1(y, days_to_sunday)
}

/// Add N days to January 1st of a given year, returning "YYYY-MM-DD".
fn add_days_to_jan1(y: i32, days: i32) -> String {
    let mut year = y;
    let mut remaining = days;

    // Handle negative days (previous year)
    while remaining < 0 {
        year -= 1;
        remaining += if is_leap(year) { 366 } else { 365 };
    }

    // Handle overflow into next year
    let year_days = if is_leap(year) { 366 } else { 365 };
    while remaining >= year_days {
        remaining -= year_days;
        year += 1;
    }

    // Convert day-of-year to month/day
    let days_in_months: [u32; 13] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    let mut month = 1;
    let mut day_in_month = remaining as u32 + 1; // +1 because we start from day 0

    #[allow(clippy::needless_range_loop)]
    for m in 1..=12 {
        let mut month_days = days_in_months[m];
        if m == 2 && is_leap(year) {
            month_days += 1;
        }

        if day_in_month <= month_days {
            month = m as u32;
            break;
        }
        day_in_month -= month_days;
    }

    format!("{:04}-{:02}-{:02}", year, month, day_in_month)
}

/// Get the hour (0-23) from an epoch timestamp in milliseconds.
pub fn hour_from_epoch_ms(timestamp_ms: u64) -> u32 {
    let date = js_sys::Date::new(&(timestamp_ms as f64).into());
    date.get_hours()
}

/// Get day number since epoch (for deterministic rotation).
pub fn day_number_since_epoch() -> usize {
    let now_ms = now_epoch_ms() as u64;
    let days = now_ms / (1000 * 60 * 60 * 24);
    days as usize
}
