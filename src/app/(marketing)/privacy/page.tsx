import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { credits, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your data, including Google user data.`,
};

const CONTACT = "zainashraf00259@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="18 November 2026">
      <section>
        <h2>Who we are</h2>
        <p className="mt-2">
          {site.name} is an AI social media caption generator and scheduler built by {credits.developer} for{" "}
          {credits.event} ({credits.track}), {credits.department}, {credits.university}, {credits.campus}. This
          policy explains what data {site.name} handles and why.
        </p>
      </section>

      <section>
        <h2>Data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> your name, email address and an encrypted password, managed by Supabase
            Auth.
          </li>
          <li>
            <strong>Content you create:</strong> post prompts, captions, hashtags, platform, schedule time and task
            details.
          </li>
          <li>
            <strong>Notification settings:</strong> the email address, reminder timing, subject prefix and time zone
            you choose, plus a log of the notification emails we send you.
          </li>
          <li>
            <strong>Google Drive connection:</strong> if you connect Google Drive, your Google account email, an OAuth
            refresh token and the ID of the &ldquo;Cadence Drafts&rdquo; folder.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use Google user data</h2>
        <p className="mt-2">
          {site.name} requests only the <code>openid</code>, <code>email</code> and{" "}
          <code>https://www.googleapis.com/auth/drive.file</code> scopes. The <code>drive.file</code> scope lets{" "}
          {site.name} see and manage <em>only the files it creates</em>. It cannot read, list or change any other
          file in your Google Drive.
        </p>
        <ul>
          <li>We create a &ldquo;Cadence Drafts&rdquo; folder and save each of your posts there as a Google Doc.</li>
          <li>We update that Doc when you edit the post and delete it when you delete the post.</li>
          <li>We use your Google email only to show which account is connected.</li>
        </ul>
        <p className="mt-3">
          {site.name}&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not sell Google user data, use it for advertising, or
          let humans read it, and we do not use it to train AI models.
        </p>
      </section>

      <section>
        <h2>Services that process your data</h2>
        <ul>
          <li>
            <strong>Supabase</strong> stores your account and posts in Postgres. Row Level Security ensures each user
            can only access their own rows.
          </li>
          <li>
            <strong>Google Gemini</strong> receives the prompt you type, plus the chosen platform and tone, to generate
            caption options.
          </li>
          <li>
            <strong>Google Drive</strong> stores the post documents you choose to sync.
          </li>
          <li>
            <strong>Resend</strong> delivers the confirmation and reminder emails you enable.
          </li>
          <li>
            <strong>Vercel</strong> hosts the application.
          </li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p className="mt-2">
          Data is sent over HTTPS. Google refresh tokens are stored server-side and are never readable from the
          browser. Database access is protected by Row Level Security, and API routes are authenticated and rate
          limited.
        </p>
      </section>

      <section>
        <h2>Your choices and deletion</h2>
        <ul>
          <li>Turn email notifications off at any time in Notification settings.</li>
          <li>
            Disconnect Google Drive from the studio. This deletes the stored token and revokes {site.name}&apos;s
            access. You can also revoke it at{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
              myaccount.google.com/permissions
            </a>
            .
          </li>
          <li>Delete any post; its Google Doc is removed too.</li>
          <li>To delete your account and all data, email us and we will remove it.</li>
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="mt-2">
          Questions about this policy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </section>
    </LegalPage>
  );
}
