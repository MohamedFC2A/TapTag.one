import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Space_Grotesk, Archivo, Kaushan_Script } from "next/font/google";
import "./globals.css";
import { PWAInstallAndPermissionsModal } from "@/components/ui/PWAInstallAndPermissionsModal";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-ibm-plex",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const archivoBrand = Archivo({
  subsets: ["latin"],
  variable: "--font-taptag",
  weight: ["700", "800", "900"],
  display: "swap",
});

const mataScript = Kaushan_Script({
  subsets: ["latin"],
  variable: "--font-mata",
  weight: ["400"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://taptag.one"),
  applicationName: "TapTag.one",
  title: {
    default: "TapTag.one — Built By Matany Group | Secure Share · Extract · Smart QR · Mata AI · Convert",
    template: "%s | TapTag.one — Matany Group",
  },
  description:
    "Unified TapTag.one platform Built By Matany Group (المطعني جروب) and developed by Mohamed Matany (محمد مطعني): AES-256 encrypted file sharing, link phone/data extraction, dynamic Smart QR codes, Mata AI assistant, and universal file format conversion.",
  keywords: [
    "TapTag",
    "taptag.one",
    "Mata AI",
    "ماتا AI",
    "Matany Group",
    "المطعني جروب",
    "Built By Matany Group",
    "matanygroup.com",
    "Mohamed Matany",
    "محمد مطعني",
    "محمد أحمد مطعني",
    "upstore.one",
    "matany.one",
    "e7dar.com",
    "brand.one",
    "Dynamic Smart QR",
    "Encrypted File Share AES-256",
    "Link Phone Extractor",
    "Universal File Converter",
  ],
  authors: [
    { name: "Mohamed Matany (محمد مطعني)", url: "https://matany.one" },
    { name: "Matany Group (المطعني جروب)", url: "https://matanygroup.com" },
  ],
  creator: "Mohamed Matany — Matany Group",
  publisher: "Matany Group (المطعني جروب)",
  alternates: {
    canonical: "https://taptag.one",
    languages: {
      ar: "https://taptag.one/?lang=ar",
      en: "https://taptag.one/?lang=en",
      "x-default": "https://taptag.one",
    },
  },
  openGraph: {
    type: "website",
    url: "https://taptag.one",
    siteName: "TapTag.one — Built By Matany Group",
    title: "TapTag.one — Smart QR · Encrypted Share · Extract · Mata AI · Convert",
    description:
      "Official TapTag.one suite Built By Matany Group and engineered by Mohamed Matany, powered by Mata AI.",
    locale: "ar_SA",
    alternateLocale: ["en_US", "ar_EG"],
    images: [
      {
        url: "/taptag-official-logo.png",
        width: 1200,
        height: 630,
        alt: "TapTag.one — Built By Matany Group",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TapTag.one — Built By Matany Group | Mata AI Suite",
    description:
      "AES-256 encrypted sharing, phone extraction, dynamic Smart QR, Mata AI, and universal file conversion by Mohamed Matany (Matany Group).",
    images: ["/taptag-official-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TapTag.one",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

const taptagUmbrellaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://matanygroup.com/#developer",
      name: "Mohamed Matany",
      alternateName: ["محمد مطعني", "محمد أحمد مطعني", "Mohamed Ahmed Matany"],
      jobTitle: "Founder & Lead Software Architect",
      email: "mo@matany.one",
      url: "https://matany.one",
      worksFor: { "@id": "https://matanygroup.com/#organization" },
      sameAs: [
        "https://matanygroup.com",
        "https://taptag.one",
        "https://upstore.one",
        "https://matany.one",
        "https://e7dar.com",
        "https://www.tiktok.com/@mo_matany",
      ],
    },
    {
      "@type": "Corporation",
      "@id": "https://matanygroup.com/#organization",
      name: "MATANY GROUP",
      legalName: "MATANY GROUP",
      alternateName: ["المطعني جروب", "Matany Group", "Built By Matany Group"],
      url: "https://matanygroup.com/",
      email: "support@matanygroup.com",
      foundingDate: "2019",
      founder: { "@id": "https://matanygroup.com/#developer" },
      creator: { "@id": "https://matanygroup.com/#developer" },
      sameAs: [
        "https://matanygroup.com",
        "https://taptag.one",
        "https://upstore.one",
        "https://matany.one",
        "https://e7dar.com",
        "https://brand.one",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://taptag.one/#webapp",
      name: "TapTag.one",
      alternateName: ["TapTag", "taptag.", "TapTag Smart Access"],
      url: "https://taptag.one",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      creator: { "@id": "https://matanygroup.com/#developer" },
      publisher: { "@id": "https://matanygroup.com/#organization" },
      description:
        "TapTag.one — Built By Matany Group and engineered by Mohamed Matany. AES-256 encrypted file sharing, link phone extraction, dynamic Smart QR, Mata AI, and universal file format conversion.",
      brand: [
        { "@type": "Brand", name: "TapTag" },
        { "@type": "Brand", name: "Mata AI" },
        { "@type": "Brand", name: "Matany Group" },
      ],
      sameAs: [
        "https://matanygroup.com",
        "https://upstore.one",
        "https://matany.one",
        "https://e7dar.com",
        "https://brand.one",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://taptag.one/#mata-ai",
      name: "Mata AI",
      alternateName: ["ماتا AI", "Mata AI Engine"],
      applicationCategory: "AIApplication",
      operatingSystem: "Web",
      url: "https://taptag.one",
      description:
        "Mata AI — Bespoke AI engine Built By Matany Group and engineered by Mohamed Matany, shared across TapTag.one and UpStore.one.",
      creator: { "@id": "https://matanygroup.com/#developer" },
      publisher: { "@id": "https://matanygroup.com/#organization" },
      isPartOf: { "@id": "https://taptag.one/#website" },
    },
    {
      "@type": "WebSite",
      "@id": "https://taptag.one/#website",
      url: "https://taptag.one",
      name: "TapTag.one — Built By Matany Group",
      publisher: { "@id": "https://matanygroup.com/#organization" },
      creator: { "@id": "https://matanygroup.com/#developer" },
      inLanguage: ["ar", "en"],
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://taptag.one/#breadcrumbs",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Matany Group", item: "https://matanygroup.com" },
        { "@type": "ListItem", position: 2, name: "TapTag.one", item: "https://taptag.one" },
        { "@type": "ListItem", position: 3, name: "Codes & Scan", item: "https://taptag.one/dashboard" },
        { "@type": "ListItem", position: 4, name: "QR Scanner", item: "https://taptag.one/scan" },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexArabic.variable} ${spaceGrotesk.variable} ${archivoBrand.variable} ${mataScript.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          id="schema-umbrella-graph"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(taptagUmbrellaJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className="min-h-screen bg-[#09090B] text-[#F4F4F5] antialiased selection:bg-white selection:text-black font-sans">
        {children}
        <PWAInstallAndPermissionsModal />
      </body>
    </html>
  );
}
