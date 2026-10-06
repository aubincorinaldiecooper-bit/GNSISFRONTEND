// Where the GNSIS Studio pages live. Keep in step with index.html's pre-paint
// script, the Caddyfile and src/panoptic/pageMeta.ts.

import { homeExperience } from "@/lib/env";
import type { ModelId } from "./models";

export const STUDIO_PATHS = {
  home: "/lab",
  models: "/models",
  developers: "/developers",
  panoptic: "/models/panoptic",
  developersPanoptic: "/developers/panoptic",
  developersGnsis01: "/developers/gnsis-01",
} as const;

export function developerPath(id: ModelId): string {
  return id === "panoptic" ? STUDIO_PATHS.developersPanoptic : STUDIO_PATHS.developersGnsis01;
}

/** The Studio home is also available at its stable path outside Studio mode. */
export function studioHomePath(): string {
  return homeExperience() === "studio" ? "/" : STUDIO_PATHS.home;
}
