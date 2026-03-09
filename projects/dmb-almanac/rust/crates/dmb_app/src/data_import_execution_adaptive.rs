use super::*;

#[cfg(feature = "hydrate")]
async fn import_single_work_item_adaptive(
    status: RwSignal<ImportStatus>,
    ctx: &ImportWorkContext<'_>,
    work_item: &ImportWorkItem,
    start_chunk_hint: usize,
    start_record_offset_hint: Option<usize>,
    governor: &mut AdaptiveImportGovernor,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    let file_number = ctx.file_index + 1;
    let progress_base = ctx.file_index as f32 / ctx.total_files;
    let file_started_at = performance_now_ms();
    set_import_progress(
        status,
        format!(
            "Importing {} ({}/{})",
            work_item.label, file_number, ctx.total_work_items
        ),
        progress_base,
    );

    let values = fetch_json_array(&work_item.url).await.map_err(|err| {
        import_error_status(
            format!("Failed to load {}", work_item.label),
            progress_base,
            err.as_string().unwrap_or_default(),
        )
    })?;
    let total_records = values.length() as usize;
    if total_records == 0 {
        persist_import_checkpoint(
            ctx.manifest_version,
            ctx.file_index,
            start_chunk_hint,
            Some(0),
            ctx.total_work_items,
            0,
        )
        .await;
        metrics.checkpoint_count = metrics.checkpoint_count.saturating_add(1);
        metrics.record_file(work_item.label.clone(), 0, 0, 0.0);
        return Ok(());
    }

    governor.prepare_for_work_item(work_item, total_records);

    let mut chunk_number = start_chunk_hint;
    let mut record_offset =
        resolve_resume_record_offset(start_record_offset_hint, start_chunk_hint, total_records);
    let mut last_checkpoint_at = performance_now_ms();
    let progress_scale = 1.0 / ctx.total_files;
    let mut chunk_buffer: Vec<wasm_bindgen::JsValue> = Vec::with_capacity(governor.chunk_records);
    let mut file_chunk_count = 0usize;

    while record_offset < total_records {
        let remaining = total_records.saturating_sub(record_offset);
        let chunk_records = governor.next_chunk_records(remaining);
        let start = record_offset;
        let end = (start + chunk_records).min(total_records);
        chunk_number = chunk_number.saturating_add(1);
        file_chunk_count = file_chunk_count.saturating_add(1);

        refill_chunk_buffer(&values, start, end, &mut chunk_buffer);
        let chunk_started_at = performance_now_ms();
        let write_stats = dmb_idb::bulk_put_with_options(
            work_item.store,
            &chunk_buffer,
            dmb_idb::BulkPutOptions {
                tx_batch_size: governor.tx_batch_size,
            },
        )
        .await
        .map_err(|err| {
            import_error_status(
                format!("Import failed: {}", work_item.label),
                progress_base,
                format!("{err:?}"),
            )
        })?;
        let chunk_elapsed_ms = (performance_now_ms() - chunk_started_at).max(0.0);
        let tuning_chunk_ms = chunk_elapsed_ms.max(write_stats.max_tx_ms);
        let long_task_count = crate::browser::perf::latest_inp_metrics_snapshot()
            .map_or(0, |metrics| metrics.long_frame_count);
        let tuning = governor.snapshot(tuning_chunk_ms, long_task_count);

        let chunk_progress = end as f32 / total_records as f32;
        let progress = progress_base + progress_scale * chunk_progress;
        set_import_progress_with_tuning(
            status,
            format!(
                "Importing {} ({}/{}) • chunk {} • {} rows • {:.0}ms chunk / {:.0}ms tx ({} tx)",
                work_item.label,
                file_number,
                ctx.total_work_items,
                chunk_number,
                write_stats.inserted,
                chunk_elapsed_ms,
                write_stats.max_tx_ms,
                write_stats.transaction_count
            ),
            progress,
            Some(tuning),
        );

        let is_last_chunk = end >= total_records;
        let now = performance_now_ms();
        let should_persist_checkpoint =
            is_last_chunk || (now - last_checkpoint_at) >= CHECKPOINT_INTERVAL_MS;

        if should_persist_checkpoint {
            persist_import_checkpoint(
                ctx.manifest_version,
                ctx.file_index,
                chunk_number,
                Some(end),
                ctx.total_work_items,
                total_records.div_ceil(governor.chunk_records.max(1)),
            )
            .await;
            last_checkpoint_at = now;
            metrics.checkpoint_count = metrics.checkpoint_count.saturating_add(1);
        }

        let no_pending_interaction =
            !crate::browser::perf::has_recent_interaction(ADAPTIVE_INTERACTION_WINDOW_MS);
        if should_yield_after_adaptive_chunk(tuning_chunk_ms, no_pending_interaction, is_last_chunk)
        {
            yield_to_browser_scheduler(metrics, !no_pending_interaction).await;
        }
        governor.update_after_chunk(tuning_chunk_ms, no_pending_interaction);
        record_offset = end;
    }

    metrics.record_file(
        work_item.label.clone(),
        total_records,
        file_chunk_count,
        (performance_now_ms() - file_started_at).max(0.0),
    );

    Ok(())
}

#[cfg(feature = "hydrate")]
pub(super) async fn import_work_items_with_adaptive_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
    resume_record_offset: Option<usize>,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    let total_work_items = import_work.len();
    let total_files = total_work_items.max(1) as f32;
    let mut governor = AdaptiveImportGovernor::new();

    for (file_index, work_item) in import_work.iter().enumerate() {
        if file_index < resume_file_index {
            continue;
        }
        let start_chunk_hint = if file_index == resume_file_index {
            resume_chunk_index
        } else {
            0
        };
        let start_record_offset = if file_index == resume_file_index {
            resume_record_offset
        } else {
            None
        };
        let ctx = ImportWorkContext {
            manifest_version,
            file_index,
            total_work_items,
            total_files,
        };

        import_single_work_item_adaptive(
            status,
            &ctx,
            work_item,
            start_chunk_hint,
            start_record_offset,
            &mut governor,
            metrics,
        )
        .await?;
    }

    Ok(())
}
