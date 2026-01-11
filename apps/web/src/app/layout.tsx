import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PhysioFlow - Physiotherapy EMR",
    template: "%s | PhysioFlow",
  },
  description:
    "PhysioFlow is a modern Electronic Medical Records system designed specifically for physiotherapy clinics in Vietnam.",
  keywords: [
    "physiotherapy",
    "EMR",
    "electronic medical records",
    "healthcare",
    "Vietnam",
    "clinic management",
  ],
  authors: [{ name: "PhysioFlow Team" }],
  creator: "PhysioFlow",
  publisher: "PhysioFlow",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
