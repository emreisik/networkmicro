"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0b1220",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#52525b", margin: "0 0 16px" }}>
            An unexpected error occurred. You can try again, or contact support
            if the problem persists.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: "#a1a1aa", margin: "0 0 16px" }}>
              Error ID: <code>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#0b1220",
              color: "#fff",
              border: 0,
              padding: "10px 16px",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
