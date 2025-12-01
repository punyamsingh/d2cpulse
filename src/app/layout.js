import "./globals.css";

export const metadata = {
  title: "D2CPulse - AI-Powered D2C Competitive Intelligence",
  description:
    "Analyze Shopify stores and get competitive intelligence for D2C brands in India",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
