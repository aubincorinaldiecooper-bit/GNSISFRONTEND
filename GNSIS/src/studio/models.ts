import { LIVE_PATH, STUDIO_PATHS } from "./config";

export type ModelId = "panoptic" | "gnsis-01";

export interface StudioModel {
  id: ModelId;
  name: string;
  tagline: string;
  summary: string;
  href: string;
  /** Served outside this bundle (Caddy), so it needs a full page load. */
  external: boolean;
}

export const MODELS: readonly StudioModel[] = [
  {
    id: "panoptic",
    name: "Panoptic",
    tagline: "Real-time visual perception for the web.",
    summary:
      "Panoptic continuously sees the page, understands what’s happening, and keeps visual context alive between actions.",
    href: STUDIO_PATHS.panoptic,
    external: false,
  },
  {
    id: "gnsis-01",
    name: "GNSIS 1.0",
    tagline: "General intelligence for open-ended tasks.",
    summary:
      "GNSIS 1.0 listens, sees, reasons and plans, completing complex tasks across your computer and the web with persistent context.",
    href: LIVE_PATH,
    external: true,
  },
];
