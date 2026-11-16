import { extractEmailsFromText, extractPhonesFromTextBlock, normalizeArabicDigits } from "@/lib/phone-parser";

export type AiMataMode =
  | "GLOBAL_COMMAND"
  | "SECURITY_AUDIT"
  | "CONTACT_INTEL"
  | "QR_COMPOSER"
  | "CONVERSION_ADVISOR";

export interface AiMataInput {
  mode: AiMataMode;
  lang: "ar" | "en";
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface AiMataResponse {
  engine: "LIVE_LLM" | "MATA_CORE_ENGINE";
  mode: AiMataMode;
  headline: string;
  summary: string;
  recommendations: string[];
  suggestedAction?: {
    targetSection: "SHARE" | "EXTRACT" | "QR" | "CONVERT";
    label: string;
    payload?: Record<string, unknown>;
  };
}

function runLocalMataEngine(input: AiMataInput): AiMataResponse {
  const isAr = input.lang === "ar";
  const prompt = (input.prompt || "").trim();
  const ctx = input.context || {};

  if (input.mode === "SECURITY_AUDIT") {
    const fileName = String(ctx.fileName || "file");
    const fileSize = Number(ctx.fileSize || 0);
    const mime = String(ctx.fileMimeType || "");
    const sensitiveKeywords = /(contract|passport|id|salary|invoice|secret|key|password|bank|cv|عقد|بطاقة|جواز|راتب|فاتورة|سري|كشف)/i;
    const isSensitive = sensitiveKeywords.test(fileName) || mime.includes("pdf") || mime.includes("zip");

    return {
      engine: "MATA_CORE_ENGINE",
      mode: "SECURITY_AUDIT",
      headline: isAr
        ? isSensitive
          ? "تقييم Mata AI: ملف حساس — يُنصح بأعلى حماية"
          : "تقييم Mata AI: جاهز للمشاركة المشفرة"
        : isSensitive
        ? "Mata AI Audit: Sensitive Asset — Maximum Lock Recommended"
        : "Mata AI Audit: Ready for Encrypted Delivery",
      summary: isAr
        ? `تم فحص الملف "${fileName}" (${Math.max(1, Math.ceil(fileSize / 1024))} KB). ${
            isSensitive
              ? "يحتوي الاسم أو الصيغة على مؤشرات وثائق حساسة؛ نوصي بتفعيل تشفير AES-256-GCM + رمز PIN + الحرق بعد تحميل واحد."
              : "يمكنك تفعيل تشفير AES-256 من جهازك بحيث لا يطلع الخادم على مفتاح فك التشفير مطلقاً."
          }`
        : `Inspected "${fileName}" (${Math.max(1, Math.ceil(fileSize / 1024))} KB). ${
            isSensitive
              ? "Sensitive document pattern detected. Recommended: Client AES-256-GCM + PIN + 1-Time Burn."
              : "Enable AES-256-GCM zero-knowledge mode so decryption keys never leave the URL hash."
          }`,
      recommendations: isAr
        ? [
            "فعّل التشفير الصفري AES-256-GCM لحماية المحتوى قبل الرفع.",
            isSensitive ? "حدّد عدد التحميلات بـ 1x (حرق تلقائي)." : "حدّد صلاحية زمنية 24 ساعة.",
            "شارك رمز QR مع كلمة السر في قناة منفصلة.",
          ]
        : [
            "Enable Zero-Knowledge AES-256-GCM client encryption.",
            isSensitive ? "Set quota to 1x Burn-After-Download." : "Set 24-hour automatic TTL expiration.",
            "Deliver PIN separately from the share QR/URL.",
          ],
      suggestedAction: {
        targetSection: "SHARE",
        label: isAr ? "تطبيق إعدادات الحماية الموصى بها" : "Apply Recommended Security Policy",
        payload: {
          enableE2ee: true,
          burnAfterRead: isSensitive,
          ttlHours: isSensitive ? "24" : "168",
        },
      },
    };
  }

  if (input.mode === "CONTACT_INTEL") {
    const phones = Array.isArray(ctx.phones) ? (ctx.phones as Array<{ normalized: string; countryHint: string; source: string }>) : [];
    const emails = Array.isArray(ctx.emails) ? (ctx.emails as string[]) : [];
    const title = String(ctx.title || ctx.sourceUrl || "");

    const primary = phones[0];
    const whatsappCandidate = phones.find((p) => p.source === "whatsapp") || primary;

    return {
      engine: "MATA_CORE_ENGINE",
      mode: "CONTACT_INTEL",
      headline: isAr
        ? `تحليل Mata AI: تم تنظيم ${phones.length} رقم و ${emails.length} بريد إلكتروني`
        : `Mata AI Dossier: ${phones.length} Phone(s) & ${emails.length} Email(s) Structured`,
      summary: isAr
        ? primary
          ? `الجهة: ${title || "مصدر رابط مشاركة"}. الرقم الأساسي المرشح للتواصل هو ${primary.normalized} (${primary.countryHint})${
              whatsappCandidate ? `، ورابط واتساب المباشر جاهز.` : "."
            }`
          : `لم يتم العثور على أرقام واضحة في المحتوى الحالي — جرّب لصق نص الرسالة أو صفحة الاتصال مباشرة.`
        : primary
        ? `Entity: ${title || "Shared Link"}. Primary contact: ${primary.normalized} (${primary.countryHint}).`
        : "No clear phone numbers found — try pasting the contact page text directly.",
      recommendations: isAr
        ? [
            primary ? `تحويل ${primary.normalized} إلى كود QR جهة اتصال (vCard) بضغطة واحدة.` : "أدخل رابط صفحة اتصل بنا أو رابط wa.me.",
            "تصدير جميع الأرقام كملف VCF أو CSV لاستيرادها في الهاتف.",
            "توليد رابط مشاركة آمن لتقرير جهات الاتصال.",
          ]
        : [
            primary ? `Generate a vCard QR for ${primary.normalized} in one click.` : "Try a contact page URL or wa.me link.",
            "Export extracted records as VCF or CSV.",
            "Save report via Secure File Share.",
          ],
      suggestedAction: primary
        ? {
            targetSection: "QR",
            label: isAr ? "إرسال إلى استوديو QR كـ vCard" : "Send to QR Studio as vCard",
            payload: {
              payloadType: "VCARD",
              title: title || "Extracted Contact",
              fullName: title || "Contact",
              phone: primary.normalized,
              email: emails[0] || "",
            },
          }
        : undefined,
    };
  }

  if (input.mode === "QR_COMPOSER") {
    const ascii = normalizeArabicDigits(prompt);
    const urls = ascii.match(/https?:\/\/[^\s]+/i);
    const phones = extractPhonesFromTextBlock(ascii, "text", "HIGH");
    const emails = extractEmailsFromText(ascii);
    const pinMatch = ascii.match(/(?:pin|كلمة\s*سر|رمز\s*دخول|قفل\s*pin|باسورد|رمز)\s*[:=]?\s*(\d{3,8})/i);

    // Wi-Fi intent detection
    if (/wi-?fi|واي\s*فاي|شبكة/i.test(prompt)) {
      const passMatch = ascii.match(
        /(?:pass(?:word|code)?|ال?باسورد|باسوورد|كلمة\s*(?:المرور|السر)|الرمز)\s*[:=]?\s*["']?([^\s"'\n]+)["']?/i
      );
      const withoutPass = passMatch ? prompt.replace(passMatch[0], " ") : prompt;
      const withoutCmd = withoutPass
        .replace(/^(?:أنشئ|انشئ|اعمل|سوي|اصنع|ولد|جهز|أنشئ لي|اعمل لي|create|make|generate|build)\s+/i, "")
        .replace(/\bqr\b\s*(?:code)?\s*(?:لشبكة|لـ|for)?\s*/gi, " ")
        .trim();

      const explicitNameMatch = withoutCmd.match(
        /(?:ssid|network\s*name|name|اسم\s*الشبكة|اسمه[ا]?)\s*[:=]?\s*["']?([^"'\n,]+?)["']?$/i
      );
      let rawSsid = explicitNameMatch?.[1]?.trim() || "";
      if (!rawSsid) {
        rawSsid = withoutCmd
          .replace(/(?:ل?شبكة\s*)?(?:ال?واي\s*فاي|wi-?fi|wifi|network|شبكة)\s*/gi, " ")
          .replace(/^(?:اسمها|اسمه|اسم)\s+/gi, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      rawSsid = rawSsid.replace(/^["']|["']$/g, "").trim();
      const ssid = rawSsid || "AI_Mata_5G";
      const password = (passMatch?.[1] || "").trim();

      return {
        engine: "MATA_CORE_ENGINE",
        mode: "QR_COMPOSER",
        headline: isAr ? "Mata AI: تم تجهيز QR شبكة Wi-Fi" : "Mata AI: Wi-Fi QR Configured",
        summary: isAr
          ? `اسم الشبكة: ${ssid}${password ? ` · كلمة المرور: ${password}` : " (مفتوحة)"}`
          : `Network: ${ssid}${password ? ` · Password set` : " (Open)"}`,
        recommendations: [
          isAr ? "تضمين شعار Mata AI في منتصف الـ QR مع تصحيح أخطاء Level H." : "Embed Mata AI logo with Level H ECC.",
        ],
        suggestedAction: {
          targetSection: "QR",
          label: isAr ? "تطبيق على منشئ QR" : "Apply to QR Studio",
          payload: {
            payloadType: "WIFI",
            title: `Wi-Fi ${ssid}`,
            ssid,
            password,
            encryption: password ? "WPA" : "nopass",
            logoPreset: "MATA",
            frameCaption: `WIFI // ${ssid}`,
          },
        },
      };
    }

    if (phones.length > 0 && !urls) {
      const p = phones[0];
      const cleanedName = prompt
        .replace(p.raw, " ")
        .replace(emails[0] || "", " ")
        .replace(pinMatch?.[0] || "", " ")
        .replace(/(?:أنشئ|انشئ|اعمل|سوي|اصنع|ولد|جهز|create|make|generate|build|qr|code|vcard|contact|for|to|with|pin|phone|number|لرقم|رقم|هاتف|تليفون|جوال|موبايل|واتساب|جهة\s*اتصال|باسم|كود)/gi, " ")
        .replace(/[:\-|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);
      const displayName = cleanedName || (isAr ? "جهة اتصال Mata AI" : "Mata AI Contact");
      return {
        engine: "MATA_CORE_ENGINE",
        mode: "QR_COMPOSER",
        headline: isAr ? "Mata AI: تم اكتشاف جهة اتصال (vCard)" : "Mata AI: Contact vCard Composed",
        summary: isAr
          ? `رقم الهاتف: ${p.normalized}${emails[0] ? ` · البريد: ${emails[0]}` : ""}`
          : `Phone: ${p.normalized}${emails[0] ? ` · Email: ${emails[0]}` : ""}`,
        recommendations: [isAr ? "سيتم حفظ الكود بشعار Mata AI وتصدير فوري." : "Ready with Mata AI branding."],
        suggestedAction: {
          targetSection: "QR",
          label: isAr ? "تعبئة بيانات vCard في QR" : "Apply vCard to QR Studio",
          payload: {
            payloadType: "VCARD",
            title: cleanedName ? `${cleanedName} (${p.normalized})` : `Contact ${p.normalized}`,
            fullName: displayName,
            phone: p.normalized,
            email: emails[0] || "",
            logoPreset: "MATA",
            pin: pinMatch?.[1] || "",
          },
        },
      };
    }

    if (urls && urls[0]) {
      return {
        engine: "MATA_CORE_ENGINE",
        mode: "QR_COMPOSER",
        headline: isAr ? "Mata AI: تم تجهيز QR للرابط الديناميكي" : "Mata AI: Dynamic URL QR Ready",
        summary: urls[0],
        recommendations: [
          pinMatch ? (isAr ? `تم تفعيل قفل PIN (${pinMatch[1]}).` : `PIN lock enabled.`) : (isAr ? "جاهز مع شعار Mata AI وقفل PIN الاختياري." : "Ready with Mata AI center logo."),
        ],
        suggestedAction: {
          targetSection: "QR",
          label: isAr ? "تطبيق الرابط في QR Studio" : "Apply URL to QR Studio",
          payload: {
            payloadType: "URL",
            destinationUrl: urls[0],
            logoPreset: "MATA",
            pin: pinMatch?.[1] || "",
          },
        },
      };
    }

    return {
      engine: "MATA_CORE_ENGINE",
      mode: "QR_COMPOSER",
      headline: isAr ? "Mata AI: تحويل النص إلى رمز QR" : "Mata AI: Text QR Composed",
      summary: prompt || "Mata AI",
      recommendations: [isAr ? "تم إعداد المحتوى كنص مباشر مع شعار Mata AI." : "Prepared as TEXT QR with Mata AI badge."],
      suggestedAction: {
        targetSection: "QR",
        label: isAr ? "تطبيق النص في QR Studio" : "Apply Text to QR Studio",
        payload: {
          payloadType: "TEXT",
          text: prompt || "Mata AI",
          logoPreset: "MATA",
        },
      },
    };
  }

  if (input.mode === "CONVERSION_ADVISOR") {
    const ext = String(ctx.sourceExt || "").toLowerCase();
    const adviceMap: Record<string, { ar: string; en: string; targets: string[] }> = {
      png: { ar: "للمواقع صغّر الحجم بـ WEBP، وللأيقونات اختر ICO، وللطباعة PDF.", en: "WEBP for web, ICO for favicons, PDF for print.", targets: ["WEBP", "JPEG", "ICO", "PDF"] },
      jpg: { ar: "حوّل إلى WEBP لتقليل الحجم 40% أو PDF للمستندات الرسمية.", en: "WEBP reduces size ~40%; PDF for official sharing.", targets: ["WEBP", "PNG", "PDF"] },
      jpeg: { ar: "حوّل إلى WEBP لتقليل الحجم 40% أو PDF للمستندات.", en: "WEBP reduces size ~40%; PDF for documents.", targets: ["WEBP", "PNG", "PDF"] },
      pdf: { ar: "استخرج النص إلى DOCX أو TXT أو Markdown، أو اعرض المحتوى كـ HTML.", en: "Extract PDF into DOCX, TXT, Markdown, or HTML.", targets: ["DOCX", "TXT", "MD", "HTML"] },
      docx: { ar: "حوّل Word إلى PDF للطباعة الثابتة أو HTML/Markdown للنشر.", en: "Convert Word to PDF for layout lock or HTML/MD for web.", targets: ["PDF", "HTML", "MD", "TXT"] },
      csv: { ar: "حوّل إلى XLSX لملفات Excel المنسقة أو JSON/SQL لقواعد البيانات.", en: "XLSX for Excel, JSON or SQL for databases.", targets: ["XLSX", "JSON", "SQL", "PDF"] },
      xlsx: { ar: "حوّل Excel إلى JSON للبرمجة أو CSV/PDF للمشاركة السريعة.", en: "JSON for APIs, CSV or PDF for quick sharing.", targets: ["JSON", "CSV", "PDF", "HTML"] },
      json: { ar: "حوّل إلى CSV/XLSX للجداول أو YAML للإعدادات.", en: "CSV/XLSX for tables or YAML for config.", targets: ["CSV", "XLSX", "YAML", "XML"] },
    };
    const match = adviceMap[ext] || {
      ar: "اختر الصيغة المطلوبة وسيتولى محرك التحويل المعالجة مع إمكانية المشاركة المشفرة فوراً.",
      en: "Select any target format; output can be immediately encrypted or turned into a QR.",
      targets: ["PDF", "ZIP", "TXT"],
    };

    return {
      engine: "MATA_CORE_ENGINE",
      mode: "CONVERSION_ADVISOR",
      headline: isAr
        ? `توصية Mata AI لصيغة ${ext ? ext.toUpperCase() : "الملف"}`
        : `Mata AI Conversion Strategy (${ext ? ext.toUpperCase() : "FILE"})`,
      summary: isAr ? match.ar : match.en,
      recommendations: match.targets.map((t) =>
        isAr ? `تحويل مقترح ➔ ${t}` : `Recommended output ➔ ${t}`
      ),
    };
  }

  // GLOBAL_COMMAND mode
  // If user attached a file directly in Mata AI, inspect security & format conversion together
  if (typeof ctx.fileName === "string" && ctx.fileName.trim()) {
    const wantsConvert = /convert|تحويل|حول|صيغة|format|pdf|docx|xlsx|webp|png|jpg|zip/i.test(prompt);
    const wantsShare = /share|مشاركة|مشفر|تشفير|آمن|secure|encrypt|حرق|burn/i.test(prompt);
    if (wantsConvert && !wantsShare) {
      const advisor = runLocalMataEngine({
        ...input,
        mode: "CONVERSION_ADVISOR",
        context: { sourceExt: String(ctx.sourceExt || ""), fileName: ctx.fileName },
      });
      return {
        ...advisor,
        mode: "GLOBAL_COMMAND",
        suggestedAction: {
          targetSection: "CONVERT",
          label: isAr ? "فتح الملف في محول الصيغ" : "Open File in Converter",
        },
      };
    }
    const audit = runLocalMataEngine({ ...input, mode: "SECURITY_AUDIT" });
    return {
      ...audit,
      mode: "GLOBAL_COMMAND",
    };
  }

  const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
  const hasQrIntent = /\bqr\b|كود|باركود|واي\s*فاي|wi-?fi|vcard/i.test(prompt);
  if (hasQrIntent && !/extract|استخراج|استخرج/i.test(prompt)) {
    const composed = runLocalMataEngine({ ...input, mode: "QR_COMPOSER" });
    return { ...composed, mode: "GLOBAL_COMMAND" };
  }
  if (/extract|استخراج|استخرج|رقم|هاتف|تليفون|فون|phone|link|wa\.me|whatsapp/i.test(prompt) && urlMatch) {
    return {
      engine: "MATA_CORE_ENGINE",
      mode: "GLOBAL_COMMAND",
      headline: isAr ? "Mata AI: جاهز لاستخراج البيانات والأرقام من الرابط" : "Mata AI: Ready to Extract Contacts from Link",
      summary: urlMatch[0],
      recommendations: [
        isAr ? "فتح قسم استخراج بيانات الهاتف والروابط وتنفيذ الفحص." : "Run deep phone & contact extraction on this link.",
      ],
      suggestedAction: {
        targetSection: "EXTRACT",
        label: isAr ? "تشغيل الاستخراج الآن" : "Extract Data Now",
        payload: { url: urlMatch[0] },
      },
    };
  }
  const directPhones = extractPhonesFromTextBlock(normalizeArabicDigits(prompt), "text", "HIGH");
  const directEmails = extractEmailsFromText(prompt);
  if (directPhones.length > 0 && (/extract|استخراج|استخرج|رقم|هاتف|تليفون|فون|phone/i.test(prompt) || directPhones.length > 1 || directEmails.length > 0)) {
    return {
      engine: "MATA_CORE_ENGINE",
      mode: "GLOBAL_COMMAND",
      headline: isAr
        ? `Mata AI: تم رصد ${directPhones.length} رقم هاتف${directEmails.length ? ` و ${directEmails.length} بريد` : ""}`
        : `Mata AI: Detected ${directPhones.length} Phone(s)${directEmails.length ? ` & ${directEmails.length} Email(s)` : ""}`,
      summary: [...directPhones.map((p) => p.normalized), ...directEmails].join(" · "),
      recommendations: [
        isAr ? "تصدير الأرقام كجهات اتصال vCard/CSV أو استكمال الفحص." : "Export extracted contacts to VCF/CSV or open Extractor.",
      ],
      suggestedAction: {
        targetSection: "EXTRACT",
        label: isAr ? "فتح وتصدير الأرقام" : "Open & Export Contacts",
        payload: { text: prompt, phones: directPhones.map((p) => p.normalized), emails: directEmails },
      },
    };
  }

  if (/convert|تحويل|حول|صيغة|format|pdf|docx|xlsx|webp|png|jpg/i.test(prompt)) {
    return {
      engine: "MATA_CORE_ENGINE",
      mode: "GLOBAL_COMMAND",
      headline: isAr ? "Mata AI: محول جميع الصيغ جاهز" : "Mata AI: Universal All-Format Converter Ready",
      summary: isAr
        ? "يدعم التحويل بين الصور (PNG/JPG/WEBP/BMP/ICO/SVG/PDF) والمستندات (PDF/DOCX/TXT/MD/HTML) والبيانات (XLSX/CSV/JSON/YAML/XML/SQL) والصوت (WAV) والـ ZIP."
        : "Supports Images, Documents (PDF/DOCX/MD/HTML), Spreadsheets (XLSX/CSV/JSON/YAML/XML/SQL), Audio (WAV), and ZIP.",
      recommendations: [
        isAr ? "انتقل لمحول الملفات لرفع الملف والتحويل الفوري." : "Open the Converter to upload and transform formats.",
      ],
      suggestedAction: {
        targetSection: "CONVERT",
        label: isAr ? "فتح محول الملفات" : "Open Converter",
      },
    };
  }

  if (/share|مشاركة|مشفر|تشفير|آمن|secure|encrypt/i.test(prompt)) {
    return {
      engine: "MATA_CORE_ENGINE",
      mode: "GLOBAL_COMMAND",
      headline: isAr ? "Mata AI: خزنة المشاركة المشفرة AES-256" : "Mata AI: Zero-Knowledge Encrypted File Vault",
      summary: isAr
        ? "ارفع أي ملف مع تشفير AES-256-GCM على المتصفح + رمز PIN + بصمة + حرق بعد تحميل واحد."
        : "Share any file with client-side AES-256-GCM encryption, PIN, Biometrics, and Burn-After-Read.",
      recommendations: [
        isAr ? "انتقل للمشاركة الآمنة لإنشاء رابط مشفر." : "Open Secure Share to lock & encrypt a file.",
      ],
      suggestedAction: {
        targetSection: "SHARE",
        label: isAr ? "فتح المشاركة الآمنة" : "Open Secure Share",
      },
    };
  }

  // Fallback to smart QR composer when prompt contains URL, Wi-Fi, Phone, or arbitrary text
  const qrComposed = runLocalMataEngine({
    mode: "QR_COMPOSER",
    lang: input.lang,
    prompt: prompt || "https://taptag.one",
    context: input.context,
  });

  return {
    ...qrComposed,
    mode: "GLOBAL_COMMAND",
  };
}

export async function executeAiMata(input: AiMataInput): Promise<AiMataResponse> {
  const local = runLocalMataEngine(input);
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAiKey && !geminiKey) {
    return local;
  }

  // Optional real LLM enhancement when environment API key is explicitly provided
  try {
    const systemPrompt =
      input.lang === "ar"
        ? "أنت Mata AI، مساعد ذكي مختصر ودقيق لمنظومة مشاركة الملفات المشفرة، استخراج أرقام الهاتف من الروابط، إنشاء QR، وتحويل صيغ الملفات. أجب بصيغة JSON فقط بالحقول: headline, summary, recommendations (مصفوفة من 3 نصوص)."
        : "You are Mata AI, a concise technical assistant for encrypted file sharing, link phone extraction, Smart QR, and file conversion. Respond ONLY as JSON with keys: headline, summary, recommendations (array of 3 short strings).";

    const userPrompt = `Mode: ${input.mode}\nPrompt: ${input.prompt || ""}\nContext: ${JSON.stringify(
      input.context || {}
    ).slice(0, 1500)}`;

    if (openAiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...local,
            engine: "LIVE_LLM",
            headline: parsed.headline || local.headline,
            summary: parsed.summary || local.summary,
            recommendations: Array.isArray(parsed.recommendations)
              ? parsed.recommendations.slice(0, 4)
              : local.recommendations,
          };
        }
      }
    }
  } catch {
    // Graceful fallback to deterministic AI mata engine
  }

  return local;
}
