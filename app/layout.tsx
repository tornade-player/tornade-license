import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tornade License Server",
  description: "Stripe webhook handler for Tornade license key generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
