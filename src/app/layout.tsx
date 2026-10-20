import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { InspectorProvider } from "@/components/inspector/provider";
import { Shell } from "@/components/layout/shell";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: { default: "Gazette", template: "%s · Gazette" },
  description: "Nigeria's official statistics, retrieved through a Model Context Protocol server and drawn from National Bureau of Statistics tables.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <InspectorProvider>
            <Shell>{children}</Shell>
          </InspectorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
