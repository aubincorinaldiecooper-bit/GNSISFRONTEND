// The terms for using the Panoptic pages and their two forms.

import { ContactLink } from "../components/ContactLink";
import { LegalPage } from "../components/LegalPage";
import { TERMS_META } from "../pageMeta";

export default function TermsPage() {
  return (
    <LegalPage
      page="terms"
      title="Terms"
      updated="6 October 2026"
      meta={TERMS_META}
    >
      <p>
        These pages describe Panoptic, which GNSIS.studio is building. You are welcome to browse, create an account and use the early-access
        and contact forms. Using them means you accept these terms.
      </p>

      <h2>Accounts</h2>
      <p>
        Sign-in uses Google or an email link to verify your identity through our existing GNSIS authentication service. No Panoptic password is needed.
        Keep your Google or email account secure and sign out on shared devices. Account sign-in does not change the illustrative nature of the video results below.
      </p>

      <h2>Early access</h2>
      <p>
        Joining the early-access list does not guarantee access, or access by any particular date. When there is news, we will write to the email
        address you gave.
      </p>

      <h2>What you send us</h2>
      <p>
        Send only what you are happy for us to keep. Please don’t put passwords, payment details or other people’s private information in a
        task or a message, and don’t use the forms for spam or anything unlawful.
      </p>

      <h2>The examples on these pages</h2>
      <p>
        The stores, products, prices, videos and answers shown here illustrate how Panoptic works. They are not real listings, real offers or
        real results.
      </p>

      <h2>As they are</h2>
      <p>
        These pages are provided as they are. Panoptic is still being built, so what it does may change before it is available.
      </p>

      <h2>Changes and questions</h2>
      <p>
        If these terms change, we will update this page and the date at the top. Questions are welcome through{" "}
        <ContactLink source="terms:body" />.
      </p>
    </LegalPage>
  );
}
