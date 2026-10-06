// The site's front door is whatever Caddy serves at "/": the live session
// page, Panoptic landing, or Studio home, depending on GNSIS_HOME_EXPERIENCE.
// Reaching it from inside the app has to be a full navigation, never a
// client-side one, so Caddy decides what "/" is.
export function goToFrontDoor(): void {
  window.location.replace("/");
}
