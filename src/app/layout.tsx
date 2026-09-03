import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ChunkErrorReload } from "@/components/chunk-error-reload";
import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gig Atlas",
  description:
    "An interactive globe for documenting venues, photos, and videos from live performances.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ChunkErrorReload />
        {children}
      </body>
    </html>
  );
}
