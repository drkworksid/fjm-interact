import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FJM InterAct - Real-time Audience Interaction Platform",
  description: "Platform interaksi Q&A dan Live Polling untuk training & meeting by PT Fiqry Jaya Manunggal.",
  icons: {
    icon: "/fjm-logo.png",
    shortcut: "/fjm-logo.png",
    apple: "/fjm-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} min-h-screen flex flex-col font-sans bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
