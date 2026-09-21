// Catch-all for a path the app does not own: send the visitor to the front
// door. It is a component so it can sit in the route table; the navigation
// itself lives in lib/frontDoor so a test can observe it without jsdom trying
// to navigate.

import { useEffect } from "react";

import { goToFrontDoor } from "@/lib/frontDoor";

export default function FrontDoor() {
  useEffect(() => {
    goToFrontDoor();
  }, []);
  return null;
}
