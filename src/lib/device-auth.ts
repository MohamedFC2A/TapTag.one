"use client";

const DEVICE_STORAGE_KEY = "taptag_device_fingerprint_v1";

/**
 * Returns the currently registered persistent device/passkey ID.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server_id";

  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    if (window.crypto && window.crypto.randomUUID) {
      deviceId = `dev_${window.crypto.randomUUID().replace(/-/g, "")}`;
    } else {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }

  // Set cookie for Next.js server components
  document.cookie = `taptag_device_id=${deviceId}; path=/; max-age=31536000; SameSite=Strict`;
  return deviceId;
}

/**
 * Save verified passkey device ID
 */
export function saveVerifiedPasskeyId(passkeyId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEVICE_STORAGE_KEY, passkeyId);
  document.cookie = `taptag_device_id=${passkeyId}; path=/; max-age=31536000; SameSite=Strict`;
}

/**
 * Detect friendly device name (e.g., iPhone, Android, Mac, Windows)
 */
export function getClientDeviceName(): string {
  if (typeof window === "undefined") return "Terminal Device";

  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "Apple iPhone (iOS TouchID/FaceID)";
  if (/iPad/i.test(ua)) return "Apple iPad";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+);\s([^;]+)/);
    return match ? `Android Device (${match[2]?.trim()})` : "Android Mobile Device";
  }
  if (/Macintosh/i.test(ua)) return "Apple Mac (Touch ID)";
  if (/Windows/i.test(ua)) return "Windows PC (Windows Hello / Passkey)";
  return "Smart Verified Device";
}

/**
 * Perform MANDATORY Touch ID / Face ID / Fingerprint Biometric Challenge via WebAuthn.
 * Rejects with a clear error if the user cancels or does not verify.
 */
export async function performBiometricAuth(tagUid: string): Promise<{
  success: boolean;
  biometricUsed: boolean;
  deviceId: string;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { success: false, biometricUsed: false, deviceId: "", error: "غير مدعوم على السيرفر." };
  }

  // 1. Check WebAuthn / Passkey support
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return {
      success: false,
      biometricUsed: false,
      deviceId: "",
      error: "هذا المتصفح لا يدعم مصادقة البصمة المشفرة (WebAuthn / Passkeys). يرجى التحديث لمتصفح حديث مثل Chrome أو Safari أو Edge.",
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(`user_${tagUid}_${Date.now()}`.substring(0, 16));

    // Native Biometric / Passkey Registration
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "منظومة TapTag (TapTag.one Enterprise Shield)",
          id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: `owner_${tagUid.toLowerCase()}`,
          displayName: `مالك بطاقة TapTag (${tagUid})`,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          userVerification: "required", // MANDATORY biometric or PIN/passkey verification
          residentKey: "preferred",
        },
        timeout: 60000, // 60 seconds for user to tap fingerprint sensor
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.id) {
      return {
        success: false,
        biometricUsed: false,
        deviceId: "",
        error: "لم يتم استلام توقيع البصمة من الجهاز. يرجى المحاولة ثانية.",
      };
    }

    // Success: Form a secure verified passkey identifier
    const passkeyId = `passkey_${credential.id}`;
    saveVerifiedPasskeyId(passkeyId);

    return {
      success: true,
      biometricUsed: true,
      deviceId: passkeyId,
    };
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("Biometric authentication error:", errorObj);

    if (errorObj?.name === "NotAllowedError") {
      return {
        success: false,
        biometricUsed: false,
        deviceId: "",
        error: "تم إلغاء طلب البصمة من قِبل المستخدم. يلزم وضع البصمة لتأكيد ملكية البطاقة.",
      };
    }

    if (errorObj?.name === "InvalidStateError") {
      return {
        success: false,
        biometricUsed: false,
        deviceId: "",
        error: "هذا المفتاح البيومتري مسجل مسبقاً على هذا الجهاز.",
      };
    }

    return {
      success: false,
      biometricUsed: false,
      deviceId: "",
      error: `تعذرت المصادقة بالبصمة (${errorObj?.message || "فشل التحقق من المستشعر"}). تأكد من إعداد بصمة الإصبع أو Windows Hello في جهازك.`,
    };
  }
}
