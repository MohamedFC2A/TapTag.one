/**
 * Zero-Hardware Spatial Precision Navigation & Sensor Fusion Engine
 * TapTag Enterprise Shield - Autonomous Vehicle Finder
 */

export interface SpatialCalibration {
  tagUid: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel?: string;
  calibratedAt: string;
  // Raw user sensor stance
  rawLat: number;
  rawLng: number;
  userHeading: number; // In degrees (0 = North, 90 = East, etc.)
  accuracy: number; // In meters
  altitude?: number | null;
  // Computed true vehicle centroid (after applying lateral stance offset)
  centroidLat: number;
  centroidLng: number;
  offsetDistanceMeters: number;
}

export interface NavigationVector {
  distanceMeters: number;
  bearingToVehicle: number; // Azimuth from user to vehicle in degrees (0-360)
  relativeBearing: number; // Relative angle between phone heading and vehicle (-180 to +180)
  deviceHeading: number; // Current device compass heading (0-360)
  confidencePercent: number; // Dynamic confidence score (60 - 98%)
  isDirectlyAligned: boolean; // Within ±10 degrees
  isWithinLockoutRange: boolean; // Within <= 2.5 meters (anti-disorientation threshold)
  isBeyondActiveRange: boolean; // > 5 meters (prompt: "لازم يبعد 5 متر علي الاقل")
  accuracyRadius: number;
}

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates great-circle distance between two coordinates using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates initial forward azimuth (bearing) from coordinate 1 to coordinate 2
 * Result is in degrees normalized between [0, 360)
 */
export function calculateForwardAzimuth(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * Normalizes an angle into [-180, 180] degrees
 */
export function normalizeAngleDiff(targetDeg: number, sourceDeg: number): number {
  let diff = (targetDeg - sourceDeg) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Shifts the user stance position (standing at driver's door / left side of vehicle)
 * to the vehicle's true geometric centroid.
 *
 * Stance Convention:
 * - User stands at left side of vehicle (driver door in standard LHD, or left side).
 * - Device top is aligned with the car's forward axis (`userHeading`).
 * - Car centroid is ~1.2 meters to the RIGHT of the user (`userHeading + 90°`).
 */
export function computeVehicleCentroid(
  userLat: number,
  userLng: number,
  userHeading: number,
  lateralOffsetMeters = 1.2
): { centroidLat: number; centroidLng: number } {
  // 1 degree of latitude is approx 111,139 meters
  const metersPerLat = 111139;
  const metersPerLng = 111139 * Math.cos(toRadians(userLat));

  const offsetAngleRad = toRadians((userHeading + 90) % 360);
  const deltaNorth = lateralOffsetMeters * Math.cos(offsetAngleRad);
  const deltaEast = lateralOffsetMeters * Math.sin(offsetAngleRad);

  const centroidLat = userLat + deltaNorth / metersPerLat;
  const centroidLng = userLng + deltaEast / metersPerLng;

  return { centroidLat, centroidLng };
}

/**
 * 1D Kalman Filter for smooth sensor fusion (e.g. smoothing compass angles without flutter)
 */
export class KalmanAngleFilter {
  private q: number; // Process noise covariance
  private r: number; // Measurement noise covariance
  private x: number; // State estimate
  private p: number; // Estimation error covariance
  private initialized = false;

  constructor(processNoise = 0.05, measurementNoise = 2.0) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.x = 0;
    this.p = 1.0;
  }

  public update(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return this.x;
    }

    // Prediction update
    this.p = this.p + this.q;

    // Handle angular wrap-around (e.g., 359° -> 1°)
    let diff = measurement - this.x;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    // Measurement update
    const k = this.p / (this.p + this.r);
    this.x = (this.x + k * diff + 360) % 360;
    this.p = (1 - k) * this.p;

    return this.x;
  }

  public reset(initialValue?: number) {
    if (initialValue !== undefined) {
      this.x = initialValue;
      this.initialized = true;
    } else {
      this.initialized = false;
    }
    this.p = 1.0;
  }
}

/**
 * 1D Exponential Moving Average (EMA) for scalar smoothing (e.g., distance in meters)
 */
export class ExponentialFilter {
  private alpha: number;
  private current: number | null = null;

  constructor(alpha = 0.25) {
    this.alpha = alpha;
  }

  public update(value: number): number {
    if (this.current === null) {
      this.current = value;
      return value;
    }
    this.current = this.alpha * value + (1 - this.alpha) * this.current;
    return this.current;
  }

  public reset(initial?: number) {
    this.current = initial ?? null;
  }
}

/**
 * Compute the complete NavigationVector from the current user position and orientation
 * to the calibrated vehicle centroid.
 */
export function computeNavigationVector(
  currentLat: number,
  currentLng: number,
  currentDeviceHeading: number,
  calibration: SpatialCalibration,
  accuracyMeters = 5.0
): NavigationVector {
  const distance = calculateHaversineDistance(
    currentLat,
    currentLng,
    calibration.centroidLat,
    calibration.centroidLng
  );

  const bearingToVehicle = calculateForwardAzimuth(
    currentLat,
    currentLng,
    calibration.centroidLat,
    calibration.centroidLng
  );

  const relativeBearing = normalizeAngleDiff(bearingToVehicle, currentDeviceHeading);
  const isDirectlyAligned = Math.abs(relativeBearing) <= 12;

  // Stop arrow and switch to Precision Dot when distance <= 5.0 meters
  const isWithinLockoutRange = distance <= 5.0;

  // Active arrow tracking range (> 5.0 meters)
  const isBeyondActiveRange = distance > 5.0;

  // Dynamic confidence score calculation:
  // Derived from GPS accuracy and distance ratio
  let confidence = Math.max(
    65,
    Math.min(97, Math.round(100 - accuracyMeters * 2.2 + (distance > 10 ? 5 : 0)))
  );

  return {
    distanceMeters: distance,
    bearingToVehicle,
    relativeBearing,
    deviceHeading: currentDeviceHeading,
    confidencePercent: confidence,
    isDirectlyAligned,
    isWithinLockoutRange,
    isBeyondActiveRange,
    accuracyRadius: accuracyMeters,
  };
}

/**
 * Web Audio Synthesizer for native Apple-like tactile feedback without external media
 */
export function playNavigationSound(
  type: "tick" | "align" | "lockout" | "calibrate_complete"
) {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "tick") {
      // Subtle precision tick
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "align") {
      // Harmonic resonance when pointing directly at the car
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "calibrate_complete") {
      // Upward affirmative chord
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "lockout") {
      // Apple-like celebratory arrival chime (two-tone)
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(1046.5, now + 0.12); // C6
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // AudioContext might be blocked until user interaction
  }
}

/**
 * Translates relative bearing into natural language directions exactly matching Apple Find My
 */
export function getNaturalDirectionText(relativeBearing: number, isAr = true): string {
  const absBearing = Math.abs(relativeBearing);
  if (absBearing <= 20) {
    return isAr ? "أمامك مباشرة" : "ahead";
  } else if (relativeBearing > 20 && relativeBearing <= 135) {
    return isAr ? "إلى يمينك" : "to your right";
  } else if (relativeBearing < -20 && relativeBearing >= -135) {
    return isAr ? "إلى يسارك" : "to your left";
  } else {
    return isAr ? "خلفك" : "behind";
  }
}

/**
 * Calculates dynamic SVG circular arc trajectory exactly as seen in Apple Precision Finding
 * Radius = 120, Center = (150, 150)
 */
export function calculateApplePrecisionArc(relativeBearing: number, radius = 125, cx = 150, cy = 150): {
  pathD: string;
  startDot: { x: number; y: number };
  endDot: { x: number; y: number };
  isVisible: boolean;
} {
  // If target is directly ahead (< 15 deg), arc merges/hides
  if (Math.abs(relativeBearing) <= 12) {
    return {
      pathD: "",
      startDot: { x: cx, y: cy - radius },
      endDot: { x: cx, y: cy - radius },
      isVisible: false,
    };
  }

  // Apple Find My arc starts near top (0 deg / 12 o'clock) or midway and sweeps to the target angle
  // 0 degrees is (cx, cy - radius)
  // Let start angle be 0 deg (or slight offset towards bearing)
  const startAngleDeg = relativeBearing > 0 ? 0 : 0;
  const endAngleDeg = Math.max(-175, Math.min(175, relativeBearing));

  // Convert to radians (0 deg = top / 12 o'clock)
  const toCoord = (deg: number) => {
    const rad = toRadians(deg - 90);
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const pStart = toCoord(startAngleDeg);
  const pEnd = toCoord(endAngleDeg);

  const sweepFlag = relativeBearing > 0 ? 1 : 0;
  const largeArcFlag = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;

  const pathD = `M ${pStart.x} ${pStart.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${pEnd.x} ${pEnd.y}`;

  return {
    pathD,
    startDot: pStart,
    endDot: pEnd,
    isVisible: true,
  };
}

/**
 * Storage helpers for Spatial Calibration - Persistent & Locked
 */
const CALIBRATION_STORAGE_KEY_PREFIX = "taptag_spatial_locked_v2_";
const LEGACY_STORAGE_PREFIX = "taptag_spatial_cal_";

export function saveCalibrationLocally(calibration: SpatialCalibration): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(calibration);
    localStorage.setItem(`${CALIBRATION_STORAGE_KEY_PREFIX}${calibration.tagUid}`, payload);
    localStorage.setItem(`${LEGACY_STORAGE_PREFIX}${calibration.tagUid}`, payload);
  } catch (err) {
    console.error("Failed to save spatial calibration locally:", err);
  }
}

export function loadCalibrationLocally(tagUid: string): SpatialCalibration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(`${CALIBRATION_STORAGE_KEY_PREFIX}${tagUid}`) ||
      localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${tagUid}`);
    if (!raw) return null;
    return JSON.parse(raw) as SpatialCalibration;
  } catch (err) {
    console.error("Failed to load spatial calibration locally:", err);
    return null;
  }
}

export function restartSpatialCalibrationLocally(tagUid: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${CALIBRATION_STORAGE_KEY_PREFIX}${tagUid}`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${tagUid}`);
  } catch (err) {
    console.error("Failed to reset spatial calibration locally:", err);
  }
}

export function clearCalibrationLocally(tagUid: string): void {
  restartSpatialCalibrationLocally(tagUid);
}



