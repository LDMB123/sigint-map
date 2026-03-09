#[cfg(feature = "hydrate")]
use super::{
    ImportRunMetrics, ImportStatus, ImportWorkItem, import_chunk_size_for_work_item,
    import_error_status, performance_now_ms, persist_import_checkpoint, prefetch_json_array,
    refill_chunk_buffer, set_import_progress, take_prefetched_json_array,
    yield_to_browser_scheduler,
};
#[cfg(feature = "hydrate")]
use js_sys::Array;
#[cfg(feature = "hydrate")]
use leptos::prelude::RwSignal;

#[cfg(feature = "hydrate")]
#[allow(clippy::too_many_arguments)]
async fn import_single_work_item(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    work_item: &ImportWorkItem,
    file_index: usize,
    total_work_items: usize,
    total_files: f32,
    start_chunk_hint: usize,
    prefetched_values: Option<super::PrefetchedJsonArray>,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    let file_number = file_index + 1;
    let progress_base = file_index as f32 / total_files;
    let file_started_at = performance_now_ms();

    let values: Array = take_prefetched_json_array(prefetched_values, &work_item.url)
        .await
        .map_err(|err| {
            import_error_status(
                format!("Failed to load {}", work_item.label),
                progress_base,
                err.as_string().unwrap_or_default(),
            )
        })?;
    let total_records = values.length() as usize;
    if total_records == 0 {
        persist_import_checkpoint(
            manifest_version,
            file_index,
            start_chunk_hint,
            Some(0),
            total_work_items,
            0,
        )
        .await;
        metrics.checkpoint_count = metrics.checkpoint_count.saturating_add(1);
        metrics.record_file(work_item.label.clone(), 0, 0, 0.0);
        return Ok(());
    }
    let chunk_size = import_chunk_size_for_work_item(work_item, total_records);
    let chunk_total = total_records.div_ceil(chunk_size).max(1);
    let start_chunk = start_chunk_hint.min(chunk_total.saturating_sub(1));
    let progress_scale = 1.0 / total_files;
    let mut chunk_buffer: Vec<wasm_bindgen::JsValue> = Vec::with_capacity(chunk_size);

    for chunk_index in start_chunk..chunk_total {
        let start = chunk_index * chunk_size;
        let end = ((chunk_index + 1) * chunk_size).min(total_records);
        refill_chunk_buffer(&values, start, end, &mut chunk_buffer);
        let inserted = dmb_idb::bulk_put(work_item.store, &chunk_buffer)
            .await
            .map_err(|err| {
                import_error_status(
                    format!("Import failed: {}", work_item.label),
                    progress_base,
                    format!("{err:?}"),
                )
            })?;

        let chunk_progress = (chunk_index + 1) as f32 / chunk_total as f32;
        let progress = progress_base + progress_scale * chunk_progress;
        set_import_progress(
            status,
            format!(
                "Importing {} ({}/{}) • {} rows",
                work_item.label, file_number, total_work_items, inserted
            ),
            progress,
        );

        persist_import_checkpoint(
            manifest_version,
            file_index,
            chunk_index + 1,
            Some(end),
            total_work_items,
            chunk_total,
        )
        .await;
        metrics.checkpoint_count = metrics.checkpoint_count.saturating_add(1);

        yield_to_browser_scheduler(metrics, false).await;
    }

    metrics.record_file(
        work_item.label.clone(),
        total_records,
        chunk_total.saturating_sub(start_chunk),
        (performance_now_ms() - file_started_at).max(0.0),
    );

    Ok(())
}

#[cfg(feature = "hydrate")]
pub(super) async fn import_work_items_with_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    let total_work_items = import_work.len();
    let total_files = total_work_items.max(1) as f32;
    let mut prefetched_values = import_work
        .get(resume_file_index)
        .map(|work_item| prefetch_json_array(work_item.url.clone()));

    for (file_index, work_item) in import_work.iter().enumerate() {
        if file_index < resume_file_index {
            continue;
        }
        let current_prefetch = prefetched_values.take();
        prefetched_values = import_work
            .get(file_index + 1)
            .map(|next_work_item| prefetch_json_array(next_work_item.url.clone()));
        let start_chunk = if file_index == resume_file_index {
            resume_chunk_index
        } else {
            0
        };
        import_single_work_item(
            status,
            manifest_version,
            work_item,
            file_index,
            total_work_items,
            total_files,
            start_chunk,
            current_prefetch,
            metrics,
        )
        .await?;
    }

    Ok(())
}
