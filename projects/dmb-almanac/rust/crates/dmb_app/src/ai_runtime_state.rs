use super::*;

#[cfg(feature = "hydrate")]
pub(crate) fn js_value_exists(value: &JsValue) -> bool {
    !value.is_null() && !value.is_undefined()
}

#[cfg(feature = "hydrate")]
pub(crate) fn navigator_property(name: &str) -> JsValue {
    crate::browser::runtime::navigator_property_or_undefined(name)
}

#[cfg(feature = "hydrate")]
thread_local! {
    pub(crate) static WEBGPU_DISABLED_CACHE: RefCell<Option<bool>> = const { RefCell::new(None) };
    pub(crate) static WORKER_THRESHOLD_READY: RefCell<bool> = const { RefCell::new(false) };
    pub(crate) static WEBGPU_MATRIX_JS_CACHE: RefCell<Option<WebgpuMatrixJsCache>> = const { RefCell::new(None) };
    pub(crate) static WEBGPU_WORKER_MATRIX_SIGNATURE: RefCell<Option<WebgpuMatrixJsSignature>> = const { RefCell::new(None) };
    pub(crate) static WEBGPU_SUBSET_MATRIX_BUFFER: RefCell<Vec<f32>> = const { RefCell::new(Vec::new()) };
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen(inline_js = r#"
function dmbTopKScores(scores, sourceIndices, k) {
  const scoresLen = scores?.length ?? 0;
  const indicesLen = sourceIndices?.length ?? scoresLen;
  const len = Math.min(scoresLen, indicesLen);
  if (len === 0) {
    return [new Uint32Array(0), new Float32Array(0)];
  }

  const keep = Math.max(1, Math.min((k >>> 0) || 1, len));
  const topIndices = new Uint32Array(keep);
  const topScores = new Float32Array(keep);
  let topLen = 0;

  for (let index = 0; index < len; index += 1) {
    const score = scores[index];
    const sourceIndex = sourceIndices ? sourceIndices[index] : index;
    if (topLen === keep) {
      const last = topLen - 1;
      const worstScore = topScores[last];
      const worstIndex = topIndices[last];
      if (score < worstScore || (score === worstScore && sourceIndex <= worstIndex)) {
        continue;
      }
    }

    let insertAt = topLen;
    while (insertAt > 0) {
      const prev = insertAt - 1;
      const prevScore = topScores[prev];
      const prevIndex = topIndices[prev];
      if (score < prevScore || (score === prevScore && sourceIndex <= prevIndex)) {
        break;
      }
      insertAt = prev;
    }

    if (topLen < keep) {
      topLen += 1;
    }
    for (let shift = topLen - 1; shift > insertAt; shift -= 1) {
      topScores[shift] = topScores[shift - 1];
      topIndices[shift] = topIndices[shift - 1];
    }
    topScores[insertAt] = score;
    topIndices[insertAt] = sourceIndex;
  }

  return [topIndices.subarray(0, topLen), topScores.subarray(0, topLen)];
}

export function dmb_top_k_scores(scores, k) {
  return dmbTopKScores(scores, null, k);
}
"#)]
extern "C" {
    pub(crate) fn dmb_top_k_scores(scores: &JsValue, k: u32) -> js_sys::Array;
}

#[cfg(feature = "hydrate")]
#[derive(Clone)]
pub(crate) struct WebgpuMatrixJsCache {
    pub(crate) signature: WebgpuMatrixJsSignature,
    pub(crate) array: js_sys::Float32Array,
}

#[cfg(feature = "hydrate")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct WebgpuMatrixJsSignature {
    ptr: usize,
    len: usize,
    first_bits: u32,
    middle_bits: u32,
    last_bits: u32,
}

#[cfg(feature = "hydrate")]
pub(crate) fn matrix_js_signature(matrix: &[f32]) -> WebgpuMatrixJsSignature {
    let len = matrix.len();
    let first = matrix.first().copied().unwrap_or_default().to_bits();
    let middle = matrix.get(len / 2).copied().unwrap_or_default().to_bits();
    let last = matrix.last().copied().unwrap_or_default().to_bits();
    WebgpuMatrixJsSignature {
        ptr: matrix.as_ptr() as usize,
        len,
        first_bits: first,
        middle_bits: middle,
        last_bits: last,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn worker_matrix_requires_init(signature: WebgpuMatrixJsSignature) -> bool {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        cache
            .borrow()
            .as_ref()
            .is_none_or(|existing| *existing != signature)
    })
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_worker_matrix_signature(signature: WebgpuMatrixJsSignature) {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        *cache.borrow_mut() = Some(signature);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn clear_worker_matrix_signature() {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn parse_webgpu_disabled(value: Option<String>) -> bool {
    value
        .map(|item| item == "1" || item.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

#[cfg(feature = "hydrate")]
pub(crate) fn webgpu_disabled_value() -> bool {
    WEBGPU_DISABLED_CACHE.with(|cache| {
        if let Some(value) = *cache.borrow() {
            return value;
        }
        let loaded = parse_webgpu_disabled(local_storage_item(WEBGPU_DISABLE_KEY));
        *cache.borrow_mut() = Some(loaded);
        loaded
    })
}

#[cfg(feature = "hydrate")]
pub(crate) fn worker_threshold_ready() -> bool {
    WORKER_THRESHOLD_READY.with(|ready| *ready.borrow())
}

#[cfg(feature = "hydrate")]
pub(crate) fn mark_worker_threshold_ready() {
    WORKER_THRESHOLD_READY.with(|ready| {
        *ready.borrow_mut() = true;
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn reset_worker_threshold_ready() {
    WORKER_THRESHOLD_READY.with(|ready| {
        *ready.borrow_mut() = false;
    });
}
