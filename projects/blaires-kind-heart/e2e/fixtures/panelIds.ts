export const PANEL_IDS = [
  "panel-tracker",
  "panel-quests",
  "panel-stories",
  "panel-rewards",
  "panel-games",
  "panel-gardens",
] as const;

export const PANEL_IDS_WITH_PROGRESS = [...PANEL_IDS, "panel-progress"] as const;

export type PanelId = (typeof PANEL_IDS)[number];
export type PanelIdWithProgress = (typeof PANEL_IDS_WITH_PROGRESS)[number];
