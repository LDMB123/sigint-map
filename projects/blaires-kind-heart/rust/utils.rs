pub fn random_u32() -> u32 {
    let buf = js_sys::Uint32Array::new_with_length(1);
    if let Some(c) = crypto() {
        let _ = c.get_random_values_with_array_buffer_view(&buf);
    } else {
        return (js_sys::Math::random() * f64::from(u32::MAX)) as u32;
    }
    buf.get_index(0)
}
pub fn create_id() -> String {
    let buf = js_sys::Uint8Array::new_with_length(12);
    if let Some(c) = crypto() {
        let _ = c.get_random_values_with_array_buffer_view(&buf);
    } else {
        // Math.random fallback — not cryptographic but won't crash WASM
        let mut id = String::with_capacity(12);
        for _ in 0..12 {
            let n = (js_sys::Math::random() * 36.0) as u8;
            let c = if n < 10 { b'0' + n } else { b'a' + (n - 10) };
            id.push(c as char);
        }
        return id;
    }
    let mut id = String::with_capacity(12);
    for i in 0..12 {
        let n = buf.get_index(i) % 36;
        let c = if n < 10 { b'0' + n } else { b'a' + (n - 10) };
        id.push(c as char);
    }
    id
}
fn crypto() -> Option<web_sys::Crypto> {
    crate::dom::window().crypto().ok()
}
pub fn today_key() -> String {
    let date = js_sys::Date::new_0();
    let y = date.get_full_year();
    let m = date.get_month() + 1; // 0-indexed
    let d = date.get_date();
    format!("{y:04}-{m:02}-{d:02}")
}
pub fn now_epoch_ms() -> f64 {
    js_sys::Date::now()
}
pub fn week_key() -> String {
    let date = js_sys::Date::new_0();
    let y = date.get_full_year() as i32;
    let m = date.get_month() + 1;
    let d = date.get_date();
    let doy = day_of_year(y, m, d);
    let js_day = date.get_day();
    let iso_weekday = if js_day == 0 { 7 } else { js_day };
    iso_week_key(y, doy, iso_weekday)
}
fn iso_week_key(y: i32, doy: u32, iso_weekday: u32) -> String {
    let w = (doy + 10 - iso_weekday) / 7;
    if w == 0 {
        let prev_y = y - 1;
        let last_week = max_iso_weeks(prev_y);
        format!("{prev_y:04}-W{last_week:02}")
    } else if w == 53 {
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
const fn is_leap(y: i32) -> bool {
    y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)
}
const fn jan1_iso_weekday(y: i32) -> u32 {
    let y0 = y - 1;
    let gauss = (1 + 5 * (y0 % 4) + 4 * (y0 % 100) + 6 * (y0 % 400)) % 7;
    if gauss == 0 {
        7
    } else {
        gauss as u32
    }
}
fn max_iso_weeks(y: i32) -> u32 {
    let jan1 = jan1_iso_weekday(y);
    if jan1 == 4 || (is_leap(y) && jan1 == 3) {
        53
    } else {
        52
    }
}
fn day_of_year(y: i32, m: u32, d: u32) -> u32 {
    let days_in_months: [u32; 13] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let leap: u32 = u32::from(is_leap(y));
    let mut doy = d;
    for i in 1..m {
        doy += days_in_months[i as usize];
        if i == 2 {
            doy += leap;
        }
    }
    doy
}
fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}
pub fn prev_day_key(day: &str) -> String {
    let mut parts = day.splitn(3, '-');
    let (Some(ys), Some(ms), Some(ds)) = (parts.next(), parts.next(), parts.next()) else {
        return String::new();
    };
    let y: i32 = ys.parse().unwrap_or(2025);
    let m: u32 = ms.parse().unwrap_or(1);
    let d: u32 = ds.parse().unwrap_or(1);
    if d > 1 {
        format!("{y:04}-{m:02}-{:02}", d - 1)
    } else {
        let (py, pm) = if m > 1 { (y, m - 1) } else { (y - 1, 12) };
        let dim = days_in_month(py, pm);
        format!("{py:04}-{pm:02}-{dim:02}")
    }
}
pub fn day_key_n_days_ago(n: u32) -> String {
    let mut current = today_key();
    for _ in 0..n {
        current = prev_day_key(&current);
    }
    current
}
pub fn week_key_from_day(day_key: &str) -> String {
    let mut parts = day_key.splitn(3, '-');
    let (Some(ys), Some(ms), Some(ds)) = (parts.next(), parts.next(), parts.next()) else {
        return week_key();
    };
    let y: u32 = ys.parse().unwrap_or(2025);
    let m: i32 = ms.parse().unwrap_or(1);
    let d: i32 = ds.parse().unwrap_or(1);
    let date = js_sys::Date::new_with_year_month_day(y, m - 1, d);
    let doy = day_of_year(y as i32, m as u32, d as u32);
    let js_day = date.get_day();
    let iso_weekday = if js_day == 0 { 7 } else { js_day };
    iso_week_key(y as i32, doy, iso_weekday)
}
pub fn week_key_end(week_start: &str) -> String {
    let mut parts = week_start.splitn(2, '-');
    let (Some(ys), Some(ws)) = (parts.next(), parts.next()) else {
        return today_key();
    };
    let y: i32 = ys.parse().unwrap_or(2025);
    let week_str = ws.trim_start_matches('W');
    let w: u32 = week_str.parse().unwrap_or(1);
    let jan1_weekday = jan1_iso_weekday(y);
    let week1_monday_offset = if jan1_weekday <= 4 {
        1 - jan1_weekday as i32
    } else {
        8 - jan1_weekday as i32
    };
    let days_from_jan1 = week1_monday_offset + (w as i32 - 1) * 7;
    let days_to_sunday = days_from_jan1 + 6;
    add_days_to_jan1(y, days_to_sunday)
}
fn add_days_to_jan1(y: i32, days: i32) -> String {
    let mut year = y;
    let mut remaining = days;
    while remaining < 0 {
        year -= 1;
        remaining += if is_leap(year) { 366 } else { 365 };
    }
    let year_days = if is_leap(year) { 366 } else { 365 };
    while remaining >= year_days {
        remaining -= year_days;
        year += 1;
    }
    let days_in_months: [u32; 13] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1;
    let mut day_in_month = remaining as u32 + 1; // +1 because we start from day 0
    for (m, &md) in days_in_months[1..].iter().enumerate() {
        let m = m + 1;
        let mut month_days = md;
        if m == 2 && is_leap(year) {
            month_days += 1;
        }
        if day_in_month <= month_days {
            month = m as u32;
            break;
        }
        day_in_month -= month_days;
    }
    format!("{year:04}-{month:02}-{day_in_month:02}")
}
pub fn hour_from_epoch_ms(timestamp_ms: u64) -> u32 {
    let date = js_sys::Date::new(&(timestamp_ms as f64).into());
    date.get_hours()
}
pub fn day_number_since_epoch() -> usize {
    let now_ms = now_epoch_ms() as u64;
    let days = now_ms / (1000 * 60 * 60 * 24);
    days as usize
}
