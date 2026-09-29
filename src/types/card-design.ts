export type CardMaterial =
  | "ACRYLIC"
  | "MATTE_OBSIDIAN"
  | "SMOKED_ACRYLIC"
  | "CARBON_FIBER"
  | "BRUSHED_TITANIUM"
  | "PEARL_WHITE";

export type AcrylicFinish = "SATIN_MATTE" | "GLOSSY_CRYSTAL" | "SMOKED_FROST";

/**
 * Official Printzone 2026 Production Dimensions:
 * 1. Card: 5.5 x 8.5 cm (Car Windshield Card)
 * 2. Coaster Mini: 9 x 9 cm
 * 3. Coaster Large: 12 x 12 cm
 * 4. Stand Desktop: 10 x 15 cm
 * 5. Stand Large: 15 x 20 cm
 */
export type CardDimension =
  | "CARD_55X85"
  | "COASTER_90X90"
  | "COASTER_120X120"
  | "STAND_100X150"
  | "STAND_150X200"
  | "CR80_STANDARD"
  | "ACRYLIC_TAG_70X50"
  | "MINI_KEY_54X28";

export type CardCodeType = "QR_CODE" | "BARCODE" | "DUAL" | "NONE";

export type CardLogoPosition = "TOP_LEFT" | "TOP_RIGHT" | "CENTER" | "BOTTOM_LEFT";

export type CardLogoColor = "WHITE" | "SILVER" | "GOLD" | "STEALTH";

export type CardFontFamily =
  | "NEO_GROTESK"
  | "INTER"
  | "GEIST_MONO"
  | "SPACE_GROTESK"
  | "SERIF_LUXURY"
  | "ARABIC_KUFIC";

export type CardPlateStyle = "SAUDI" | "EGYPT" | "STANDARD" | "MINIMAL";

export type CardLayoutPreset = "TAP_MINIMAL" | "ALL_IN_ONE" | "QR_HERO" | "CLASSIC_EXECUTIVE";

export type CardQrPlacement = "BACK_ONLY" | "FRONT_CORNER" | "FRONT_CENTER" | "BOTH";

export type CardQrStyle =
  | "CLASSIC_SQUARE"
  | "ROUNDED_DOTS"
  | "CHAMFER_OCTA"
  | "BRAND_CENTER";

export interface CardDesignConfig {
  id?: string;
  tagUid: string;
  material: CardMaterial;
  cardColor?: string; // Hex color (e.g. #0E0F12, #F8FAFC, #0F172A, #064E3B, or custom picker)
  acrylicFinish?: AcrylicFinish;
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
  // Professional Amazon / Printzone specifications
  layoutPreset?: CardLayoutPreset;
  logoText?: string;
  qrPlacement?: CardQrPlacement;
  qrStyle?: CardQrStyle;
  nfcPosition?: "BOTTOM_LEFT" | "TOP_RIGHT" | "BOTTOM_RIGHT";
  brandType?: "OFFICIAL_TAPTAG" | "CUSTOM_BRAND";
  customBrandFee?: number;
  updatedAt?: string;
}

export const DEFAULT_CARD_DESIGN: CardDesignConfig = {
  tagUid: "MW-88219-X",
  material: "ACRYLIC",
  cardColor: "#0E0F12",
  acrylicFinish: "GLOSSY_CRYSTAL",
  dimensionStandard: "CARD_55X85",
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
  logoText: "taptag.one",
  qrPlacement: "BACK_ONLY",
  qrStyle: "ROUNDED_DOTS",
  nfcPosition: "BOTTOM_LEFT",
  brandType: "OFFICIAL_TAPTAG",
  customBrandFee: 0,
};
