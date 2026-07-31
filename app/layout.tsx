import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SafeRoute",
    template: "%s | SafeRoute",
  },
  description: "Información orientativa para explorar zonas y lugares turísticos.",
  applicationName: "SafeRoute",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SafeRoute",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
