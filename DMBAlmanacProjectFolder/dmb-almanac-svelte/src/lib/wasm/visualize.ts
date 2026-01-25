import visualizeWasmUrl from '$wasm/dmb-visualize/pkg/dmb_visualize_bg.wasm?url';

/**
 * Interface for Heatmap Data Item
 */
export interface HeatmapItem {
    row: string;
    column: string;
    value: number;
}

/**
 * Configuration for Heatmap Layout
 */
export interface HeatmapConfig {
    width: number;
    height: number;
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    color_range: string[];
}

/**
 * Prepared Rect for Rendering
 */
export interface HeatmapRect {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    row: string;
    column: string;
    value: number;
}

/**
 * Axis Tick Info
 */
export interface AxisTick {
    label: string;
    x: number;
    y: number;
}

/**
 * Result from WASM calculation
 */
export interface HeatmapResult {
    rects: HeatmapRect[];
    x_ticks: AxisTick[];
    y_ticks: AxisTick[];
    legend_gradient: string[];
}

interface WasmVisualizeModule {
    prepareHeatmapData(data: HeatmapItem[], config: HeatmapConfig): HeatmapResult;
    init: () => void;
}

let wasmModule: WasmVisualizeModule | null = null;
let loadPromise: Promise<WasmVisualizeModule> | null = null;

export async function loadVisualizeWasm(): Promise<WasmVisualizeModule> {
    if (wasmModule) return wasmModule;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        // Import the JS glue code
        const module = await import('$wasm/dmb-visualize/pkg/dmb_visualize.js');

        // Initialize WASM with the URL
        await module.default(visualizeWasmUrl);

        wasmModule = module as unknown as WasmVisualizeModule;
        return wasmModule;
    })();

    return loadPromise;
}

export async function prepareHeatmapData(
    data: HeatmapItem[],
    config: HeatmapConfig
): Promise<HeatmapResult> {
    const module = await loadVisualizeWasm();
    return module.prepareHeatmapData(data, config);
}
