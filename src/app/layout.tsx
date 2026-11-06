import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FJM InterAct - Real-time Audience Interaction Platform",
  description: "Platform interaksi Q&A dan Live Polling untuk training & meeting by PT Fiqry Jaya Manunggal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
