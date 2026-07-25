import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zenlift | Smart Training",
  description: "Estúdio e Tracker Profissional de Treinos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zenlift",
  },
};

export const viewport: Viewport = {
  themeColor: "#001621",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-noturno text-foreground font-sans selection:bg-vulcanico/30 selection:text-white">
        {/* Desktop wrapper constraint */}
        <div className="w-full min-h-[100dvh] relative overflow-hidden bg-noturno flex flex-col items-stretch">
          {children}
        </div>
      </body>
    </html>
  );
}
