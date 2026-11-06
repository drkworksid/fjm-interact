import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slido Training - Real-time Audience Interaction",
  description: "Platform interaksi Q&A dan Live Polling untuk sesi training dan meeting.",
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

