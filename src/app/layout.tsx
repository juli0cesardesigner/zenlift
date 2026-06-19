import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IronSilicon | PWA",
  description: "Stealth PWA Prototype",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IronSilicon",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased bg-noturno text-foreground font-sans selection:bg-transparent selection:text-foreground">
        {/* Desktop wrapper constraint */}
        <div className="mx-auto w-full max-w-[480px] min-h-[100dvh] relative overflow-hidden bg-noturno shadow-2xl flex flex-col items-stretch">
          {children}
        </div>
      </body>
    </html>
  );
}
