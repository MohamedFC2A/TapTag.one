import QRCode from "qrcode";

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
}

/**
 * Generate ISO/IEC 18004 compliant QR Code SVG string with Error Correction Level H
 */
export async function generateQRCodeSVG(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToStringOptions = {
    type: "svg",
    errorCorrectionLevel: "H", // 30% error correction (crucial for outdoor / windshield durability)
    margin: options.margin ?? 1,
    width: options.width ?? 300,
    color: {
      dark: options.color?.dark ?? "#000000",
      light: options.color?.light ?? "#FFFFFF",
    },
  };

  return await QRCode.toString(text, defaultOptions);
}

/**
 * Generate high-res DataURL for preview or canvas embedding
 */
export async function generateQRCodeDataURL(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: "H",
    margin: options.margin ?? 1,
    width: options.width ?? 600,
    color: {
      dark: options.color?.dark ?? "#000000",
      light: options.color?.light ?? "#FFFFFF",
    },
  };

  return await QRCode.toDataURL(text, defaultOptions);
}
