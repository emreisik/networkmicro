export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <h2 className="mt-6 text-lg font-semibold">1. Acceptance of Terms</h2>
      <p className="text-sm">
        By accessing or using Network Mikro (&quot;the Platform&quot;) you agree
        to be bound by these Terms. If you do not agree, do not use the
        Platform.
      </p>

      <h2 className="mt-6 text-lg font-semibold">2. Tasks and Submissions</h2>
      <p className="text-sm">
        Users may claim tasks posted by brands. Completion must be demonstrated
        with authentic proof. Fraudulent, fabricated, or recycled submissions
        are grounds for rejection, trust-score penalty, and account termination.
      </p>

      <h2 className="mt-6 text-lg font-semibold">3. Payouts</h2>
      <p className="text-sm">
        Approved tasks generate earnings that are settled in weekly payout
        batches. Payouts require a valid payment destination configured on your
        profile.
      </p>

      <h2 className="mt-6 text-lg font-semibold">4. Account Suspension</h2>
      <p className="text-sm">
        We may suspend or terminate accounts that violate these Terms, attempt
        to game the trust system, or engage in fraud.
      </p>

      <h2 className="mt-6 text-lg font-semibold">5. Changes</h2>
      <p className="text-sm">
        We may update these Terms. Continued use constitutes acceptance of the
        updated Terms.
      </p>
    </div>
  );
}
