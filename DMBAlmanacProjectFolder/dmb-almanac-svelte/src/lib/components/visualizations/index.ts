// Export all visualization components for convenient importing

export { default as TransitionFlow } from './TransitionFlow.svelte';
export { default as GuestNetwork } from './GuestNetwork.svelte';
export { default as TourMap } from './TourMap.svelte';
export { default as GapTimeline } from './GapTimeline.svelte';
export { default as SongHeatmap } from './SongHeatmap.svelte';
export { default as RarityScorecard } from './RarityScorecard.svelte';

// Type definitions
export type TransitionFlowData = Array<{
  source: string;
  target: string;
  value: number;
}>;

export type GuestNetworkNode = {
  id: string;
  name: string;
  appearances: number;
};

export type GuestNetworkLink = {
  source: string;
  target: string;
  weight: number;
};

export type TourMapData = Map<string, number> | Record<string, number>;

export type GapTimelineData = Array<{
  date: string;
  songId: string;
  songName: string;
  gap: number;
}>;

export type HeatmapData = Array<{
  row: string;
  column: string;
  value: number;
}>;

export type RarityData = Array<{
  id: string;
  name: string;
  rarity: number;
  lastPlayed?: string;
  totalAppearances: number;
}>;
