import type { SmartQrPayloadType } from "@/lib/smart-qr";

export interface QrPrefillEventDetail {
  payloadType?: SmartQrPayloadType;
  title?: string;
  destinationUrl?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  ssid?: string;
  password?: string;
  encryption?: "WPA" | "WEP" | "nopass";
  text?: string;
  logoPreset?: "NONE" | "MATA" | "TAPTAG" | "CUSTOM";
  pin?: string;
  frameCaption?: string;
}

export interface FileTransferEventDetail {
  file: File;
}

export interface ExtractPrefillEventDetail {
  url?: string;
  text?: string;
}

export type ActiveSectionFilter = "ALL" | "SHARE" | "EXTRACT" | "QR" | "AI" | "CONVERT";

export function dispatchFocusSection(section: ActiveSectionFilter, anchorId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ section: ActiveSectionFilter }>("mata:focus-section", {
      detail: { section },
    })
  );
  if (anchorId) {
    setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
}

export function dispatchToQrStudio(detail: QrPrefillEventDetail) {
  if (typeof window === "undefined") return;
  dispatchFocusSection("QR", "qr-workspace");
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent<QrPrefillEventDetail>("mata:prefill-qr", { detail }));
  }, 80);
}

export function dispatchToSecureShare(file: File) {
  if (typeof window === "undefined") return;
  dispatchFocusSection("SHARE", "secure-share");
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<FileTransferEventDetail>("mata:prefill-share", { detail: { file } })
    );
  }, 80);
}

export function dispatchToExtractor(input: string | ExtractPrefillEventDetail) {
  if (typeof window === "undefined") return;
  const detail: ExtractPrefillEventDetail =
    typeof input === "string" ? { url: input } : input;
  dispatchFocusSection("EXTRACT", "link-extractor");
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<ExtractPrefillEventDetail>("mata:prefill-extract", { detail })
    );
  }, 80);
}

export function dispatchToConverter(file: File) {
  if (typeof window === "undefined") return;
  dispatchFocusSection("CONVERT", "file-converter");
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<FileTransferEventDetail>("mata:prefill-convert", { detail: { file } })
    );
  }, 80);
}
