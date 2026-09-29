export type CardMaterial =
  | "MATTE_OBSIDIAN"
  | "SMOKED_ACRYLIC"
  | "CARBON_FIBER"
  | "BRUSHED_TITANIUM"
  | "PEARL_WHITE";

export type CardDimension =
  | "CR80_STANDARD"
  | "ACRYLIC_TAG_70X50"
  | "MINI_KEY_54X28";

export type CardCodeType = "QR_CODE" | "BARCODE" | "DUAL" | "NONE";

export type CardLogoPosition = "TOP_LEFT" | "TOP_RIGHT" | "CENTER" | "BOTTOM_LEFT";

export type CardLogoColor = "WHITE" | "SILVER" | "GOLD" | "STEALTH";

export type CardFontFamily = "IBM_PLEX" | "CAIRO" | "INTER";

export type CardPlateStyle = "SAUDI" | "EGYPT" | "STANDARD" | "MINIMAL";

export type CardLayoutPreset = "TAP_MINIMAL" | "ALL_IN_ONE" | "CLASSIC_EXECUTIVE";

export type CardQrPlacement = "BACK_ONLY" | "FRONT_CORNER" | "FRONT_CENTER" | "BOTH";

export interface CardDesignConfig {
  id?: string;
  tagUid: string;
  material: CardMaterial;
  dimensionStandard: CardDimension;
  codeType: CardCodeType;
  logoPosition: CardLogoPosition;
  logoColor: CardLogoColor;
  fontFamily: CardFontFamily;
  plateStyle: CardPlateStyle;
  plateNumber: string;
  showNfcIcon: boolean;
  showEmergency: boolean;
  customText: string;
  // Amazon Tap card professional attributes
  layoutPreset?: CardLayoutPreset;
  logoText?: string;
  qrPlacement?: CardQrPlacement;
  nfcPosition?: "BOTTOM_LEFT" | "TOP_RIGHT" | "BOTTOM_RIGHT";
  updatedAt?: string;
}

export const DEFAULT_CARD_DESIGN: CardDesignConfig = {
  tagUid: "MW-88219-X",
  material: "MATTE_OBSIDIAN",
  dimensionStandard: "CR80_STANDARD", // Standard CR80 85.6 x 54 mm (like the Amazon card)
  codeType: "QR_CODE",
  logoPosition: "CENTER",
  logoColor: "WHITE",
  fontFamily: "INTER",
  plateStyle: "STANDARD",
  plateNumber: "أ ب ج 1234",
  showNfcIcon: true,
  showEmergency: false,
  customText: "TAPTAG SMART ACCESS",
  layoutPreset: "TAP_MINIMAL",
  logoText: "taptag.",
  qrPlacement: "BACK_ONLY",
  nfcPosition: "BOTTOM_LEFT",
};
