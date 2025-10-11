import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@turnkey/react-wallet-kit/styles.css";
import { TurnkeyProvider } from "./providers/TurnkeyProvider";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "sBTC.Cool - Stacks wallet integration with Turnkey embedded wallet",
  description: "sBTC.Cool is a Stacks wallet integration with Turnkey embedded wallet",
  openGraph: {
    title: "sBTC.Cool - Stacks wallet integration with Turnkey embedded wallet",
    description: "sBTC.Cool is a Stacks wallet integration with Turnkey embedded wallet",
    url: "https://sbtc.cool",
    siteName: "sBTC.Cool",
    images: [
      {
        url: "https://sbtc.cool/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "sBTC.Cool - Stacks wallet integration"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "sBTC.Cool - Stacks wallet integration with Turnkey embedded wallet",
    description: "sBTC.Cool is a Stacks wallet integration with Turnkey embedded wallet",
    images: ["https://sbtc.cool/og-image.jpg"]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <TurnkeyProvider>{children}</TurnkeyProvider>
        </Providers>
      </body>
    </html>
  );
}
