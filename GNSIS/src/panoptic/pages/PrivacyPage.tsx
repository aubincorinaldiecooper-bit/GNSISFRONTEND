// What the Panoptic pages collect, in plain words. Every statement here is
// about what this code actually does; change the page when the code changes.

import { ContactLink } from "../components/ContactLink";
import { LegalPage } from "../components/LegalPage";
import { PRIVACY_META } from "../pageMeta";

export default function PrivacyPage() {
  return (
    <LegalPage
      page="privacy"
      title="Privacy"
      updated="28 September 2026"
      meta={PRIVACY_META}
    >
      <p>
        This covers the Panoptic pages on gnsis.studio and the two forms on them: early access and contact. It is short because they collect
        very little.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Early access:</strong> your email address and, if you typed one into the Panoptic bar, your task, kept exactly as you wrote it.
        </li>
        <li>
          <strong>Contact:</strong> your email address and your message.
        </li>
        <li>With each, which page and button it came from, and when it arrived.</li>
      </ul>

      <h2>What we don’t collect</h2>
      <ul>
        <li>No name, password or payment details.</li>
        <li>
          Your IP address is not stored with anything you send. Our server keeps it in memory for about ten minutes, only to stop the forms being
          sent over and over, and then forgets it.
        </li>
        <li>These pages set no cookies of their own and contain no advertising or analytics code. Their fonts come from this site.</li>
      </ul>
      <p>Like any website, the services that host these pages may keep standard technical logs of requests.</p>

      <h2>Why we keep it</h2>
      <ul>
        <li>To let you know when you can try Panoptic, and to start you off with the task you gave us.</li>
        <li>To answer your message.</li>
      </ul>
      <p>Only the GNSIS.studio team can see it. We don’t sell it and we don’t share it with advertisers.</p>

      <h2>Where and how long</h2>
      <p>
        It is kept in GNSIS.studio’s own database until you ask us to delete it, or until we no longer need it for the reasons above.
      </p>

      <h2>Your choices</h2>
      <p>
        To see what we hold about you, correct it or have it deleted, write to us through <ContactLink source="privacy:body" />.
      </p>

      <h2>Changes</h2>
      <p>If this changes, we will update this page and the date at the top.</p>
    </LegalPage>
  );
}
