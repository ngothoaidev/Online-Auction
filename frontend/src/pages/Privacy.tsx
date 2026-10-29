// Privacy policy + data deletion instructions (required by Facebook/Google sign-in). Keep it true to what the app stores.
import type { ReactNode } from 'react';
const CONTACT_EMAIL = 'thoai.ngo.dev@gmail.com';
const UPDATED = '2026-10-26';

const Section = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="font-display text-2xl font-semibold">{title}</h2>
    {children}
  </section>
);

export default function Privacy() {
  const mail = <a className="text-(--brand) underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 py-12 text-(--ink) sm:px-6 [&_p]:text-(--muted)">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">Privacy policy</h1>
        <p className="text-sm">Last updated {UPDATED}. Aurum Auctions is a portfolio project; no real money is processed.</p>
      </header>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5 text-(--muted)">
          <li>Account details: username, email, password (stored only as a hash), and optionally full name, birthday, bio and profile photo.</li>
          <li>If you sign in with Google or Facebook: your name, email address, profile photo and the provider's account ID. We never receive your Google or Facebook password.</li>
          <li>Activity on the site: listings, bids, comments, reviews, watchlist, orders, order messages and the payment or shipping proof images you upload.</li>
          <li>Technical data: server logs with IP address and request details, kept for security and debugging.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc space-y-1 pl-5 text-(--muted)">
          <li>To run your account and the auctions you take part in, and to show your public profile and ratings to other users.</li>
          <li>To send account emails (verification codes, password resets) and auction notifications.</li>
          <li>To prevent abuse, such as rate limiting and moderation of reported listings.</li>
        </ul>
        <p>We do not sell your data or use it for advertising.</p>
      </Section>

      <Section title="Services that process data for us">
        <ul className="list-disc space-y-1 pl-5 text-(--muted)">
          <li>Render (hosting), Supabase (database), Cloudinary (images), Brevo (email delivery).</li>
          <li>Google and Facebook, only when you choose to sign in with them.</li>
        </ul>
      </Section>

      <Section title="Cookies and storage">
        <p>Your sign-in token is kept in your browser's local storage. A short-lived cookie is used only during Google/Facebook sign-in to protect against forged requests. There are no tracking or advertising cookies.</p>
      </Section>

      <Section id="data-deletion" title="Data deletion">
        <p>You can ask us to delete your account and personal data at any time:</p>
        <ol className="list-decimal space-y-1 pl-5 text-(--muted)">
          <li>Email {mail} from the address on your account with the subject "Delete my account" and your username.</li>
          <li>We confirm the request and delete your account within 30 days. Records other users depend on (bids, reviews and completed orders) are kept only in anonymized form.</li>
        </ol>
        <p>If you signed in with Facebook, you can also remove Aurum Auctions under Facebook Settings → Apps and Websites; then email us as above to delete the data we hold.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy: {mail}.</p>
      </Section>
    </article>
  );
}
