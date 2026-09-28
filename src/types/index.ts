export type Language = "ar" | "en";

export type TagStatus = "ACTIVE" | "AWAY" | "DND" | "SUSPENDED";

export type IncidentEventType =
  | "SCAN"
  | "MOVEMENT_REQUEST"
  | "EMERGENCY_REPORT"
  | "CALL_ATTEMPT"
  | "DIRECT_NOTE";

export type IncidentStatus = "RECEIVED" | "DELIVERED" | "RESOLVED" | "IGNORED";

export type AlertChannel = "WHATSAPP" | "TELEGRAM" | "PUSH" | "SMS";

export interface SafePublicTag {
  tagUid: string;
  status: TagStatus;
  isActivated: boolean;
  ownerDeviceId?: string | null;
  ownerDeviceName?: string | null;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  autoResponseText?: string | null;
  autoResponseEnabled: boolean;
  emergencyContactPhone?: string | null;
  notifyWhatsApp?: boolean;
  notifyTelegram?: boolean;
  notifyPush?: boolean;
  notifySms?: boolean;
}

export interface MovementAlertPayload {
  tagUid: string;
  reason: string;
  customNote?: string;
}

export interface EmergencyReportPayload {
  tagUid: string;
  category: "BUMP" | "TOW" | "WINDOW_OPEN" | "ALARM" | "OTHER";
  urgency: "HIGH" | "CRITICAL";
  details?: string;
}

export interface DirectNotePayload {
  tagUid: string;
  note: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  incidentId?: string;
  error?: string;
}
