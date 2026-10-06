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
      updated="6 October 2026"
      meta={PRIVACY_META}
    >
      <p>
        This covers the Panoptic pages on gnsis.studio, Panoptic accounts, and the early-access and contact forms. You can browse and search
        without signing in.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Accounts:</strong> when you sign in with Google or an email link, or connect GitHub for developer access, our existing GNSIS authentication service stores your email,
          name and avatar when provided, and your linked account. You can update your display name in Profile; that name is shared across GNSIS.
        </li>
        <li>
          <strong>Sessions:</strong> the authentication service uses a secure session cookie to keep you signed in, and stores session
          timestamps, IP address and browser user-agent. Google and GitHub are used for identity, not access to your files or email. Repository access is granted separately through the GNSIS GitHub App.
        </li>
        <li><strong>Sign-in email:</strong> if you request an email link, Resend receives your email address and the sign-in email to deliver it. Sign-in links expire after ten minutes and can be used once.</li>
        <li>
          <strong>Early access:</strong> your email address and, if you typed one into the Panoptic bar, your task, kept exactly as you wrote it. If you request developer access, also what you told us you plan to build and the identifiers for your linked GitHub and GNSIS accounts. We use those identifiers only to tie the reviewed request to the correct developer account.
        </li>
        <li>
          <strong>Contact:</strong> your email address and your message.
        </li>
        <li>With each, which page and button it came from, and when it arrived.</li>
      </ul>

      <h2>What we don’t collect</h2>
      <ul>
        <li>No GNSIS password or payment details are collected by these pages.</li>
        <li>
          Your IP address is not stored with the early-access or contact submissions. For those forms, our server keeps it in memory for about
          ten minutes to limit repeated submissions, then forgets it. Authentication sessions are separate, as described above.
        </li>
        <li>There are no advertising or analytics cookies. Fonts come from this site.</li>
        <li>Your searches are not saved to your account. Caption and sound settings last only for the current browsing session.</li>
      </ul>
      <p>Like any website, the services that host these pages may keep standard technical logs of requests.</p>

      <h2>Why we keep it</h2>
      <ul>
        <li>To identify your account, keep you signed in and show your profile.</li>
        <li>To review developer access requests and send you an API key.</li>
        <li>To let you know when you can try Panoptic, and to start you off with the task you gave us.</li>
        <li>To answer your message.</li>
      </ul>
      <p>Only the GNSIS.studio team can see it. We don’t sell it and we don’t share it with advertisers.</p>

      <h2>Where and how long</h2>
      <p>
        It is kept in GNSIS.studio’s own database until you ask us to delete it, or until we no longer need it for the reasons above.
      </p>

      <h2>Your choices</h2>
      <p>You can edit your name in Profile and sign out from the account menu. Sign-out applies to the shared GNSIS identity on this browser.</p>
      <p>
        To see what we hold about you, correct it or have it deleted, write to us through <ContactLink source="privacy:body" />.
      </p>

      <h2>Changes</h2>
      <p>If this changes, we will update this page and the date at the top.</p>
    </LegalPage>
  );
}
