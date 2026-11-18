import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { credits, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${site.name}.`,
};

const CONTACT = "zainashraf00259@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" updated="18 November 2026">
      <section>
        <h2>About the service</h2>
        <p className="mt-2">
          {site.name} helps you draft social media captions with AI, schedule them, sync drafts to your Google Drive
          and receive email reminders. It is a prototype built by {credits.developer} for {credits.event} (
          {credits.track}), {credits.university}, {credits.campus}, and is provided free of charge.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p className="mt-2">
          You are responsible for keeping your password secure and for activity under your account. Provide a valid
          email address so notifications reach you.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <ul>
          <li>You own the prompts, captions and notes you create.</li>
          <li>
            AI-generated captions may be inaccurate. Review them before posting; you are responsible for what you
            publish.
          </li>
          <li>{site.name} schedules and reminds. It does not post to social networks on your behalf.</li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Don&apos;t use the service to create unlawful, hateful, harassing or misleading content.</li>
          <li>Don&apos;t attempt to bypass rate limits, access other users&apos; data, or disrupt the service.</li>
        </ul>
      </section>

      <section>
        <h2>Google Drive</h2>
        <p className="mt-2">
          Connecting Google Drive is optional. {site.name} only accesses files it creates, as described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. You can disconnect at any time.
        </p>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p className="mt-2">
          The service is provided &ldquo;as is&rdquo;, without warranties. Features may change or be interrupted. To
          the extent permitted by law, we are not liable for indirect losses arising from its use.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="mt-2">
          Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </section>
    </LegalPage>
  );
}
