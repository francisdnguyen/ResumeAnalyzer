import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Resume Analyzer",
  description: "AI-powered resume analysis and job match scoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans bg-gray-950 text-gray-100 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
