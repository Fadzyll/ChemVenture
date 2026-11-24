import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "ChemVenture: The Siege of Bonds",
  description: "Permainan papan kimia berbilang pemain — ikatan ion & kovalen.",
  icons: { icon: "/img/logo.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#1a0b3d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" className={fredoka.variable}>
      <body>{children}</body>
    </html>
  );
}
