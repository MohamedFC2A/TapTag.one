import dns from "dns/promises";
import net from "net";
import * as cheerio from "cheerio";
import {
  deduplicatePhones,
  detectSocialPlatform,
  ExtractedContactResult,
  ExtractedPhone,
  extractEmailsFromText,
  extractPhonesAndLinksFromUrlString,
  extractPhonesFromTextBlock,
} from "@/lib/phone-parser";

function expandIpv6ToWords(ip: string): number[] | null {
  const clean = ip.split("%")[0].toLowerCase();
  const parts = clean.split("::");
  if (parts.length > 2) return null;

  const parseSegmentGroup = (seg: string): number[] | null => {
    if (!seg) return [];
    const tokens = seg.split(":");
    const words: number[] = [];
    for (const t of tokens) {
      if (t.includes(".")) {
        const octets = t.split(".").map(Number);
        if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
          return null;
        }
        words.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(t)) return null;
        words.push(parseInt(t, 16));
      }
    }
    return words;
  };

  const left = parseSegmentGroup(parts[0]);
  if (!left) return null;
  if (parts.length === 1) {
    return left.length === 8 ? left : null;
  }
  const right = parseSegmentGroup(parts[1]);
  if (!right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 0) return null;
  return [...left, ...new Array(missing).fill(0), ...right];
}

function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const rest = lower.slice(7);
    if (net.isIPv4(rest)) return isPrivateIp(rest);
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((n) => Number(n));
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) return true;
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }

  // IPv6 full 128-bit inspection
  const words = expandIpv6ToWords(lower);
  if (!words) return true;

  const isZeroPrefix = words.slice(0, 6).every((w) => w === 0);
  // IPv4-compatible (::/96) or IPv4-mapped (::ffff:0:0/96)
  if ((words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) || isZeroPrefix) {
    const embeddedV4 = `${words[6] >> 8}.${words[6] & 0xff}.${words[7] >> 8}.${words[7] & 0xff}`;
    // Allow only non-loopback/non-unspecified embedded IPv4 checks; block :: and ::1
    if (isZeroPrefix && words[6] === 0 && (words[7] === 0 || words[7] === 1)) {
      return true;
    }
    return isPrivateIp(embeddedV4);
  }

  // NAT64 well-known 64:ff9b::/96 and local-use 64:ff9b:1::/48 -> check embedded IPv4 AND block NAT64
  if (words[0] === 0x0064 && words[1] === 0xff9b) {
    return true;
  }
  // Teredo (2001:0000::/32) & 6to4 (2002::/16) & Documentation (2001:db8::/32) & Benchmarking (2001:2::/48)
  if (words[0] === 0x2001 && (words[1] === 0x0000 || words[1] === 0x0db8 || (words[1] === 0x0002 && words[2] === 0x0000))) {
    return true;
  }
  if (words[0] === 0x2002) {
    const embeddedV4 = `${words[1] >> 8}.${words[1] & 0xff}.${words[2] >> 8}.${words[2] & 0xff}`;
    return isPrivateIp(embeddedV4);
  }
  // Discard-only 100::/64
  if (words[0] === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) {
    return true;
  }
  // ULA fc00::/7
  if ((words[0] & 0xfe00) === 0xfc00) return true;
  // Link-local fe80::/10
  if ((words[0] & 0xffc0) === 0xfe80) return true;
  // Multicast ff00::/8
  if ((words[0] & 0xff00) === 0xff00) return true;

  return false;
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const normalized = /^https?:\/\//i.test(rawUrl.trim())
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;

  const u = new URL(normalized);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  if (u.username || u.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  const rawHost = u.hostname.toLowerCase();
  const host =
    rawHost.startsWith("[") && rawHost.endsWith("]")
      ? rawHost.slice(1, -1)
      : rawHost;
  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Local or internal hostnames are blocked.");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("Private or loopback IP targets are blocked.");
    }
    return u;
  }

  const resolved = await dns.lookup(host, { all: true });
  if (!resolved.length || resolved.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Target resolves to a private or unreachable network address.");
  }

  return u;
}

async function safeFetchPublicPage(initialUrl: string): Promise<{
  finalUrl: string;
  contentType: string;
  body: string;
}> {
  let currentUrl = (await assertPublicHttpUrl(initialUrl)).toString();

  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
          "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error(`Redirect (${res.status}) without location`);
        const nextUrl = new URL(loc, currentUrl).toString();
        currentUrl = (await assertPublicHttpUrl(nextUrl)).toString();
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "text/html";
      const reader = res.body?.getReader();
      if (!reader) {
        return { finalUrl: currentUrl, contentType, body: await res.text() };
      }

      const chunks: Uint8Array[] = [];
      let received = 0;
      const MAX_BYTES = 2_000_000;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > MAX_BYTES) {
            chunks.push(value.slice(0, value.byteLength - (received - MAX_BYTES)));
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }

      const merged = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
      return { finalUrl: currentUrl, contentType, body: merged };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects");
}

function collectJsonLdEntities(obj: unknown, phones: ExtractedPhone[], emails: Set<string>, links: Set<string>) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectJsonLdEntities(item, phones, emails, links);
    return;
  }
  const rec = obj as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === "string") {
      if (/telephone|phone|contact|fax/i.test(k)) {
        phones.push(...extractPhonesFromTextBlock(v, "json_ld", "HIGH"));
      } else if (/email/i.test(k)) {
        for (const em of extractEmailsFromText(v)) emails.add(em);
      } else if (/sameAs|url/i.test(k) && /^https?:\/\//i.test(v)) {
        links.add(v);
      }
    } else if (typeof v === "object" && v !== null) {
      collectJsonLdEntities(v, phones, emails, links);
    }
  }
}

export function extractDataFromRawContent(
  rawBody: string,
  sourceUrl: string | null = null,
  inputMode: "URL" | "TEXT" = "TEXT",
  fetchStatus: ExtractedContactResult["fetchStatus"] = "DIRECT_TEXT",
  fetchNote?: string
): ExtractedContactResult {
  const allPhones: ExtractedPhone[] = [];
  const allEmails = new Set<string>();
  const whatsappSet = new Set<string>();
  const externalLinks = new Set<string>();
  const socialMap = new Map<string, { platform: string; url: string }>();

  let title: string | null = null;
  let description: string | null = null;
  let siteName: string | null = null;
  let canonicalUrl: string | null = null;
  let visibleText = rawBody;

  if (sourceUrl) {
    const fromUrl = extractPhonesAndLinksFromUrlString(sourceUrl);
    allPhones.push(...fromUrl.phones);
    fromUrl.whatsappLinks.forEach((w) => whatsappSet.add(w));
  }

  const looksHtml = /<(html|head|body|a|meta|div|p|span|script)\b/i.test(rawBody);

  if (looksHtml) {
    const $ = cheerio.load(rawBody);
    title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      null;
    description =
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="description"]').attr("content")?.trim() ||
      null;
    siteName = $('meta[property="og:site_name"]').attr("content")?.trim() || null;
    canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() || null;

    // JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        collectJsonLdEntities(parsed, allPhones, allEmails, externalLinks);
      } catch {
        // ignore invalid JSON-LD
      }
    });

    // Anchor links
    $("a[href]").each((_, el) => {
      const href = ($(el).attr("href") || "").trim();
      if (!href) return;

      if (href.toLowerCase().startsWith("tel:")) {
        allPhones.push(...extractPhonesFromTextBlock(href.slice(4), "tel_href", "HIGH"));
      } else if (href.toLowerCase().startsWith("mailto:")) {
        const clean = href.slice(7).split("?")[0].trim();
        extractEmailsFromText(clean).forEach((em) => allEmails.add(em));
      } else {
        try {
          const resolved = sourceUrl ? new URL(href, sourceUrl).toString() : href;
          if (/^https?:\/\//i.test(resolved)) {
            externalLinks.add(resolved);
            const fromLink = extractPhonesAndLinksFromUrlString(resolved);
            allPhones.push(...fromLink.phones);
            fromLink.whatsappLinks.forEach((w) => whatsappSet.add(w));
            const plat = detectSocialPlatform(resolved);
            if (plat && !socialMap.has(resolved)) {
              socialMap.set(resolved, { platform: plat, url: resolved });
            }
          }
        } catch {
          // ignore malformed href
        }
      }
    });

    // Extract phone/contact hints from meta tags, data attributes, and embedded JSON before stripping scripts
    const extraAttributeText: string[] = [];
    $(
      '[data-phone], [data-tel], [data-whatsapp], [data-mobile], meta[property*="phone" i], meta[name*="phone" i], meta[name*="telephone" i], meta[property*="whatsapp" i]'
    ).each((_, el) => {
      const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs || {};
      for (const k of ["data-phone", "data-tel", "data-whatsapp", "data-mobile", "content"]) {
        if (attribs[k]) extraAttributeText.push(attribs[k]);
      }
    });
    for (const chunk of extraAttributeText) {
      for (const p of extractPhonesFromTextBlock(chunk, "json_ld", "HIGH")) {
        allPhones.push(p);
      }
    }

    $("script, style, noscript, svg").remove();
    visibleText = $("body").text().replace(/\s+/g, " ").trim() || $.text().replace(/\s+/g, " ").trim();
  } else {
    // Scan standalone URLs embedded in raw text
    const urlMatches = rawBody.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    for (const u of urlMatches) {
      externalLinks.add(u);
      const fromLink = extractPhonesAndLinksFromUrlString(u);
      allPhones.push(...fromLink.phones);
      fromLink.whatsappLinks.forEach((w) => whatsappSet.add(w));
      const plat = detectSocialPlatform(u);
      if (plat && !socialMap.has(u)) {
        socialMap.set(u, { platform: plat, url: u });
      }
    }
  }

  // Extract phones & emails from visible text
  allPhones.push(...extractPhonesFromTextBlock(visibleText, "text", "MEDIUM"));
  extractEmailsFromText(visibleText).forEach((em) => allEmails.add(em));

  const dedupedPhones = deduplicatePhones(allPhones);
  dedupedPhones.forEach((p) => {
    if (p.source === "whatsapp") whatsappSet.add(p.whatsappUrl);
  });

  return {
    inputMode,
    sourceUrl,
    fetchStatus,
    fetchNote,
    metadata: {
      title,
      description,
      siteName,
      canonicalUrl,
    },
    phones: dedupedPhones,
    emails: Array.from(allEmails),
    whatsappLinks: Array.from(whatsappSet),
    socialLinks: Array.from(socialMap.values()).slice(0, 20),
    externalLinks: Array.from(externalLinks).slice(0, 30),
    rawTextPreview: visibleText.slice(0, 500),
  };
}

export async function extractFromSharedLink(urlInput: string): Promise<ExtractedContactResult> {
  const fromUrlOnly = extractPhonesAndLinksFromUrlString(urlInput);

  // If URL is a direct WhatsApp chat link, decode immediately AND still try metadata if non-wa.me
  try {
    const parsedUrl = new URL(
      /^https?:\/\//i.test(urlInput.trim()) ? urlInput.trim() : `https://${urlInput.trim()}`
    );
    if (parsedUrl.hostname.toLowerCase() === "wa.me" || parsedUrl.hostname.toLowerCase().includes("whatsapp.com")) {
      const textParam = parsedUrl.searchParams.get("text") || "";
      const directResult = extractDataFromRawContent(
        `${urlInput}\n${textParam}`,
        parsedUrl.toString(),
        "URL",
        "PARTIAL_URL_ONLY",
        "Extracted directly from WhatsApp share link parameters."
      );
      return directResult;
    }
  } catch {
    // continue to full validation/fetch
  }

  try {
    const { finalUrl, body } = await safeFetchPublicPage(urlInput);
    return extractDataFromRawContent(body, finalUrl, "URL", "FETCHED");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch remote link";
    // Even if blocked/offline/403, return any phone/WhatsApp parameters parsed directly from the URL itself
    const fallback = extractDataFromRawContent(
      urlInput,
      urlInput,
      "URL",
      fromUrlOnly.phones.length > 0 ? "PARTIAL_URL_ONLY" : "FETCH_BLOCKED",
      message
    );
    return fallback;
  }
}
