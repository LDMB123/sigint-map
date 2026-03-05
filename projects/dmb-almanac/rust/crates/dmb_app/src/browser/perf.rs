#[derive(Clone, Debug, Default, PartialEq)]
pub struct InpMetricsSnapshot {
    pub supported: bool,
    pub p75_interaction_ms: Option<f64>,
    pub long_frame_count: u32,
    pub interaction_count: Option<u32>,
}

#[cfg(feature = "hydrate")]
use wasm_bindgen::{JsCast, JsValue};

#[cfg(feature = "hydrate")]
fn performance_metrics_object() -> Option<JsValue> {
    let _window = web_sys::window()?;
    Some(crate::browser::runtime::window_property_or_undefined(
        "__DMB_PERF_METRICS",
    ))
}

#[cfg(feature = "hydrate")]
pub fn ensure_perf_observers_started() {
    let installer = js_sys::Function::new_no_args(
        r#"
(() => {
  const w = window;
  if (!w || w.__DMB_PERF_OBS_INIT) return;
  w.__DMB_PERF_OBS_INIT = true;

  const now = () =>
    w.performance && typeof w.performance.now === "function"
      ? w.performance.now()
      : Date.now();

  const metrics = (w.__DMB_PERF_METRICS = {
    supported: false,
    eventTiming: false,
    loaf: false,
    interactions: [],
    longFrames: [],
    interactionCount: null,
    lastInteractionTs: 0,
    windowMs: 5 * 60 * 1000,
  });

  const prune = () => {
    const cutoff = now() - metrics.windowMs;
    metrics.interactions = metrics.interactions.filter((item) => item && item.ts >= cutoff);
    metrics.longFrames = metrics.longFrames.filter((ts) => typeof ts === "number" && ts >= cutoff);
  };

  const recordInteraction = (entry) => {
    if (!entry) return;
    const duration = Number(entry.duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) return;
    const ts = Number(entry.startTime || now());
    if (!Number.isFinite(ts)) return;
    const interactionCount = Number(entry.interactionCount);
    if (Number.isFinite(interactionCount) && interactionCount >= 0) {
      metrics.interactionCount = Math.max(metrics.interactionCount || 0, interactionCount);
    }
    metrics.interactions.push({
      ts,
      duration,
      interactionId: Number(entry.interactionId || 0),
      renderStart: Number(entry.renderStart || 0),
      styleAndLayoutStart: Number(entry.styleAndLayoutStart || 0),
      firstUIEventTimestamp: Number(entry.firstUIEventTimestamp || 0),
    });
    metrics.lastInteractionTs = ts;
    metrics.supported = true;
  };

  try {
    if (
      "PerformanceObserver" in self &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes("event")
    ) {
      const eventObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          recordInteraction(entry);
        }
        prune();
      });
      eventObserver.observe({ type: "event", buffered: true, durationThreshold: 16 });
      metrics.eventTiming = true;
    }
  } catch (_) {}

  try {
    if (
      "PerformanceObserver" in self &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")
    ) {
      const loafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const ts = Number(entry.startTime || now());
          if (Number.isFinite(ts)) {
            metrics.longFrames.push(ts);
          }
          const firstUI = Number(entry.firstUIEventTimestamp || 0);
          if (Number.isFinite(firstUI) && firstUI > 0) {
            metrics.lastInteractionTs = Math.max(metrics.lastInteractionTs || 0, firstUI);
          }
        }
        metrics.supported = true;
        prune();
      });
      loafObserver.observe({ type: "long-animation-frame", buffered: true });
      metrics.loaf = true;
    }
  } catch (_) {}

  metrics.compute = function () {
    prune();
    const durations = metrics.interactions
      .map((item) => Number(item.duration || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    let p75 = null;
    if (durations.length > 0) {
      const index = Math.max(0, Math.ceil(durations.length * 0.75) - 1);
      p75 = durations[index];
    }

    return {
      supported: !!(metrics.eventTiming || metrics.loaf),
      p75InteractionMs: p75,
      longFrameCount: metrics.longFrames.length,
      interactionCount: metrics.interactionCount,
      sampleSize: durations.length,
    };
  };
})();
"#,
    );
    let _ = installer.call0(&JsValue::NULL);
}

#[cfg(not(feature = "hydrate"))]
pub fn ensure_perf_observers_started() {}

#[cfg(feature = "hydrate")]
pub fn latest_inp_metrics_snapshot() -> Option<InpMetricsSnapshot> {
    ensure_perf_observers_started();
    let metrics = performance_metrics_object()?;
    if metrics.is_null() || metrics.is_undefined() {
        return Some(InpMetricsSnapshot::default());
    }
    let compute = crate::browser::runtime::property_or_undefined(&metrics, "compute")
        .dyn_into::<js_sys::Function>()
        .ok()?;
    let summary = compute.call0(&metrics).ok()?;

    let supported = crate::browser::runtime::property_or_undefined(&summary, "supported")
        .as_bool()
        .unwrap_or(false);
    let p75_interaction_ms = crate::browser::runtime::property_f64(&summary, "p75InteractionMs")
        .filter(|value| value.is_finite());
    let long_frame_count = crate::browser::runtime::property_f64(&summary, "longFrameCount")
        .filter(|value| value.is_finite() && *value >= 0.0)
        .unwrap_or(0.0) as u32;
    let interaction_count = crate::browser::runtime::property_f64(&summary, "interactionCount")
        .filter(|value| value.is_finite() && *value >= 0.0)
        .map(|value| value as u32);

    Some(InpMetricsSnapshot {
        supported,
        p75_interaction_ms,
        long_frame_count,
        interaction_count,
    })
}

#[cfg(not(feature = "hydrate"))]
pub fn latest_inp_metrics_snapshot() -> Option<InpMetricsSnapshot> {
    None
}

#[cfg(feature = "hydrate")]
pub fn has_recent_interaction(window_ms: f64) -> bool {
    ensure_perf_observers_started();
    let Some(metrics) = performance_metrics_object() else {
        return false;
    };
    let Some(last_interaction_ts) =
        crate::browser::runtime::property_f64(&metrics, "lastInteractionTs")
    else {
        return false;
    };

    let now_ms = web_sys::window()
        .and_then(|window| window.performance())
        .map(|performance| performance.now())
        .unwrap_or_else(js_sys::Date::now);

    (now_ms - last_interaction_ts).abs() <= window_ms.max(0.0)
}

#[cfg(not(feature = "hydrate"))]
pub fn has_recent_interaction(_window_ms: f64) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::InpMetricsSnapshot;

    #[test]
    fn inp_snapshot_default_is_stable() {
        let snapshot = InpMetricsSnapshot::default();
        assert!(!snapshot.supported);
        assert_eq!(snapshot.p75_interaction_ms, None);
        assert_eq!(snapshot.long_frame_count, 0);
        assert_eq!(snapshot.interaction_count, None);
    }

    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn perf_apis_are_noops_without_hydrate() {
        super::ensure_perf_observers_started();
        assert_eq!(super::latest_inp_metrics_snapshot(), None);
        assert!(!super::has_recent_interaction(120.0));
    }
}
