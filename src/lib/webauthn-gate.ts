import crypto from "crypto";

const WEBAUTHN_GATE_SECRET =
  process.env.SESSION_SECRET ||
  process.env.TAPTAG_SECRET_SALT ||
  "mata_webauthn_gate_enterprise_secret_2026";

const CHALLENGE_TTL_MS = 1000 * 60 * 10;
const usedChallengeSigs = new Set<string>();

export interface IssuedBiometricChallenge {
  challenge: string;
  challengeToken: string;
}

export interface BiometricProofPayload {
  challengeToken: string;
  clientDataJSON: string;
  attestationObject: string;
}

export function issueBiometricChallenge(
  scope: "SHARE" | "QR",
  code: string
): IssuedBiometricChallenge {
  const challenge = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const normalizedCode = code.trim().toUpperCase();
  const payload = `WA:${scope}:${normalizedCode}:${challenge}:${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", WEBAUTHN_GATE_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  return {
    challenge,
    challengeToken: `${challenge}.${expiresAt}.${sig}`,
  };
}

function decodeBase64UrlBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function decodeCborItem(buf: Buffer, state: { offset: number }): unknown {
  if (state.offset >= buf.length) {
    throw new Error("Unexpected end of CBOR data");
  }
  const initial = buf[state.offset++];
  const major = initial >> 5;
  const info = initial & 0x1f;

  const readUint = (ai: number): number => {
    if (ai < 24) return ai;
    if (ai === 24) {
      const v = buf.readUInt8(state.offset);
      state.offset += 1;
      return v;
    }
    if (ai === 25) {
      const v = buf.readUInt16BE(state.offset);
      state.offset += 2;
      return v;
    }
    if (ai === 26) {
      const v = buf.readUInt32BE(state.offset);
      state.offset += 4;
      return v;
    }
    if (ai === 27) {
      const v = Number(buf.readBigUInt64BE(state.offset));
      state.offset += 8;
      return v;
    }
    throw new Error(`Unsupported CBOR length info: ${ai}`);
  };

  if (major === 0) return readUint(info);
  if (major === 1) return -1 - readUint(info);
  if (major === 2) {
    const len = readUint(info);
    const slice = buf.subarray(state.offset, state.offset + len);
    state.offset += len;
    return slice;
  }
  if (major === 3) {
    const len = readUint(info);
    const str = buf.subarray(state.offset, state.offset + len).toString("utf8");
    state.offset += len;
    return str;
  }
  if (major === 4) {
    const len = readUint(info);
    const arr: unknown[] = [];
    for (let i = 0; i < len; i++) {
      arr.push(decodeCborItem(buf, state));
    }
    return arr;
  }
  if (major === 5) {
    const len = readUint(info);
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < len; i++) {
      const k = String(decodeCborItem(buf, state));
      const v = decodeCborItem(buf, state);
      obj[k] = v;
    }
    return obj;
  }
  if (major === 6) {
    readUint(info);
    return decodeCborItem(buf, state);
  }
  if (major === 7) {
    if (info === 20) return false;
    if (info === 21) return true;
    if (info === 22 || info === 23) return null;
    if (info === 25) {
      state.offset += 2;
      return null;
    }
    if (info === 26) {
      const f = buf.readFloatBE(state.offset);
      state.offset += 4;
      return f;
    }
    if (info === 27) {
      const d = buf.readDoubleBE(state.offset);
      state.offset += 8;
      return d;
    }
  }
  throw new Error(`Unsupported CBOR major type ${major}`);
}

export function verifyBiometricGateProof(params: {
  scope: "SHARE" | "QR";
  code: string;
  proof: BiometricProofPayload | null | undefined;
  requestHost?: string | null;
  requestOrigin?: string | null;
}): boolean {
  const { scope, code, proof, requestHost, requestOrigin } = params;
  if (!proof || !proof.challengeToken || !proof.clientDataJSON || !proof.attestationObject) {
    return false;
  }

  const parts = proof.challengeToken.split(".");
  if (parts.length !== 3) return false;
  const [challenge, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!challenge || !Number.isFinite(exp) || Date.now() > exp) {
    return false;
  }

  const expectedSig = crypto
    .createHmac("sha256", WEBAUTHN_GATE_SECRET)
    .update(`WA:${scope}:${code.trim().toUpperCase()}:${challenge}:${expStr}`)
    .digest("hex")
    .slice(0, 32);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  if (usedChallengeSigs.has(sig)) {
    return false;
  }

  try {
    const clientDataRaw = decodeBase64UrlBuffer(proof.clientDataJSON).toString("utf8");
    const clientData = JSON.parse(clientDataRaw) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };

    if (clientData.type !== "webauthn.create" && clientData.type !== "webauthn.get") {
      return false;
    }
    if (clientData.challenge !== challenge) {
      return false;
    }
    if (!clientData.origin || typeof clientData.origin !== "string") {
      return false;
    }

    const originUrl = new URL(clientData.origin);
    const originHost = originUrl.hostname.toLowerCase();
    const candidateHosts = new Set<string>(["localhost", "127.0.0.1"]);

    if (requestHost) {
      candidateHosts.add(requestHost.split(":")[0].toLowerCase());
    }
    if (requestOrigin) {
      try {
        candidateHosts.add(new URL(requestOrigin).hostname.toLowerCase());
      } catch {
        // ignore invalid origin header
      }
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        candidateHosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase());
      } catch {
        // ignore invalid env URL
      }
    }

    if (!candidateHosts.has(originHost)) {
      return false;
    }

    const attBuf = decodeBase64UrlBuffer(proof.attestationObject);
    const decodedAtt = decodeCborItem(attBuf, { offset: 0 }) as Record<string, unknown>;
    const authData = decodedAtt?.authData;
    if (!Buffer.isBuffer(authData) || authData.length < 37) {
      return false;
    }

    const rpIdHash = authData.subarray(0, 32);
    const expectedRpHosts = new Set<string>([originHost, ...candidateHosts]);
    const rpMatches = Array.from(expectedRpHosts).some((h) => {
      const digest = crypto.createHash("sha256").update(h).digest();
      return crypto.timingSafeEqual(rpIdHash, digest);
    });
    if (!rpMatches) {
      return false;
    }

    const flags = authData[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;
    if (!userPresent || !userVerified) {
      return false;
    }

    if (usedChallengeSigs.size > 2000) {
      usedChallengeSigs.clear();
    }
    usedChallengeSigs.add(sig);
    return true;
  } catch {
    return false;
  }
}

export function formatContentDisposition(
  disposition: "inline" | "attachment",
  fileName: string
): string {
  const cleaned = fileName.replace(/[\r\n"\\/]+/g, "_").trim() || "download.bin";
  const asciiFallback =
    cleaned
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/^_+|_+$/g, "") || "file";
  const extMatch = cleaned.match(/(\.[a-zA-Z0-9]{1,12})$/);
  const asciiWithExt =
    extMatch && !asciiFallback.endsWith(extMatch[1])
      ? `${asciiFallback}${extMatch[1]}`
      : asciiFallback;
  return `${disposition}; filename="${asciiWithExt}"; filename*=UTF-8''${encodeURIComponent(
    cleaned
  )}`;
}
