use anyhow::Result;
use scraper::Html;
use serde_json::{Value, json};

use super::{
    BASE_URL, ScrapeClient, normalize_whitespace, regex, selector_or_warn, warn_if_empty,
    warn_if_missing_text, warn_missing_field,
};

pub(super) fn scrape_lists(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/Lists.aspx");
    let html = client.fetch_html(&url)?;
    Ok(parse_lists_page(&html))
}

pub(super) fn parse_lists_page(html: &str) -> Vec<Value> {
    let document = Html::parse_document(html);
    let Some(category_selector) = selector_or_warn(".release-series", ".release-series") else {
        return Vec::new();
    };
    let Some(header_selector) = selector_or_warn(".headerpanel", ".headerpanel") else {
        return Vec::new();
    };
    let Some(list_link_selector) =
        selector_or_warn("a[href*='ListView.aspx']", "a[href*='ListView.aspx']")
    else {
        return Vec::new();
    };
    warn_if_empty(&document, &list_link_selector, "lists", "list_link");
    let mut lists = Vec::new();

    for series in document.select(&category_selector) {
        let category = series.select(&header_selector).next().map_or_else(
            || "Lists".to_string(),
            |el| normalize_whitespace(&el.text().collect::<String>()),
        );
        for link in series.select(&list_link_selector) {
            let href = link.value().attr("href").unwrap_or("");
            let list_id = regex(r"id=(\\d+)")
                .captures(href)
                .and_then(|cap| cap.get(1))
                .map(|m| m.as_str().to_string());
            let title = normalize_whitespace(&link.text().collect::<String>());
            warn_if_missing_text("lists", "id", list_id.as_deref());
            warn_if_missing_text("lists", "title", Some(title.as_str()));
            lists.push(json!({
                "id": list_id,
                "title": title,
                "category": category,
            }));
        }
    }
    if lists.is_empty() {
        warn_missing_field("lists", "list");
    }
    lists
}
