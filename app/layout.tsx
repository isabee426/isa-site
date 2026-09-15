import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

// One typeface for the whole site; weight and size carry the hierarchy.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Isabella Beltran Shapland",
  description:
    "Mechanistic ML researcher working on RL alignment, visual reasoning, and model reliability.",
  openGraph: {
    title: "Isabella Beltran Shapland",
    description: "Mechanistic ML researcher: RL alignment, visual reasoning, model reliability.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}
