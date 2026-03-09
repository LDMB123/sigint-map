use super::*;

#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;

#[cfg(feature = "hydrate")]
#[wasm_bindgen::prelude::wasm_bindgen(inline_js = r#"
let dmbDeferredInstallPrompt = null;
let dmbInstallCallbacksRegistered = false;
let dmbLaunchQueueRegistered = false;

function dmbRoot() {
  return typeof window !== 'undefined' ? window : globalThis;
}

function dmbStandaloneMode() {
  const root = dmbRoot();
  if (!root || typeof root.matchMedia !== 'function') {
    return false;
  }
  try {
    return root.matchMedia('(display-mode: standalone)').matches;
  } catch (_) {
    return false;
  }
}

async function dmbSerializeFile(file, source) {
  const content = await file.text();
  return {
    name: file?.name || 'unnamed',
    mime: file?.type || '',
    sizeBytes: Number(file?.size || 0),
    content,
    source,
  };
}

export function dmb_register_launch_queue_consumer() {
  const root = dmbRoot();
  if (!root || !('launchQueue' in root)) {
    return false;
  }
  if (dmbLaunchQueueRegistered) {
    return true;
  }
  dmbLaunchQueueRegistered = true;
  root.launchQueue.setConsumer(async (launchParams) => {
    const first = launchParams?.files?.[0];
    if (!first) {
      return;
    }
    try {
      const file = await first.getFile();
      root.__DMB_PENDING_OPEN_FILE = await dmbSerializeFile(file, 'launchQueue');
      root.dispatchEvent(new CustomEvent('dmb:launch-file-ready'));
    } catch (_) {
      root.__DMB_PENDING_OPEN_FILE = null;
    }
  });
  return true;
}

export function dmb_take_pending_launch_file() {
  const root = dmbRoot();
  if (!root) {
    return null;
  }
  const next = root.__DMB_PENDING_OPEN_FILE || null;
  root.__DMB_PENDING_OPEN_FILE = null;
  return next;
}

export function dmb_read_import_file_from_event(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) {
    return Promise.resolve(null);
  }
  return dmbSerializeFile(file, 'manual');
}

export function dmb_install_prompt_supported() {
  const root = dmbRoot();
  return !!root && typeof root.addEventListener === 'function';
}

export function dmb_install_prompt_available() {
  return !!dmbDeferredInstallPrompt;
}

export function dmb_install_prompt_installed() {
  return dmbStandaloneMode();
}

export function dmb_register_install_prompt_callbacks(availableCb, installedCb) {
  const root = dmbRoot();
  if (!root || typeof root.addEventListener !== 'function') {
    return false;
  }

  if (!dmbInstallCallbacksRegistered) {
    dmbInstallCallbacksRegistered = true;
    root.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      dmbDeferredInstallPrompt = event;
      if (typeof availableCb === 'function') {
        availableCb(true);
      }
    });
    root.addEventListener('appinstalled', () => {
      dmbDeferredInstallPrompt = null;
      if (typeof availableCb === 'function') {
        availableCb(false);
      }
      if (typeof installedCb === 'function') {
        installedCb();
      }
    });
  }

  if (typeof availableCb === 'function') {
    availableCb(!!dmbDeferredInstallPrompt);
  }
  if (dmbStandaloneMode() && typeof installedCb === 'function') {
    installedCb();
  }
  return true;
}

export async function dmb_prompt_install() {
  if (!dmbDeferredInstallPrompt) {
    return false;
  }
  const event = dmbDeferredInstallPrompt;
  dmbDeferredInstallPrompt = null;
  await event.prompt();
  const choice = await event.userChoice;
  return choice?.outcome === 'accepted';
}
"#)]
extern "C" {
    fn dmb_register_launch_queue_consumer() -> bool;
    fn dmb_take_pending_launch_file() -> wasm_bindgen::JsValue;
    fn dmb_read_import_file_from_event(event: &web_sys::Event) -> js_sys::Promise;
    fn dmb_install_prompt_supported() -> bool;
    fn dmb_install_prompt_available() -> bool;
    fn dmb_install_prompt_installed() -> bool;
    fn dmb_register_install_prompt_callbacks(
        available_cb: &js_sys::Function,
        installed_cb: &js_sys::Function,
    ) -> bool;
    fn dmb_prompt_install() -> js_sys::Promise;
}

#[cfg(feature = "hydrate")]
pub fn initialize_runtime() {
    let _ = dmb_register_launch_queue_consumer();
}

#[cfg(not(feature = "hydrate"))]
pub fn initialize_runtime() {}

#[cfg(feature = "hydrate")]
pub async fn read_import_file_from_event(event: web_sys::Event) -> Option<OpenFileRequest> {
    let value = wasm_bindgen_futures::JsFuture::from(dmb_read_import_file_from_event(&event))
        .await
        .ok()?;
    if value.is_null() || value.is_undefined() {
        return None;
    }
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(not(feature = "hydrate"))]
pub async fn read_import_file_from_event(_event: web_sys::Event) -> Option<OpenFileRequest> {
    None
}

#[cfg(feature = "hydrate")]
pub fn take_pending_launch_file() -> Option<OpenFileRequest> {
    let value = dmb_take_pending_launch_file();
    if value.is_null() || value.is_undefined() {
        return None;
    }
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn take_pending_launch_file() -> Option<OpenFileRequest> {
    None
}

pub fn stage_open_file_request(request: &OpenFileRequest) {
    crate::browser::storage::set_local_storage_json(STAGED_OPEN_FILE_KEY, request);
}

pub fn staged_open_file_request() -> Option<OpenFileRequest> {
    crate::browser::storage::local_storage_json(STAGED_OPEN_FILE_KEY)
}

pub fn clear_staged_open_file_request() {
    crate::browser::storage::remove_local_storage_item(STAGED_OPEN_FILE_KEY);
}

pub fn install_prompt_state() -> InstallPromptState {
    InstallPromptState {
        supported: install_prompt_supported(),
        available: install_prompt_available(),
        installed: install_prompt_installed(),
        dismissed_at_ms: crate::browser::storage::local_storage_f64(INSTALL_DISMISSED_AT_KEY),
    }
}

#[cfg(feature = "hydrate")]
pub fn register_install_prompt_callbacks(
    on_available: impl Fn(bool) + 'static,
    on_installed: impl Fn() + 'static,
) -> bool {
    let available_cb =
        wasm_bindgen::closure::Closure::wrap(Box::new(on_available) as Box<dyn Fn(bool)>);
    let installed_cb =
        wasm_bindgen::closure::Closure::wrap(Box::new(on_installed) as Box<dyn Fn()>);
    let registered = dmb_register_install_prompt_callbacks(
        available_cb.as_ref().unchecked_ref(),
        installed_cb.as_ref().unchecked_ref(),
    );
    available_cb.forget();
    installed_cb.forget();
    registered
}

#[cfg(not(feature = "hydrate"))]
pub fn register_install_prompt_callbacks(
    _on_available: impl Fn(bool) + 'static,
    _on_installed: impl Fn() + 'static,
) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn prompt_install() -> bool {
    wasm_bindgen_futures::JsFuture::from(dmb_prompt_install())
        .await
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

#[cfg(not(feature = "hydrate"))]
pub async fn prompt_install() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn install_prompt_supported() -> bool {
    dmb_install_prompt_supported()
}

#[cfg(not(feature = "hydrate"))]
pub fn install_prompt_supported() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn install_prompt_available() -> bool {
    dmb_install_prompt_available()
}

#[cfg(not(feature = "hydrate"))]
pub fn install_prompt_available() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn install_prompt_installed() -> bool {
    dmb_install_prompt_installed()
}

#[cfg(not(feature = "hydrate"))]
pub fn install_prompt_installed() -> bool {
    false
}

pub fn capability_matrix() -> PwaCapabilityMatrix {
    PwaCapabilityMatrix {
        service_worker: crate::browser::runtime::navigator_service_worker_container().is_some(),
        file_handlers: crate::browser::runtime::window_property_or_undefined("launchQueue")
            .is_truthy(),
        protocol_handlers: crate::browser::runtime::is_secure_context().unwrap_or(false),
        share_target: crate::browser::runtime::is_secure_context().unwrap_or(false),
        launch_queue: crate::browser::runtime::window_property_or_undefined("launchQueue")
            .is_truthy(),
        install_prompt: install_prompt_supported(),
    }
}

pub fn dismiss_install_prompt_now() {
    #[cfg(feature = "hydrate")]
    crate::browser::storage::set_local_storage_f64(INSTALL_DISMISSED_AT_KEY, js_sys::Date::now());
}
