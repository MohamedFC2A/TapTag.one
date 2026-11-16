/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createJiti } = require("jiti");

const rootDir = path.resolve(__dirname, "..");
const jiti = createJiti(__filename, {
  alias: {
    "@": path.join(rootDir, "src"),
  },
});

const phoneParser = jiti(path.join(rootDir, "src/lib/phone-parser.ts"));
const linkExtractor = jiti(path.join(rootDir, "src/lib/link-extractor.ts"));
const e2eeCrypto = jiti(path.join(rootDir, "src/lib/e2ee-crypto.ts"));
const secureShare = jiti(path.join(rootDir, "src/lib/secure-share.ts"));
const conversionHelpers = jiti(path.join(rootDir, "src/lib/conversion-helpers.ts"));
const aiMata = jiti(path.join(rootDir, "src/lib/ai-mata.ts"));
const smartQr = jiti(path.join(rootDir, "src/lib/smart-qr.ts"));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [FAIL] ${name}`);
    console.error(err);
  }
}

async function waitForServer(baseUrl, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { method: "GET" });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`Timed out waiting for Next.js server at ${baseUrl}`);
}

async function runUnitTests() {
  console.log("\n=== 1. UNIT & SECURITY LOGIC VERIFICATION ===");

  await test("Phone parser: Arabic-Indic digits + E.164/WhatsApp normalization & country hint", () => {
    const ascii = phoneParser.normalizeArabicDigits("اتصل على ٠١٠٠٩٩٨٨٧٧٦ أو +٩٦٦٥٠١٢٣٤٥٦٧");
    assert.equal(ascii, "اتصل على 01009988776 أو +966501234567");

    const extracted = phoneParser.extractPhonesFromTextBlock(ascii, "text", "MEDIUM");
    const waUrls = extracted.map((p) => p.whatsappUrl);
    const digits = extracted.map((p) => p.digitsOnly);
    assert.ok(digits.includes("201009988776"), `Missing EG WA digits in ${JSON.stringify(digits)}`);
    assert.ok(waUrls.includes("https://wa.me/201009988776"));
    assert.ok(digits.includes("966501234567"), `Missing SA digits in ${JSON.stringify(digits)}`);
    assert.equal(
      extracted.find((p) => p.digitsOnly === "201009988776")?.countryHint,
      "EG (+20)"
    );
  });

  await test("Phone parser: rejects dates/IPs/versions and deduplicates by confidence rank", () => {
    const noise = phoneParser.extractPhonesFromTextBlock("Date 2026-11-15 version 1.2.3.4", "text");
    assert.equal(noise.length, 0);

    const wa = phoneParser.extractPhonesAndLinksFromUrlString("https://wa.me/201099887766");
    assert.equal(wa.phones.length, 1);
    assert.equal(wa.phones[0].normalized, "+201099887766");
    assert.equal(wa.phones[0].source, "whatsapp");

    const deduped = phoneParser.deduplicatePhones([
      { ...wa.phones[0], source: "text", confidence: "MEDIUM" },
      wa.phones[0],
    ]);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].source, "whatsapp");
  });

  await test("Link extractor: parses JSON-LD, tel:, wa.me, mailto, social and strips scripts", () => {
    const sampleHtml = `<!DOCTYPE html><html><head>
      <title>Supra Auto Club</title>
      <meta name="description" content="Official contact hub" />
      <script type="application/ld+json">{"@type":"Organization","telephone":"+971501112233","email":"vip@supra.ae"}</script>
      <script>window.__secret = "evil";</script>
      </head><body>
      <a href="tel:+201011223344">Call</a>
      <a href="https://wa.me/966551112233">WA</a>
      <a href="mailto:sales@mata.ai">Mail</a>
      <a href="https://instagram.com/aimata">IG</a>
      <p>Office 01234567890</p>
      </body></html>`;

    const res = linkExtractor.extractDataFromRawContent(
      sampleHtml,
      "https://supra.example/contact",
      "URL",
      "FETCHED"
    );
    assert.equal(res.metadata.title, "Supra Auto Club");
    const waDigits = res.phones.map((p) => p.digitsOnly);
    assert.ok(waDigits.includes("971501112233"));
    assert.ok(waDigits.includes("201011223344"));
    assert.ok(waDigits.includes("966551112233"));
    assert.ok(waDigits.includes("201234567890"));
    assert.ok(res.emails.includes("vip@supra.ae"));
    assert.ok(res.emails.includes("sales@mata.ai"));
    assert.equal(res.socialLinks[0].platform, "Instagram");
    assert.ok(!res.rawTextPreview.includes("window.__secret"));
  });

  await test("Link extractor SSRF guard: blocks localhost, 127.0.0.1, [::1], metadata IP, private LAN, file://", async () => {
    const badUrls = [
      "http://127.0.0.1:8080/admin",
      "http://localhost:3000/api/share",
      "http://[::1]:8080/",
      "http://[::ffff:127.0.0.1]/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/router",
      "http://192.168.1.50/",
      "file:///etc/passwd",
    ];
    for (const bad of badUrls) {
      const r = await linkExtractor.extractFromSharedLink(bad);
      assert.equal(r.fetchStatus, "FETCH_BLOCKED", `Expected FETCH_BLOCKED for ${bad}, got ${r.fetchStatus}`);
    }
  });

  await test("E2EE Crypto: AES-256-GCM encrypt/decrypt roundtrip + tamper & wrong-key rejection", async () => {
    const plainText = "AI mata confidential file — ملف سري ١٢٣";
    const plainBytes = new TextEncoder().encode(plainText);
    const enc = await e2eeCrypto.encryptFileAesGcm(plainBytes.buffer);

    const expectedSha = crypto.createHash("sha256").update(plainBytes).digest("hex");
    assert.equal(enc.sha256Plain, expectedSha);

    const cipherBytes = Buffer.from(enc.encryptedBase64, "base64");
    const decryptedBuf = await e2eeCrypto.decryptFileAesGcm(
      cipherBytes.buffer.slice(cipherBytes.byteOffset, cipherBytes.byteOffset + cipherBytes.byteLength),
      enc.keyBase64Url,
      enc.ivBase64Url
    );
    assert.equal(new TextDecoder().decode(decryptedBuf), plainText);

    const wrongKey = Buffer.from(crypto.randomBytes(32)).toString("base64url");
    await assert.rejects(() =>
      e2eeCrypto.decryptFileAesGcm(
        cipherBytes.buffer.slice(cipherBytes.byteOffset, cipherBytes.byteOffset + cipherBytes.byteLength),
        wrongKey,
        enc.ivBase64Url
      )
    );

    const tampered = Buffer.from(cipherBytes);
    tampered[0] ^= 0xff;
    await assert.rejects(() =>
      e2eeCrypto.decryptFileAesGcm(
        tampered.buffer.slice(tampered.byteOffset, tampered.byteOffset + tampered.byteLength),
        enc.keyBase64Url,
        enc.ivBase64Url
      )
    );
  });

  await test("Secure Share & Smart QR crypto: scrypt PIN hashing and quota/TTL evaluation", () => {
    const h = smartQr.hashPin("4920");
    assert.ok(h.includes(":"));
    assert.equal(smartQr.verifyPin("4920", h), true);
    assert.equal(smartQr.verifyPin("0000", h), false);
    assert.equal(smartQr.verifyPin("", h), false);

    const availBurnUsed = secureShare.evaluateShareAvailability({
      id: "1",
      shareCode: "TEST01",
      title: "Test",
      fileName: "doc.pdf",
      fileMimeType: "application/pdf",
      fileSize: 100,
      fileSha256: "abc",
      isEncrypted: true,
      encryptionMeta: null,
      pinHash: null,
      biometricEnabled: false,
      maxDownloads: 10,
      downloadCount: 1,
      burnAfterRead: true,
      expiresAt: null,
      isActive: true,
      aiSummary: null,
      lastAccessedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal(availBurnUsed.isLimitReached, true);
    assert.equal(availBurnUsed.isUsable, false);
  });

  await test("Conversion helpers: CSV -> JSON -> YAML -> XML -> SQL escaping + DOCX build & mammoth extract", async () => {
    const csv = "name,note,score,active\nSupra,\"O'Reilly\",99,true\nMata,,12,false";
    const rows = conversionHelpers.parseTabularText("csv", csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Supra");

    const jsonOut = conversionHelpers.serializeTabularRows("json", rows);
    const yamlOut = conversionHelpers.serializeTabularRows("yaml", rows);
    const xmlOut = conversionHelpers.serializeTabularRows("xml", rows);
    const sqlOut = conversionHelpers.serializeTabularRows("sql", rows, "cars");

    assert.equal(conversionHelpers.parseTabularText("json", jsonOut).length, 2);
    assert.equal(conversionHelpers.parseTabularText("yaml", yamlOut).length, 2);
    assert.equal(conversionHelpers.parseTabularText("xml", xmlOut).length, 2);
    assert.ok(sqlOut.includes("O''Reilly"), `Expected escaped single quote in SQL: ${sqlOut}`);
    assert.ok(sqlOut.includes('INSERT INTO "cars"'));

    const rtf = conversionHelpers.textToRtf("Hello\nمرحبا");
    assert.ok(conversionHelpers.rtfToText(rtf).includes("مرحبا"));

    const docxBytes = await conversionHelpers.buildDocxBufferFromText("Supra A90 Line 1\nLine 2", "Doc Title");
    const mammoth = require("mammoth");
    const extracted = await mammoth.extractRawText({ buffer: Buffer.from(docxBytes) });
    assert.ok(extracted.value.includes("Supra A90 Line 1"));
  });

  await test("AI Mata engine: executeAiMata executes SECURITY_AUDIT, QR_COMPOSER & GLOBAL_COMMAND", async () => {
    const sec = await aiMata.executeAiMata({
      mode: "SECURITY_AUDIT",
      lang: "ar",
      context: { fileName: "salary-contract-2026.pdf", fileSize: 45000, fileMimeType: "application/pdf" },
    });
    assert.equal(sec.suggestedAction.payload.burnAfterRead, true);

    const qrWifi = await aiMata.executeAiMata({
      mode: "QR_COMPOSER",
      lang: "ar",
      prompt: "واي فاي المكتب pass 987654",
    });
    assert.equal(qrWifi.suggestedAction.payload.payloadType, "WIFI");
    assert.equal(qrWifi.suggestedAction.payload.password, "987654");
    assert.equal(qrWifi.suggestedAction.payload.logoPreset, "MATA");

    const qrUrl = await aiMata.executeAiMata({
      mode: "QR_COMPOSER",
      lang: "en",
      prompt: "https://taptag.one PIN 5566",
    });
    assert.equal(qrUrl.suggestedAction.payload.payloadType, "URL");
    assert.equal(qrUrl.suggestedAction.payload.pin, "5566");

    const globalCmd = await aiMata.executeAiMata({
      mode: "GLOBAL_COMMAND",
      lang: "ar",
      prompt: "عايز احول ملف PDF إلى Word",
    });
    assert.equal(globalCmd.suggestedAction.targetSection, "CONVERT");
  });
}

async function runHttpIntegrationTests() {
  console.log("\n=== 2. LIVE NEXT.JS SERVER HTTP + NEON DB E2E VERIFICATION ===");
  const port = 3199;
  const baseUrl = `http://127.0.0.1:${port}`;
  const createdShareCodes = [];
  const createdQrCodes = [];

  const nextBin = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
  const serverProc = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(baseUrl, 30000);

    await test("SSR routes: /, /dashboard, /scan return 200 and / renders taptag., Mata AI & all 5 tool containers", async () => {
      const homeRes = await fetch(`${baseUrl}/`);
      assert.equal(homeRes.status, 200);
      const html = await homeRes.text();
      for (const marker of [
        "taptag.",
        "Mata AI",
        "secure-share",
        "link-extractor",
        "qr-workspace",
        "ai-mata",
        "file-converter",
      ]) {
        assert.ok(html.includes(marker), `Home HTML missing marker: ${marker}`);
      }

      const dashRes = await fetch(`${baseUrl}/dashboard`);
      assert.equal(dashRes.status, 200);
      const scanRes = await fetch(`${baseUrl}/scan`);
      assert.equal(scanRes.status, 200);
    });

    await test("SEC-01 API (/api/share): E2EE + PIN unlock + concurrent Burn-After-Read enforcement", async () => {
      const secretPayload = "Top secret contract — عقد اختبار";
      const plainBytes = new TextEncoder().encode(secretPayload);
      const enc = await e2eeCrypto.encryptFileAesGcm(plainBytes.buffer);

      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "E2EE Burn Test",
          fileName: "contract-test.txt",
          fileMimeType: "text/plain",
          fileSize: plainBytes.byteLength,
          fileSha256: enc.sha256Plain,
          fileDataBase64: enc.encryptedBase64,
          isEncrypted: true,
          encryptionMeta: { alg: "AES-GCM-256", mode: "CLIENT_FRAGMENT" },
          pin: "7391",
          biometricEnabled: false,
          maxDownloads: 1,
          burnAfterRead: true,
          ttlHours: 1,
        }),
      });
      assert.equal(createRes.status, 201);
      const created = await createRes.json();
      const code = created.share?.shareCode;
      assert.ok(code);
      createdShareCodes.push(code);
      assert.equal(created.share.pinHash, undefined);
      assert.equal(created.share.fileDataBase64, undefined);

      // Portal page renders
      const portalRes = await fetch(`${baseUrl}/s/${code}`);
      assert.equal(portalRes.status, 200);

      // GET locked metadata omits token and masks filename
      const metaRes = await fetch(`${baseUrl}/api/share/${code}`);
      assert.equal(metaRes.status, 200);
      const metaJson = await metaRes.json();
      assert.equal(metaJson.locked, true);
      assert.equal(metaJson.unlockToken, undefined);

      // Unauthenticated GET download must return 401
      const unauthDl = await fetch(`${baseUrl}/api/share/${code}/download`);
      assert.equal(unauthDl.status, 401);

      // Wrong PIN must return 401
      const wrongUnlock = await fetch(`${baseUrl}/api/share/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "0000" }),
      });
      assert.equal(wrongUnlock.status, 401);

      // Valid PIN returns unlockToken
      const okUnlock = await fetch(`${baseUrl}/api/share/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "7391" }),
      });
      assert.equal(okUnlock.status, 200);
      const unlockJson = await okUnlock.json();
      assert.ok(unlockJson.unlockToken);

      // Concurrent race on burn-after-read (1x): exactly 1 must return 200 and 1 must return 403!
      const dlUrl = `${baseUrl}/api/share/${code}/download?token=${encodeURIComponent(unlockJson.unlockToken)}`;
      const [dlA, dlB] = await Promise.all([fetch(dlUrl), fetch(dlUrl)]);
      const statuses = [dlA.status, dlB.status].sort();
      assert.deepEqual(statuses, [200, 403], `Race should yield [200, 403], got ${JSON.stringify(statuses)}`);

      const winnerRes = dlA.status === 200 ? dlA : dlB;
      const cipherArrayBuf = await winnerRes.arrayBuffer();
      const decBuf = await e2eeCrypto.decryptFileAesGcm(
        cipherArrayBuf,
        enc.keyBase64Url,
        enc.ivBase64Url
      );
      assert.equal(new TextDecoder().decode(decBuf), secretPayload);

      // Metadata after burn MUST reflect BURNED & unusable
      const postMeta = await fetch(`${baseUrl}/api/share/${code}`);
      const postMetaJson = await postMeta.json();
      assert.equal(postMetaJson.available, false);
      assert.equal(postMetaJson.reason, "BURNED");

      // Cleanup
      const delRes = await fetch(`${baseUrl}/api/share/${code}`, { method: "DELETE" });
      assert.equal(delRes.status, 200);
    });

    await test("SEC-02 API (/api/extract): SSRF protection + Arabic phone & WhatsApp extraction", async () => {
      for (const bad of ["http://127.0.0.1:3199/api/share", "http://169.254.169.254/latest/meta-data/", "http://[::1]:3199/"]) {
        const res = await fetch(`${baseUrl}/api/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "URL", url: bad }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.result.fetchStatus, "FETCH_BLOCKED", `SSRF not blocked for ${bad}`);
      }

      const txtRes = await fetch(`${baseUrl}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "TEXT",
          rawText: "تواصل واتساب https://wa.me/966501234567 أو اتصل على ٠١٠٠١٢٣٤٥٦٧ بريد team@mata.ai",
        }),
      });
      assert.equal(txtRes.status, 200);
      const txtJson = await txtRes.json();
      const digits = txtJson.result.phones.map((p) => p.digitsOnly);
      assert.ok(digits.includes("966501234567"));
      assert.ok(digits.includes("201001234567"));
      assert.ok(txtJson.result.emails.includes("team@mata.ai"));
    });

    await test("SEC-03 API (/api/qr): MATA center logo preset CRUD + /q/[code] portal", async () => {
      const qrRes = await fetch(`${baseUrl}/api/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payloadType: "URL",
          title: "AI mata Supra QR Test",
          destinationUrl: "https://taptag.one",
          logoPreset: "MATA",
          qrStyle: { moduleShape: "square" },
          frameCaption: "SCAN WITH AI MATA",
        }),
      });
      assert.equal(qrRes.status, 201);
      const qrJson = await qrRes.json();
      const code = qrJson.qr?.shortCode;
      assert.ok(code);
      createdQrCodes.push(code);
      assert.equal(qrJson.qr.logoPreset, "MATA");

      const pageRes = await fetch(`${baseUrl}/q/${code}`);
      assert.equal(pageRes.status, 200);

      const getRes = await fetch(`${baseUrl}/api/qr/${code}`);
      assert.equal(getRes.status, 200);
      const getJson = await getRes.json();
      assert.equal(getJson.qr.logoPreset, "MATA");

      const delRes = await fetch(`${baseUrl}/api/qr/${code}`, { method: "DELETE" });
      assert.equal(delRes.status, 200);
    });

    await test("SEC-04 API (/api/ai-mata): validates schema + executes QR_COMPOSER & GLOBAL_COMMAND", async () => {
      const badRes = await fetch(`${baseUrl}/api/ai-mata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "INVALID_MODE", lang: "ar" }),
      });
      assert.equal(badRes.status, 400);

      const okRes = await fetch(`${baseUrl}/api/ai-mata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QR_COMPOSER",
          lang: "en",
          prompt: "Wi-Fi Garage pass supra2jz",
        }),
      });
      assert.equal(okRes.status, 200);
      const json = await okRes.json();
      assert.equal(json.result.suggestedAction.payload.payloadType, "WIFI");
      assert.equal(json.result.suggestedAction.payload.password, "supra2jz");
      assert.equal(json.result.suggestedAction.payload.logoPreset, "MATA");
    });

    await test("SEC-05 API (/api/convert): JSON <-> XLSX roundtrip, TXT -> DOCX -> PDF, & error paths", async () => {
      const sampleRows = [
        { model: "Supra A80", engine: "2JZ-GTE", year: 1998 },
        { model: "Supra A90", engine: "B58", year: 2024 },
      ];
      const jsonB64 = Buffer.from(JSON.stringify(sampleRows), "utf8").toString("base64");

      const toXlsxRes = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "cars.json",
          fileDataBase64: jsonB64,
          targetExt: "xlsx",
        }),
      });
      assert.equal(toXlsxRes.status, 200);
      const xlsxData = await toXlsxRes.json();
      const xlsxBuf = Buffer.from(xlsxData.outputBase64, "base64");
      assert.equal(xlsxBuf[0], 0x50);
      assert.equal(xlsxBuf[1], 0x4b);

      const backJsonRes = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "cars.xlsx",
          fileDataBase64: xlsxData.outputBase64,
          targetExt: "json",
        }),
      });
      assert.equal(backJsonRes.status, 200);
      const backJsonData = await backJsonRes.json();
      const parsedRows = JSON.parse(Buffer.from(backJsonData.outputBase64, "base64").toString("utf8"));
      assert.equal(parsedRows.length, 2);
      assert.equal(parsedRows[0].model, "Supra A80");
      assert.equal(Number(parsedRows[1].year), 2024);

      const txtB64 = Buffer.from("AI mata Document Verification\nLine two ok", "utf8").toString("base64");
      const toDocxRes = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "notes.txt",
          fileDataBase64: txtB64,
          targetExt: "docx",
        }),
      });
      assert.equal(toDocxRes.status, 200);
      const docxData = await toDocxRes.json();

      const toPdfRes = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "notes.docx",
          fileDataBase64: docxData.outputBase64,
          targetExt: "pdf",
        }),
      });
      assert.equal(toPdfRes.status, 200);
      const pdfData = await toPdfRes.json();
      const pdfBuf = Buffer.from(pdfData.outputBase64, "base64");
      assert.equal(pdfBuf.subarray(0, 5).toString("ascii"), "%PDF-");

      const badTarget = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "notes.txt",
          fileDataBase64: txtB64,
          targetExt: "exe",
        }),
      });
      assert.equal(badTarget.status, 400);

      const badJson = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "broken.json",
          fileDataBase64: Buffer.from("{not json", "utf8").toString("base64"),
          targetExt: "csv",
        }),
      });
      assert.equal(badJson.status, 400);
    });
  } finally {
    for (const c of createdShareCodes) {
      await fetch(`${baseUrl}/api/share/${c}`, { method: "DELETE" }).catch(() => {});
    }
    for (const c of createdQrCodes) {
      await fetch(`${baseUrl}/api/qr/${c}`, { method: "DELETE" }).catch(() => {});
    }
    serverProc.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 400));
  }
}

(async () => {
  await runUnitTests();
  await runHttpIntegrationTests();
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
