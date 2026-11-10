import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Font yang sama dengan mockup HTML.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Rifan Finance", template: "%s · Rifan Finance" },
  description: "Setiap rupiah tercatat, setiap tujuan tercapai",
  icons: { icon: "/brand/app-icon.png", apple: "/brand/app-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B4D3B",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
