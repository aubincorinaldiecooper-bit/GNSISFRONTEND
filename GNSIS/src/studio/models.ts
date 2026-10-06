import { STUDIO_PATHS } from "./config";

export type ModelId = "panoptic" | "gnsis-01";

export interface StudioModel {
  id: ModelId;
  name: string;
  tagline: string;
  summary: string;
  href: string;
}

export const MODELS: readonly StudioModel[] = [
  {
    id: "panoptic",
    name: "Panoptic",
    tagline: "Real-time visual perception for the web.",
    summary:
      "Panoptic continuously sees the page, understands what’s happening, and keeps visual context alive between actions.",
    href: STUDIO_PATHS.panoptic,
  },
  {
    id: "gnsis-01",
    name: "GNSIS 1.0",
    tagline: "General intelligence for open-ended tasks.",
    summary:
      "GNSIS 1.0 listens, sees, reasons and plans, completing complex tasks across your computer and the web with persistent context.",
    href: STUDIO_PATHS.developersGnsis01,
  },
];
