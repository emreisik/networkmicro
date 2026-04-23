export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <h2 className="mt-6 text-lg font-semibold">Information we collect</h2>
      <p className="mt-2 text-sm">
        Account information (name, email), social accounts you add, submission
        artifacts (screenshots, post URLs), and platform activity (claimed
        tasks, approvals, payouts).
      </p>

      <h2 className="mt-6 text-lg font-semibold">How we use information</h2>
      <p className="mt-2 text-sm">
        To operate the Platform, verify submissions, maintain trust scores,
        settle payouts, and communicate with you about your account and tasks.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Sharing</h2>
      <p className="mt-2 text-sm">
        We do not sell personal information. Submission artifacts may be
        reviewed by authorized reviewers and shared with brands that posted the
        campaign.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Retention</h2>
      <p className="mt-2 text-sm">
        We retain data for the period required to operate the Platform and to
        comply with legal obligations. You may request deletion by contacting
        support.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Security</h2>
      <p className="mt-2 text-sm">
        Passwords are stored hashed. Sessions are signed and stored in HTTP-only
        cookies. All sensitive state changes are recorded in the audit log.
      </p>
    </div>
  );
}
