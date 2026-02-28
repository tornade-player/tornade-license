export default function SuccessPage() {
  return (
    <main style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      padding: "20px",
    }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        padding: "48px",
        maxWidth: "500px",
        textAlign: "center",
      }}>
        <img
          src="https://tornade.tf/images/tornade.png"
          alt="Tornade"
          style={{
            width: "200px",
            height: "200px",
            marginBottom: "32px",
            objectFit: "contain",
          }}
        />

        <h1 style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1a1a1a",
          margin: "0 0 16px 0",
        }}>
          Payment Successful! ✅
        </h1>

        <p style={{
          fontSize: "16px",
          color: "#666",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
        }}>
          Thank you for your purchase! A license key has been sent to your email address.
        </p>

        <div style={{
          background: "#f0f8ff",
          border: "1px solid #b0d4ff",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}>
          <p style={{
            fontSize: "14px",
            color: "#0066cc",
            margin: "0",
          }}>
            📧 Check your email for the license key and activation instructions.
          </p>
        </div>

        <p style={{
          fontSize: "14px",
          color: "#999",
          margin: "0",
        }}>
          If you don't see the email, check your spam folder.
        </p>

        <a
          href="https://tornade.tf"
          style={{
            display: "inline-block",
            marginTop: "32px",
            padding: "12px 32px",
            background: "#0074d4",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Back to Tornade
        </a>
      </div>
    </main>
  );
}
