// Where the Panoptic pages live, and whether they are public yet.
//
// Today gnsis.studio/ is the live page and these pages are dormant: reachable
// by address, linked from nowhere outside themselves, and marked noindex. The
// operator's GNSIS_HOME_EXPERIENCE=video-search makes the landing the home
// page; nothing in here has to change for that.

import { homeExperience } from "@/lib/env";

export const PATHS = {
  videoSearch: "/video-search",
  webSteering: "/use-cases/agentic-web-steering",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** True while the landing is not the home page. */
export function isDormant(): boolean {
  return homeExperience() !== "video-search";
}

/** The landing's current address: the home page once switched on. */
export function landingPath(): string {
  return isDormant() ? PATHS.videoSearch : "/";
}

/** Which page a form was opened from, for the `source` recorded with it. */
export type PageId = "video-search" | "web-steering" | "privacy" | "terms";
