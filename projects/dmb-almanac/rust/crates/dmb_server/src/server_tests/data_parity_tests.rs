use super::*;

#[test]
fn build_table_counts_query_empty() {
    assert!(build_table_counts_query(&[]).is_none());
}

#[test]
fn build_table_counts_query_subset() {
    let query = match build_table_counts_query(&["songs", "shows"]) {
        Some(query) => query,
        None => panic!("expected generated query"),
    };
    assert!(query.contains("SELECT 'songs', (SELECT COUNT(*) FROM songs)"));
    assert!(query.contains("UNION ALL SELECT 'shows', (SELECT COUNT(*) FROM shows)"));
}

#[tokio::test]
async fn data_parity_unavailable_without_sqlite_pool() {
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: None,
        data_parity_cache: new_data_parity_cache(),
    };
    let app = Router::new()
        .route("/api/data-parity", get(api_data_parity))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);

    let payload = parse_json_body(response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(false)
    );
    assert_eq!(
        payload
            .get("counts")
            .and_then(Value::as_object)
            .map(serde_json::Map::len),
        Some(0)
    );
    assert_eq!(
        payload
            .get("missingTables")
            .and_then(Value::as_array)
            .map(Vec::len),
        Some(0)
    );
}

#[tokio::test]
async fn data_parity_summary_unavailable_without_sqlite_pool() {
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: None,
        data_parity_cache: new_data_parity_cache(),
    };
    let app = Router::new()
        .route("/api/data-parity-summary", get(api_data_parity_summary))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity-summary")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);

    let payload = parse_json_body(response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(false)
    );
    assert_eq!(
        payload.get("sqliteTablesPresent").and_then(Value::as_u64),
        Some(0)
    );
    assert!(
        payload
            .get("sqliteTablesExpected")
            .and_then(Value::as_u64)
            .is_some(),
        "expected sqliteTablesExpected in summary payload"
    );
}

#[tokio::test]
async fn data_parity_summary_unavailable_from_cached_parity_response() {
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: None,
        data_parity_cache: new_data_parity_cache(),
    };
    let app = Router::new()
        .route("/api/data-parity", get(api_data_parity))
        .route("/api/data-parity-summary", get(api_data_parity_summary))
        .with_state(state);

    let parity_response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data-parity")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("parity response: {}", err));
    assert_eq!(parity_response.status(), StatusCode::OK);

    let summary_response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity-summary")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("summary response: {}", err));
    assert_eq!(summary_response.status(), StatusCode::OK);

    let payload = parse_json_body(summary_response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(false)
    );
    assert_eq!(
        payload.get("sqliteTablesPresent").and_then(Value::as_u64),
        Some(0)
    );
}

#[tokio::test]
async fn data_parity_reports_counts_and_missing_tables_for_partial_schema() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap_or_else(|err| panic!("sqlite pool: {}", err));
    sqlx::query("CREATE TABLE songs (id INTEGER PRIMARY KEY)")
        .execute(&pool)
        .await
        .unwrap_or_else(|err| panic!("create songs: {}", err));
    sqlx::query("INSERT INTO songs (id) VALUES (1), (2)")
        .execute(&pool)
        .await
        .unwrap_or_else(|err| panic!("insert songs: {}", err));

    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: Some(pool),
        data_parity_cache: new_data_parity_cache(),
    };
    let app = Router::new()
        .route("/api/data-parity", get(api_data_parity))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);

    let payload = parse_json_body(response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(true)
    );
    assert_eq!(
        payload
            .get("counts")
            .and_then(Value::as_object)
            .and_then(|counts| counts.get("songs"))
            .and_then(Value::as_u64),
        Some(2)
    );
    let missing_tables = payload
        .get("missingTables")
        .and_then(Value::as_array)
        .unwrap_or_else(|| panic!("missingTables array"));
    let missing: Vec<&str> = missing_tables.iter().filter_map(Value::as_str).collect();
    assert!(missing.contains(&"shows"));
    assert!(missing.contains(&"venues"));
}

#[tokio::test]
async fn data_parity_summary_reports_missing_tables_for_partial_schema() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap_or_else(|err| panic!("sqlite pool: {}", err));
    sqlx::query("CREATE TABLE songs (id INTEGER PRIMARY KEY)")
        .execute(&pool)
        .await
        .unwrap_or_else(|err| panic!("create songs: {}", err));

    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: Some(pool),
        data_parity_cache: new_data_parity_cache(),
    };
    let app = Router::new()
        .route("/api/data-parity-summary", get(api_data_parity_summary))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity-summary")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);

    let payload = parse_json_body(response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(true)
    );
    assert_eq!(
        payload.get("sqliteTablesPresent").and_then(Value::as_u64),
        Some(1)
    );
    let expected = payload
        .get("sqliteTablesExpected")
        .and_then(Value::as_u64)
        .unwrap_or_else(|| panic!("sqliteTablesExpected"));
    assert!(expected > 1, "expected more than one parity table");

    let missing_tables = payload
        .get("missingTables")
        .and_then(Value::as_array)
        .unwrap_or_else(|| panic!("missingTables array"));
    let missing: Vec<&str> = missing_tables.iter().filter_map(Value::as_str).collect();
    assert!(missing.contains(&"shows"));
    assert!(missing.contains(&"venues"));
}

#[tokio::test]
async fn data_parity_ignores_stale_cache_entries() {
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: None,
        data_parity_cache: new_data_parity_cache(),
    };
    {
        let mut cache = state.data_parity_cache.write().await;
        *cache = Some(DataParityCacheEntry {
            generated_at: std::time::Instant::now()
                .checked_sub(DATA_PARITY_CACHE_TTL + std::time::Duration::from_secs(1))
                .unwrap_or_else(|| panic!("stale cache instant")),
            response: DataParityResponse {
                available: true,
                counts: [("songs".to_string(), 42_u64)].into_iter().collect(),
                missing_tables: vec!["shows".to_string()],
            },
        });
    }

    let app = Router::new()
        .route("/api/data-parity", get(api_data_parity))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/data-parity")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);

    let payload = parse_json_body(response).await;
    assert_eq!(
        payload.get("available").and_then(Value::as_bool),
        Some(false)
    );
    assert_eq!(
        payload
            .get("counts")
            .and_then(Value::as_object)
            .map(serde_json::Map::len),
        Some(0)
    );
}
