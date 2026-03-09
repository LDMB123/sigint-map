#[cfg(feature = "hydrate")]
use std::cell::RefCell;
#[cfg(feature = "hydrate")]
use std::future::Future;

#[cfg(feature = "hydrate")]
pub(super) type ThreadTtlCache<T> = RefCell<Option<(f64, T)>>;

#[cfg(feature = "hydrate")]
pub(super) fn read_thread_ttl_cache<T: Clone>(
    cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>,
    ttl_ms: f64,
) -> Option<T> {
    let now = js_sys::Date::now();
    cache.with(|cache| {
        let mut cached = cache.borrow_mut();
        if let Some((timestamp_ms, value)) = cached.as_ref()
            && now - *timestamp_ms <= ttl_ms
        {
            return Some(value.clone());
        }
        *cached = None;
        None
    })
}

#[cfg(feature = "hydrate")]
pub(super) fn write_thread_ttl_cache<T: Clone>(
    cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>,
    value: &T,
) {
    cache.with(|cache| {
        *cache.borrow_mut() = Some((js_sys::Date::now(), value.clone()));
    });
}

#[cfg(feature = "hydrate")]
pub(super) fn clear_thread_ttl_cache<T>(cache: &'static std::thread::LocalKey<ThreadTtlCache<T>>) {
    cache.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
pub(super) async fn cached_thread_ttl_value<T, F, Fut>(
    read_cached: fn() -> Option<T>,
    write_cached: fn(&T),
    load: F,
) -> Option<T>
where
    T: Clone,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Option<T>>,
{
    if let Some(cached) = read_cached() {
        return Some(cached);
    }

    let value = load().await?;
    write_cached(&value);
    Some(value)
}

#[cfg(feature = "hydrate")]
macro_rules! define_thread_ttl_cache {
    (
        $cache:ident,
        $value:ty,
        $ttl_ms:ident,
        $read_fn:ident,
        $write_fn:ident,
        $clear_fn:ident
    ) => {
        thread_local! {
            static $cache: std::cell::RefCell<Option<(f64, $value)>> =
                const { std::cell::RefCell::new(None) };
        }

        fn $read_fn() -> Option<$value> {
            $crate::data::data_diagnostics::cache::read_thread_ttl_cache(&$cache, $ttl_ms)
        }

        fn $write_fn(value: &$value) {
            $crate::data::data_diagnostics::cache::write_thread_ttl_cache(&$cache, value);
        }

        fn $clear_fn() {
            $crate::data::data_diagnostics::cache::clear_thread_ttl_cache(&$cache);
        }
    };
}

#[cfg(feature = "hydrate")]
pub(super) use define_thread_ttl_cache;
