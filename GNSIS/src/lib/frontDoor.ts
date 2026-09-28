// The site's front door is whatever Caddy serves at "/": the live session page,
// or the Panoptic landing when GNSIS_HOME_EXPERIENCE=video-search. Either way,
// reaching it from inside the app has to be a full navigation, never a
// client-side one, so Caddy decides what "/" is.
export function goToFrontDoor(): void {
  window.location.replace("/");
}
