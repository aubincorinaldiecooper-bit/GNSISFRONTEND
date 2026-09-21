// The site's front door is the live session page. Caddy serves it at "/" by
// forwarding to the GNSIS runtime, so it is not a React route: reaching it from
// inside the app has to be a full navigation, never a client-side one, or the
// router would render nothing for a path it does not own.
export function goToFrontDoor(): void {
  window.location.replace("/");
}
