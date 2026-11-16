"use client";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(b64url: string): Uint8Array {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return base64ToBytes(b64);
}

export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptFileAesGcm(fileBuffer: ArrayBuffer): Promise<{
  encryptedBase64: string;
  keyBase64Url: string;
  ivBase64Url: string;
  sha256Plain: string;
}> {
  const sha256Plain = await computeSha256Hex(fileBuffer);
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return {
    encryptedBase64: bytesToBase64(new Uint8Array(cipherBuffer)),
    keyBase64Url: toBase64Url(rawKey),
    ivBase64Url: toBase64Url(iv),
    sha256Plain,
  };
}

export async function decryptFileAesGcm(
  cipherBuffer: ArrayBuffer,
  keyBase64Url: string,
  ivBase64Url: string
): Promise<ArrayBuffer> {
  const rawKey = fromBase64Url(keyBase64Url);
  const iv = fromBase64Url(ivBase64Url);
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
    },
    key,
    cipherBuffer
  );
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(buffer));
}
