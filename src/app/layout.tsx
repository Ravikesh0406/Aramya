import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aramya.co"),
  title: {
    default: "ARAMYA — Fitness & wellness, at home.",
    template: "%s — ARAMYA",
  },
  description:
    "Managed marketplace for professional fitness and wellness training at home. Yoga, personal training, mobility and weight management with matched trainers. 4-Session Trial ₹999, Monthly Plan ₹4,500/month.",
  keywords: [
    "at home personal trainer",
    "home yoga trainer",
    "fitness at home",
    "mobility training",
    "weight management trainer",
    "ARAMYA",
  ],
  openGraph: {
    title: "ARAMYA — Fitness & wellness, at home.",
    description:
      "Professional fitness and wellness training at home. 4-Session Trial ₹999. Monthly Plan ₹4,500/month.",
    url: "https://aramya.co",
    siteName: "ARAMYA",
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[10px] focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
