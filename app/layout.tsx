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
    "Mechanistic ML researcher working on RL alignment, AI safety, model behavior, and visual reasoning.",
  openGraph: {
    title: "Isabella Beltran Shapland",
    description: "Mechanistic ML researcher: RL alignment, AI safety, model behavior, visual reasoning.",
  },
};

// Apply a saved theme choice before first paint so the page doesn't flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
