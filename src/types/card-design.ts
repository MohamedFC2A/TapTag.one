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

export type CardCodeType = "QR_CODE" | "BARCODE" | "DUAL";

export type CardLogoPosition = "TOP_LEFT" | "TOP_RIGHT" | "CENTER" | "BOTTOM_LEFT";

export type CardLogoColor = "WHITE" | "SILVER" | "GOLD" | "STEALTH";

export type CardFontFamily = "IBM_PLEX" | "CAIRO" | "INTER";

export type CardPlateStyle = "SAUDI" | "EGYPT" | "STANDARD" | "MINIMAL";

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
  updatedAt?: string;
}

export const DEFAULT_CARD_DESIGN: CardDesignConfig = {
  tagUid: "MW-88219-X",
  material: "MATTE_OBSIDIAN",
  dimensionStandard: "ACRYLIC_TAG_70X50",
  codeType: "QR_CODE",
  logoPosition: "TOP_LEFT",
  logoColor: "SILVER",
  fontFamily: "IBM_PLEX",
  plateStyle: "STANDARD",
  plateNumber: "أ ب ج 1234",
  showNfcIcon: true,
  showEmergency: false,
  customText: "TAPTAG SMART ACCESS",
};
