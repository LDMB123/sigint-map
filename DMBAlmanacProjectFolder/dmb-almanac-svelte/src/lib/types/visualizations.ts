/**
 * Type definitions for D3 visualization components
 * Comprehensive type safety for all visualization data structures
 */

/**
 * TransitionFlow.svelte types
 * Represents song-to-song transitions in setlists (Sankey diagram)
 */
export interface TransitionFlowData {
  source: string;
  target: string;
  value: number;
}

export interface SankeyNode {
  id: string;
  name: string;
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

export interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  width?: number;
}

/**
 * GuestNetwork.svelte types
 * Represents guest musician collaborations (Force-directed graph)
 */
export interface GuestNetworkNode {
  id: string;
  name: string;
  appearances: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GuestNetworkLink {
  source: string;
  target: string;
  weight: number;
}

export interface GuestNetworkData {
  nodes: GuestNetworkNode[];
  links: GuestNetworkLink[];
}

/**
 * TourMap.svelte types
 * Represents geographic concert distribution (Choropleth map)
 */
export type TourMapData = Map<string, number> | Record<string, number>;

export interface TopoJSONFeatureProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface TopoJSONFeature {
  properties?: TopoJSONFeatureProperties;
  id?: string;
  type: 'Feature';
  geometry: unknown;
}

export interface TopoJSONObject {
  type: 'FeatureCollection' | 'Feature' | 'Geometry';
  objects?: Record<string, unknown>;
  features?: TopoJSONFeature[];
}

export interface TopoJSONGeometry {
  objects: {
    states?: unknown;
    counties?: unknown;
    countries?: unknown;
    [key: string]: unknown;
  };
}

export type ColorScheme = 'blues' | 'greens' | 'reds' | 'purples';

/**
 * GapTimeline.svelte types
 * Represents time gaps between song performances (Canvas + SVG hybrid)
 */
export interface GapTimelineData {
  date: string; // ISO date string
  songId: string;
  songName: string;
  gap: number; // Days since last performance
}

export interface ParsedGapData extends Omit<GapTimelineData, 'date'> {
  date: Date;
}

/**
 * SongHeatmap.svelte types
 * Represents song performance matrix across time periods (Heatmap)
 */
export interface HeatmapData {
  row: string; // Song name
  column: string; // Time period (month, year, etc.)
  value: number; // Performance count
}

export interface HeatmapCell extends HeatmapData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * RarityScorecard.svelte types
 * Represents song rarity/frequency scores (Bar chart)
 */
export interface RarityData {
  id: string;
  name: string;
  rarity: number; // 0-100 percentage
  lastPlayed?: string; // ISO date string
  totalAppearances: number;
}

export interface RarityBarData extends RarityData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Common D3 types and utilities
 */
export interface D3Scale<D = unknown, R = unknown> {
  domain(values: D[]): this;
  range(values: R[]): this;
  (value: D): R;
}

export interface D3Node {
  id?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  [key: string]: unknown;
}

export interface D3Link {
  source: string | number | D3Node;
  target: string | number | D3Node;
  value?: number;
  [key: string]: unknown;
}

/**
 * Visualization component props
 */
export interface VisualizationProps {
  width?: number;
  height?: number;
  class?: string;
}

export interface TransitionFlowProps extends VisualizationProps {
  data?: TransitionFlowData[];
}

export interface GuestNetworkProps extends VisualizationProps {
  data?: GuestNetworkNode[];
  links?: GuestNetworkLink[];
}

export interface TourMapProps extends VisualizationProps {
  topoData?: TopoJSONGeometry;
  data?: TourMapData;
  colorScheme?: ColorScheme;
}

export interface GapTimelineProps extends VisualizationProps {
  data?: GapTimelineData[];
}

export interface SongHeatmapProps extends VisualizationProps {
  data?: HeatmapData[];
}

export interface RarityScoreCardProps extends VisualizationProps {
  data?: RarityData[];
  limit?: number;
}

/**
 * Tooltip and interaction types
 */
export interface Tooltip {
  x: number;
  y: number;
  content: string;
}

export interface TooltipData {
  label: string;
  value: number | string;
  color?: string;
}

/**
 * Show/Concert data structure
 */
export interface Show {
  id: string;
  date: string;
  songCount: number;
  venueName: string;
  venueCity: string;
  venueState: string;
}

export interface Song {
  id: string;
  name: string;
  albums: string[];
  releaseYear?: number;
  writer?: string;
}

export interface Guest {
  id: string;
  name: string;
  appearances: number;
  firstAppearance?: string;
  lastAppearance?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  renderTime: number;
  fps: number;
  dataPoints: number;
  memoryUsed?: number;
}

/**
 * Web Worker message types
 */
export interface SimulationMessage {
  type: 'init' | 'iterate' | 'stop';
  data?: {
    nodes: D3Node[];
    links: D3Link[];
    width: number;
    height: number;
    iterations?: number;
  };
}

export interface SimulationResponse {
  type: 'initialized' | 'update' | 'stopped';
  nodes: D3Node[];
  isRunning?: boolean;
  isConverged?: boolean;
}

/**
 * Export common d3-scale types for convenience
 * Using explicit type imports from d3-scale for tree-shaking compatibility
 */
import type {
  ScaleLinear as D3ScaleLinear,
  ScaleTime as D3ScaleTime,
  ScaleBand as D3ScaleBand,
  ScaleOrdinal as D3ScaleOrdinal,
  ScaleQuantize as D3ScaleQuantize
} from 'd3-scale';

export type ScaleLinear = D3ScaleLinear<number, number>;
export type ScaleTime = D3ScaleTime<number, number>;
export type ScaleBand = D3ScaleBand<string>;
export type ScaleOrdinal = D3ScaleOrdinal<string, string>;
export type ScaleQuantize = D3ScaleQuantize<number, string>;
