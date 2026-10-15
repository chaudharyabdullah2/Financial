import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Backdrop } from "@/components/layout/Background";
import { Footer, Navbar } from "@/components/layout/Navbar";
import { HealthProvider } from "@/lib/hooks";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Polarity — Financial Sentiment Intelligence",
  description: "Classify financial news and market language as positive, neutral or negative, with calibrated confidence and transparent explanations.",
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh overflow-x-hidden">
        <HealthProvider>
          <Backdrop />
          <Navbar />
          <main className="relative">{children}</main>
          <Footer />
        </HealthProvider>
      </body>
    </html>
  );
}
