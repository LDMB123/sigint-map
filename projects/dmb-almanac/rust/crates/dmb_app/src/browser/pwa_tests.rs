use super::{
    IngressSource, OpenFileRequest, ProtocolPayload, WebgpuRuntimeConfig, build_search_location,
    current_search_destination, current_search_query_seed, describe_open_file_request,
    normalized_app_route, normalized_item_route, open_file_destination, parse_protocol_payload,
    protocol_destination, resolve_ingress_destination,
};

#[test]
fn parse_protocol_payload_defaults_without_value() {
    let payload = parse_protocol_payload(None);
    assert_eq!(
        payload,
        ProtocolPayload {
            raw: None,
            route: "/protocol".to_string(),
            query: None,
            status: "No protocol payload.".to_string(),
        }
    );
}

#[test]
fn parse_protocol_payload_maps_search() {
    let payload = parse_protocol_payload(Some("web+dmb://search?q=warehouse".to_string()));
    assert_eq!(payload.route, "/search");
    assert_eq!(payload.query.as_deref(), Some("warehouse"));
}

#[test]
fn build_search_location_omits_all_filter() {
    let next = build_search_location("/search", "", "warehouse", "all");
    assert_eq!(next, "/search?q=warehouse");
}

#[test]
fn describe_open_file_request_detects_json_object() {
    let request = OpenFileRequest {
        name: "payload.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 18,
        content: "{\"songs\":[1,2]}".to_string(),
        source: "manual".to_string(),
    };
    assert!(describe_open_file_request(&request).contains("JSON object"));
}

#[test]
fn webgpu_runtime_config_defaults_are_stable() {
    let config = WebgpuRuntimeConfig::default();
    assert_eq!(config.score_workgroup_size, 0);
    assert!(config.power_preference.is_empty());
    assert!(!config.eager_warmup);
    assert!(!config.prime_matrix_on_worker_init);
}

#[test]
fn current_search_query_seed_noops_without_hydrate() {
    let _ = current_search_query_seed();
}

#[test]
fn current_search_destination_noops_without_hydrate() {
    let destination = current_search_destination();
    assert_eq!(destination.route, "/search");
    assert!(destination.query.is_none());
}

#[test]
fn protocol_destination_maps_search_route() {
    let payload = parse_protocol_payload(Some("web+dmb://search?q=warehouse".to_string()));
    let destination = protocol_destination(&payload).expect("search destination");
    assert_eq!(destination.route, "/search?q=warehouse");
    assert_eq!(destination.query.as_deref(), Some("warehouse"));
}

#[test]
fn open_file_destination_maps_text_to_search() {
    let request = OpenFileRequest {
        name: "query.txt".to_string(),
        mime: "text/plain".to_string(),
        size_bytes: 9,
        content: "warehouse".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("text destination");
    assert_eq!(destination.route, "/search?q=warehouse");
}

#[test]
fn open_file_destination_maps_typed_release_payload() {
    let request = OpenFileRequest {
        name: "release.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 55,
        content: "{\"type\":\"release\",\"slug\":\"away-from-the-world\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("release destination");
    assert_eq!(destination.route, "/releases/away-from-the-world");
}

#[test]
fn open_file_destination_maps_numeric_show_id_payload() {
    let request = OpenFileRequest {
        name: "show.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 32,
        content: "{\"type\":\"show\",\"id\":2122}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("show destination");
    assert_eq!(destination.route, "/shows/2122");
}

#[test]
fn open_file_destination_maps_app_url_payload() {
    let request = OpenFileRequest {
        name: "link.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 64,
        content: "{\"url\":\"https://dmbalmanac.com/releases/away-from-the-world\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("linked destination");
    assert_eq!(destination.route, "/releases/away-from-the-world");
}

#[test]
fn open_file_destination_maps_nested_show_entity_payload() {
    let request = OpenFileRequest {
        name: "show-record.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 80,
        content: "{\"show\":{\"id\":2122,\"date\":\"1992-01-04\",\"venueId\":21}}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("nested show destination");
    assert_eq!(destination.route, "/shows/2122");
}

#[test]
fn open_file_destination_maps_nested_guest_entity_payload() {
    let request = OpenFileRequest {
        name: "guest-record.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 72,
        content: "{\"guest\":{\"slug\":\"bla-fleck\",\"instrument\":\"banjo\"}}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("nested guest destination");
    assert_eq!(destination.route, "/guests/bla-fleck");
}

#[test]
fn open_file_destination_maps_snake_case_guest_payload() {
    let request = OpenFileRequest {
        name: "guest-record.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 48,
        content: "{\"entity_type\":\"guest\",\"guest_slug\":\"bla-fleck\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("guest destination");
    assert_eq!(destination.route, "/guests/bla-fleck");
}

#[test]
fn normalized_app_route_accepts_www_hosted_routes() {
    let route = normalized_app_route("https://www.dmbalmanac.com/releases/away-from-the-world");
    assert_eq!(route.as_deref(), Some("/releases/away-from-the-world"));
}

#[test]
fn normalized_item_route_maps_legacy_show_and_venue_pages() {
    let show_route =
        normalized_app_route("https://www.dmbalmanac.com//TourShowSet.aspx?id=453094313");
    assert_eq!(show_route.as_deref(), Some("/shows"));

    let venue_route = normalized_app_route("https://www.dmbalmanac.com//VenueStats.aspx?vid=1369");
    assert_eq!(venue_route.as_deref(), Some("/venues/1369"));
}

#[test]
fn normalized_item_route_maps_legacy_show_pages_with_title_context() {
    let show_route = normalized_item_route(
        "https://www.dmbalmanac.com//TourShowSet.aspx?id=453094313",
        Some("show"),
        Some("08.15.92"),
        None,
    );
    assert_eq!(show_route.as_deref(), Some("/search?q=1992-08-15"));
}

#[test]
fn normalized_item_route_maps_legacy_show_pages_with_notes_context() {
    let show_route = normalized_item_route(
        "https://www.dmbalmanac.com//TourShowSet.aspx?id=48318",
        Some("show"),
        Some("13:16"),
        Some("1 | 8:08 | 09.04.11 | The Gorge Amphitheatre, George, WA | (lyrics)"),
    );
    assert_eq!(show_route.as_deref(), Some("/search?q=2011-09-04"));
}

#[test]
fn normalized_item_route_maps_legacy_show_pages_by_known_timeline_context() {
    let show_route = normalized_item_route(
        "https://www.dmbalmanac.com//TourShowSet.aspx?id=55684",
        Some("show"),
        Some("Over the Rainbow"),
        Some("Boyd, Carter, Dave, LeRoi, Boyd"),
    );
    assert_eq!(show_route.as_deref(), Some("/search?q=1994-04-20"));
}

#[test]
fn normalized_item_route_maps_legacy_show_pages_to_next_timeline_anchor() {
    let show_route = normalized_item_route(
        "https://www.dmbalmanac.com//TourShowSet.aspx?id=29509",
        Some("show"),
        Some("Recently"),
        Some("Trey"),
    );
    assert_eq!(show_route.as_deref(), Some("/search?q=1995-02-24"));
}

#[test]
fn normalized_item_route_maps_legacy_release_pages() {
    let release_route = normalized_item_route(
        "https://www.dmbalmanac.com//ReleaseView.aspx?release=14",
        Some("release"),
        Some("Away From the World"),
        None,
    );
    assert_eq!(
        release_route.as_deref(),
        Some("/releases/away-from-the-world")
    );

    let list_route = normalized_app_route("https://www.dmbalmanac.com//Releases.aspx");
    assert_eq!(list_route.as_deref(), Some("/releases"));
}

#[test]
fn normalized_item_route_maps_legacy_release_pages_by_known_id_when_title_is_unknown() {
    let release_route = normalized_item_route(
        "https://www.dmbalmanac.com//ReleaseView.aspx?release=14",
        Some("release"),
        Some("Unknown"),
        None,
    );
    assert_eq!(
        release_route.as_deref(),
        Some("/releases/away-from-the-world")
    );
}

#[test]
fn normalized_app_route_rejects_protocol_relative_routes() {
    assert_eq!(normalized_app_route("//evil.test"), None);
    assert_eq!(
        normalized_app_route("https://dmbalmanac.com//evil.test"),
        None
    );
    assert_eq!(
        normalized_app_route("https://www.dmbalmanac.com//evil.test"),
        None
    );
}

#[test]
fn open_file_destination_maps_legacy_release_link_payload() {
    let request = OpenFileRequest {
        name: "release-link.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 118,
        content: "{\"itemType\":\"release\",\"itemTitle\":\"Away From the World\",\"itemLink\":\"https://www.dmbalmanac.com//ReleaseView.aspx?release=14\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("legacy release destination");
    assert_eq!(destination.route, "/releases/away-from-the-world");
}

#[test]
fn open_file_destination_maps_legacy_show_link_payload() {
    let request = OpenFileRequest {
        name: "show-link.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 111,
        content: "{\"itemType\":\"show\",\"itemTitle\":\"08.15.92\",\"itemLink\":\"https://www.dmbalmanac.com//TourShowSet.aspx?id=453094313\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("legacy show destination");
    assert_eq!(destination.route, "/search?q=1992-08-15");
}

#[test]
fn open_file_destination_maps_legacy_show_link_payload_from_notes_context() {
    let request = OpenFileRequest {
        name: "show-link-notes.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 181,
        content: "{\"itemType\":\"show\",\"itemTitle\":\"13:16\",\"itemLink\":\"https://www.dmbalmanac.com//TourShowSet.aspx?id=48318\",\"notes\":\"1 | 8:08 | 09.04.11 | The Gorge Amphitheatre, George, WA | (lyrics)\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination = open_file_destination(&request).expect("legacy show destination from notes");
    assert_eq!(destination.route, "/search?q=2011-09-04");
}

#[test]
fn open_file_destination_maps_legacy_show_link_payload_by_known_timeline_context() {
    let request = OpenFileRequest {
        name: "show-link-entry-id.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 171,
        content: "{\"itemType\":\"show\",\"itemTitle\":\"Over the Rainbow\",\"itemLink\":\"https://www.dmbalmanac.com//TourShowSet.aspx?id=55684\",\"notes\":\"Boyd, Carter, Dave, LeRoi, Boyd\"}".to_string(),
        source: "manual".to_string(),
    };
    let destination =
        open_file_destination(&request).expect("legacy show destination from entry id");
    assert_eq!(destination.route, "/search?q=1994-04-20");
}

#[test]
fn resolve_ingress_destination_maps_protocol_and_file_sources() {
    let protocol = resolve_ingress_destination(IngressSource::Protocol(ProtocolPayload {
        raw: Some("web+dmb://search?q=warehouse".to_string()),
        route: "/search".to_string(),
        query: Some("warehouse".to_string()),
        status: "Protocol payload mapped to search.".to_string(),
    }))
    .expect("protocol destination");
    assert_eq!(protocol.route, "/search?q=warehouse");

    let file = resolve_ingress_destination(IngressSource::OpenFile(OpenFileRequest {
        name: "release.json".to_string(),
        mime: "application/json".to_string(),
        size_bytes: 55,
        content: "{\"type\":\"release\",\"slug\":\"away-from-the-world\"}".to_string(),
        source: "manual".to_string(),
    }))
    .expect("file destination");
    assert_eq!(file.route, "/releases/away-from-the-world");
}
