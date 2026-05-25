import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
// Note: @undp/data-viz styles are bundled with the components
import "./globals.css";
import { Providers } from "./providers";

// https://fonts.google.com/specimen/Roboto
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://open.un.org"),
  title: "UN Transparency Portal",
  description:
    "The Transparency Portal at open.un.org provides access to financial information from across the UN System. Explore who contributes, which organizations are funded, where funds are spent, and towards which goals.",
  openGraph: {
    title: "UN Transparency Portal",
    description:
      "Access financial information from across the UN System. Explore contributors, organizations, spending locations, and sustainable development goals.",
    type: "website",
    locale: "en_US",
    siteName: "United Nations",
  },
  twitter: {
    card: "summary_large_image",
    title: "UN Transparency Portal",
    description:
      "Access financial information from across the UN System.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#009edb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.className} antialiased`}>
      <body>
        <Providers>{children}</Providers>
        <GoogleAnalytics gaId="G-XYZ" />
      </body>
    </html>
  );
}
