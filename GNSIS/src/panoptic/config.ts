// Where the Panoptic pages live, and whether they are public yet.
//
// The home experience is the live page by default; operators may instead make
// the Panoptic landing or Studio home. Panoptic pages are noindex only while
// the live page is the home experience.

import { homeExperience } from "@/lib/env";

export const PATHS = {
  videoSearch: "/video-search",
  webSteering: "/use-cases/agentic-web-steering",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** True while Panoptic pages should stay out of search results. */
export function isDormant(): boolean {
  return homeExperience() === "live";
}

/** The landing's address: home only in Panoptic mode, otherwise its stable path. */
export function landingPath(): string {
  return homeExperience() === "video-search" ? "/" : PATHS.videoSearch;
}

/** Which page a form was opened from, for the `source` recorded with it. */
export type PageId = "video-search" | "web-steering" | "privacy" | "terms";
