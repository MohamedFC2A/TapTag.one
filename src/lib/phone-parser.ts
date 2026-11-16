export interface ExtractedPhone {
  raw: string;
  normalized: string;
  digitsOnly: string;
  countryHint: string;
  source: "whatsapp" | "tel_href" | "json_ld" | "url_param" | "text";
  whatsappUrl: string;
  telUrl: string;
  confidence: "HIGH" | "MEDIUM";
}

export interface ExtractedContactResult {
  inputMode: "URL" | "TEXT";
  sourceUrl: string | null;
  fetchStatus: "FETCHED" | "PARTIAL_URL_ONLY" | "DIRECT_TEXT" | "FETCH_BLOCKED";
  fetchNote?: string;
  metadata: {
    title: string | null;
    description: string | null;
    siteName: string | null;
    canonicalUrl: string | null;
  };
  phones: ExtractedPhone[];
  emails: string[];
  whatsappLinks: string[];
  socialLinks: { platform: string; url: string }[];
  externalLinks: string[];
  rawTextPreview: string;
}

const ARABIC_INDIC_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizeArabicDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => ARABIC_INDIC_MAP[ch] ?? ch);
}

export function inferCountryFromPhone(normalized: string): string {
  const digits = normalized.replace(/^\+/, "");
  if (digits.startsWith("20") || /^01[0125]\d{8}$/.test(digits)) return "EG (+20)";
  if (digits.startsWith("966") || /^05\d{8}$/.test(digits)) return "SA (+966)";
  if (digits.startsWith("971")) return "AE (+971)";
  if (digits.startsWith("965")) return "KW (+965)";
  if (digits.startsWith("974")) return "QA (+974)";
  if (digits.startsWith("973")) return "BH (+973)";
  if (digits.startsWith("968")) return "OM (+968)";
  if (digits.startsWith("962")) return "JO (+962)";
  if (digits.startsWith("961")) return "LB (+961)";
  if (digits.startsWith("212")) return "MA (+212)";
  if (digits.startsWith("216")) return "TN (+216)";
  if (digits.startsWith("213")) return "DZ (+213)";
  if (digits.startsWith("44")) return "UK (+44)";
  if (digits.startsWith("49")) return "DE (+49)";
  if (digits.startsWith("33")) return "FR (+33)";
  if (digits.startsWith("90")) return "TR (+90)";
  if (digits.startsWith("1") && digits.length === 11) return "US/CA (+1)";
  return "INTL";
}

export function normalizePhoneCandidate(raw: string): {
  normalized: string;
  digitsOnly: string;
  isValid: boolean;
} {
  const ascii = normalizeArabicDigits(raw).trim();
  // Reject obvious date/dimension/version/ID strings
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }
  if (/^(19\d\d|20\d\d)\s*[-–—/]\s*(19\d\d|20\d\d)$/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }
  if (/^\d{3,5}\s*[-–—]\s*\d{3,5}$/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }
  if (/^\d+\.\d+\.\d+/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }

  let hasPlus = ascii.startsWith("+");
  let digits = ascii.replace(/\D/g, "");

  if (ascii.startsWith("00") && digits.length >= 9) {
    digits = digits.slice(2);
    hasPlus = true;
  }

  // Convert local Egyptian 01xxxxxxxxx (11 digits) to E.164-friendly digits for WhatsApp
  // Strip redundant trunk '0' immediately following common country codes (e.g. +20 010 -> +2010, +966 050 -> +96650)
  const trunkPrefixMatch = digits.match(
    /^(20|966|971|965|974|973|968|962|961|44|33|49|39|34|90)0(\d{7,11})$/
  );
  if (hasPlus && trunkPrefixMatch) {
    digits = `${trunkPrefixMatch[1]}${trunkPrefixMatch[2]}`;
  }

  let waDigits = digits;
  if (!hasPlus && /^01[0125]\d{8}$/.test(digits)) {
    waDigits = `2${digits}`;
  } else if (!hasPlus && /^05\d{8}$/.test(digits)) {
    waDigits = `966${digits.slice(1)}`;
  } else if (
    !hasPlus &&
    /^(201[0125]\d{8}|9665\d{8}|9715\d{8}|965[569]\d{7}|974[3567]\d{7}|9627\d{8}|968[79]\d{7}|973[36]\d{7})$/.test(
      digits
    )
  ) {
    hasPlus = true;
    waDigits = digits;
  }

  if (digits.length < 8 || digits.length > 15) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }

  // Reject repeating identical digits (e.g., 0000000000, 1111111111)
  if (/^(\d)\1{7,}$/.test(digits)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }

  // Reject common Unix epoch / pure timestamp-like sequences starting with 17... or 16... of length >= 10 without formatting or +
  if (!hasPlus && digits.length === 10 && /^(16|17)\d{8}$/.test(digits) && !/[+\s()-]/.test(ascii)) {
    return { normalized: "", digitsOnly: "", isValid: false };
  }

  const normalized = hasPlus ? `+${digits}` : digits;
  return {
    normalized,
    digitsOnly: waDigits,
    isValid: true,
  };
}

export function extractPhonesFromTextBlock(
  text: string,
  source: ExtractedPhone["source"],
  confidence: ExtractedPhone["confidence"] = "MEDIUM"
): ExtractedPhone[] {
  const clean = normalizeArabicDigits(text);
  // Matches international +..., 00..., or formatted local numbers on a single line (no newline spanning)
  const regex =
    /(?:(?:\+|00)\d{1,3}[ \t.\-()]*)?(?:\(?\d{2,4}\)?[ \t.\-]*){2,5}\d{2,5}/g;
  const found: ExtractedPhone[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(clean)) !== null) {
    const raw = m[0].trim();
    // Skip if embedded inside a long word/hash or decimal number
    const prevChar = m.index > 0 ? clean[m.index - 1] : " ";
    const nextChar =
      m.index + raw.length < clean.length ? clean[m.index + raw.length] : " ";
    if (/[a-zA-Z0-9._]/.test(prevChar) && prevChar !== ":") continue;
    if (/[a-zA-Z0-9._]/.test(nextChar)) continue;

    // Require either +, 00, separator, valid local mobile prefix (010/011/012/015/05), or known unspaced international mobile prefix
    const digitsRaw = raw.replace(/\D/g, "");
    const hasPrefixOrSep =
      raw.startsWith("+") ||
      raw.startsWith("00") ||
      /[ \t\-()]/.test(raw) ||
      /^01[0125]\d{8}$/.test(digitsRaw) ||
      /^05\d{8}$/.test(digitsRaw) ||
      /^(201[0125]\d{8}|9665\d{8}|9715\d{8}|965[569]\d{7}|974[3567]\d{7}|9627\d{8}|968[79]\d{7}|973[36]\d{7})$/.test(
        digitsRaw
      );

    if (!hasPrefixOrSep && source === "text") continue;

    const parsed = normalizePhoneCandidate(raw);
    if (!parsed.isValid) continue;

    found.push({
      raw,
      normalized: parsed.normalized,
      digitsOnly: parsed.digitsOnly,
      countryHint: inferCountryFromPhone(parsed.normalized),
      source,
      whatsappUrl: `https://wa.me/${parsed.digitsOnly}`,
      telUrl: `tel:${parsed.normalized}`,
      confidence: raw.startsWith("+") || source !== "text" ? "HIGH" : confidence,
    });
  }

  return found;
}

export function extractPhonesAndLinksFromUrlString(urlStr: string): {
  phones: ExtractedPhone[];
  whatsappLinks: string[];
} {
  const phones: ExtractedPhone[] = [];
  const whatsappLinks: string[] = [];

  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();

    // wa.me/201012345678
    if (host === "wa.me" || host.endsWith(".wa.me")) {
      whatsappLinks.push(u.toString());
      const pathDigits = u.pathname.replace(/\D/g, "");
      if (pathDigits.length >= 8 && pathDigits.length <= 15) {
        const parsed = normalizePhoneCandidate(`+${pathDigits}`);
        if (parsed.isValid) {
          phones.push({
            raw: `+${pathDigits}`,
            normalized: parsed.normalized,
            digitsOnly: parsed.digitsOnly,
            countryHint: inferCountryFromPhone(parsed.normalized),
            source: "whatsapp",
            whatsappUrl: `https://wa.me/${parsed.digitsOnly}`,
            telUrl: `tel:${parsed.normalized}`,
            confidence: "HIGH",
          });
        }
      }
    }

    // api.whatsapp.com/send?phone=2010...
    if (host.includes("whatsapp.com")) {
      whatsappLinks.push(u.toString());
      const phoneParam = u.searchParams.get("phone") || u.searchParams.get("text") || "";
      if (phoneParam) {
        phones.push(...extractPhonesFromTextBlock(phoneParam, "whatsapp", "HIGH"));
      }
    }

    // Any query param containing phone/tel/mobile/whatsapp/contact/num
    for (const [k, v] of u.searchParams.entries()) {
      if (/phone|tel|mobile|wa|contact|num|call/i.test(k)) {
        phones.push(...extractPhonesFromTextBlock(v, "url_param", "HIGH"));
      }
    }
  } catch {
    // fallback to text scan
  }

  return { phones, whatsappLinks };
}

export function deduplicatePhones(list: ExtractedPhone[]): ExtractedPhone[] {
  const map = new Map<string, ExtractedPhone>();
  const rank = { whatsapp: 5, tel_href: 4, json_ld: 3, url_param: 2, text: 1 };

  for (const item of list) {
    const key = item.digitsOnly;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else if (rank[item.source] > rank[existing.source]) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

export function extractEmailsFromText(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const filtered = matches.filter(
    (e) =>
      !/\.(png|jpg|jpeg|webp|svg|gif|css|js)$/i.test(e) &&
      !e.includes("example.com") &&
      e.length <= 120
  );
  return Array.from(new Set(filtered.map((e) => e.toLowerCase())));
}

export function detectSocialPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "Facebook";
    if (host.includes("twitter.com") || host === "x.com" || host.endsWith(".x.com"))
      return "X / Twitter";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host === "t.me" || host.includes("telegram.me")) return "Telegram";
    if (host.includes("snapchat.com")) return "Snapchat";
    if (host.includes("maps.google.") || host.includes("goo.gl/maps") || host.includes("maps.app.goo.gl"))
      return "Google Maps";
    return null;
  } catch {
    return null;
  }
}
