import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-ibm-plex",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TapTag.one - منظومة الهوية الذكية",
  description:
    "منظومة الهوية الذكية المعتمدة للمركبات والأصول عبر تقنيات NFC و QR المشفرة من TapTag.one مع حجب تام لبيانات المالك الشخصية.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable} ${readexPro.variable}`}>
      <body className="min-h-screen bg-[#000000] text-[#E4E4E7] antialiased selection:bg-[#00C853] selection:text-black font-sans">
        {children}
      </body>
    </html>
  );
}
