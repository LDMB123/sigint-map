# API Documentation

The externally documented API surface is intentionally kept small.
Treat the OpenAPI contract as the source of truth for request and response shape, then verify behavior in the Rust server and route tests.

## Canonical Contract

- `docs/api/OPENAPI_V1.yaml`

## Implementation Anchors

- `rust/crates/dmb_server/src/main.rs`
- `rust/crates/dmb_app/tests/route_parity.rs`
- `rust/crates/dmb_app/tests/route_render.rs`
- `rust/crates/dmb_app/tests/route_smoke.rs`

## Update This Area When

- A documented route is added, removed, or renamed.
- A response shape, error shape, or status code changes.
- Server-side behavior changes in a way that affects external consumers or parity expectations.
