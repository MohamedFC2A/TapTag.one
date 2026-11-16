import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://taptag.one";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/dashboard",
          "/scan",
          "/llms.txt",
          "/llms-full.txt",
          "/humans.txt",
          "/.well-known/security.txt",
          "/sitemap.xml",
          "/manifest.json",
          "/taptag-official-logo.png",
          "/icon-192.png",
          "/icon-512.png",
        ],
        disallow: ["/api/", "/admin/", "/auth/", "/onboarding/"],
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "Applebot",
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
          "cohere-ai",
        ],
        allow: ["/", "/dashboard", "/scan", "/llms.txt", "/llms-full.txt", "/humans.txt", "/sitemap.xml"],
        disallow: ["/api/", "/admin/", "/auth/", "/onboarding/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
