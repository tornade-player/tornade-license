export default function Home() {
  return (
    <main style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#f5f5f5",
    }}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1>Tornade License Server</h1>
        <p>Stripe webhook handler for license key generation</p>
        <p style={{ color: "#666", fontSize: "14px" }}>
          Webhook endpoint: <code>/api/webhooks/stripe</code>
        </p>
        <p style={{ color: "#999", fontSize: "12px", marginTop: "32px" }}>
          Configure your Stripe webhook to post <code>checkout.session.completed</code> events here.
        </p>
      </div>
    </main>
  );
}
