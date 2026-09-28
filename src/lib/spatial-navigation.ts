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
 * 1D Adaptive Exponential Moving Average for scalar smoothing (distance in meters)
 * Tracks user walking speed with zero lag while stabilizing stationary GPS jitter.
 */
export class ExponentialFilter {
  private alpha: number;
  private current: number | null = null;

  constructor(defaultAlpha = 0.5) {
    this.alpha = defaultAlpha;
  }

  public update(value: number): number {
    if (this.current === null) {
      this.current = value;
      return value;
    }
    const delta = Math.abs(value - this.current);
    // Dynamic tracking: If delta > 0.8m (walking step), track rapidly (alpha=0.80)
    // If delta > 0.3m (intermediate movement), track with alpha=0.65
    // If delta <= 0.3m (sub-meter noise), smooth gently with alpha=0.45
    const effectiveAlpha = delta > 0.8 ? 0.80 : delta > 0.3 ? 0.65 : 0.45;
    this.current = effectiveAlpha * value + (1 - effectiveAlpha) * this.current;
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
 * 3D Tilt-Compensated Compass Heading for Mobile Web (Android & iOS)
 * Calculates the horizontal compass azimuth [0, 360) of the top of the smartphone.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function computeTiltCompensatedHeading(
  alpha: number,
  beta: number | null,
  gamma: number | null
): number {
  if (beta === null || gamma === null) {
    let flat = (360 - alpha) % 360;
    if (flat < 0) flat += 360;
    return flat;
  }

  // W3C DeviceOrientation standard:
  // When holding phone in hand tilted (pitch beta, roll gamma):
  // Adjust for hand roll tilt compensation:
  let heading = (360 - alpha - (beta * gamma) / 90) % 360;
  if (heading < 0) heading += 360;

  return Math.round(heading);
}

/**
 * Weighted GNSS Centroid Averaging (Timed 5-7s Calibration Engine)
 * Takes a burst of GPS samples and weights each sample by 1 / (accuracy^2)
 */
export function computeWeightedGNSSCentroid(
  samples: Array<{ lat: number; lng: number; accuracy: number; heading: number }>
): {
  avgLat: number;
  avgLng: number;
  avgAccuracy: number;
  avgHeading: number;
  sampleCount: number;
} {
  if (samples.length === 0) {
    throw new Error("No GNSS samples collected");
  }

  // Filter out multi-path outlier readings (accuracy > 15m)
  const validSamples = samples.filter((s) => s.accuracy <= 15);
  const pool = validSamples.length >= 3 ? validSamples : samples;

  let sumWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;
  let weightedAcc = 0;

  let sinSum = 0;
  let cosSum = 0;

  for (const s of pool) {
    const safeAcc = Math.max(0.5, s.accuracy);
    const weight = 1 / (safeAcc * safeAcc);

    weightedLat += s.lat * weight;
    weightedLng += s.lng * weight;
    weightedAcc += s.accuracy * weight;
    sumWeight += weight;

    const headRad = toRadians(s.heading);
    sinSum += Math.sin(headRad) * weight;
    cosSum += Math.cos(headRad) * weight;
  }

  const avgLat = weightedLat / sumWeight;
  const avgLng = weightedLng / sumWeight;
  const avgAccuracy = weightedAcc / sumWeight;
  const avgHeading = (toDegrees(Math.atan2(sinSum, cosSum)) + 360) % 360;

  return {
    avgLat,
    avgLng,
    avgAccuracy,
    avgHeading,
    sampleCount: pool.length,
  };
}

/**
 * Web Audio Synthesizer: Proximity Sonar & Authentic Apple Pay Arrival Chime
 */
export function playNavigationSound(
  type: "tick" | "align" | "lockout" | "calibrate_complete" | "sonar_ping" | "apple_pay_arrival",
  frequencyMod = 1.0
) {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === "sonar_ping") {
      // Dynamic Proximity Sonar Bell (Higher frequency as distance decreases)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const targetFreq = 880 * Math.max(0.85, Math.min(2.2, frequencyMod));
      osc.type = "sine";
      osc.frequency.setValueAtTime(targetFreq, now);
      osc.frequency.exponentialRampToValueAtTime(targetFreq * 0.96, now + 0.09);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "apple_pay_arrival" || type === "lockout") {
      // Iconic Apple Pay Harmonic Arrival Chime (Two-Tone Sine Bell)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.20, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.start(now);
      osc1.stop(now + 0.35);

      // Higher Affirmative Chord Note at 1318.51 Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.65);

      // Haptic bump
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([60, 40, 100]);
      }
    } else if (type === "tick") {
      // Subtle precision tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "align") {
      // Harmonic resonance when pointing directly at the car
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "calibrate_complete") {
      // Upward affirmative chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
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

/**
 * Deterministic Arabic date and time formatting (clean 12h format with ص/م)
 */
export function formatCalibrationDateTime(dateOrIso: string | Date): {
  timeFormatted: string;
  dateFormatted: string;
  fullFormatted: string;
} {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) {
    return {
      timeFormatted: "--:--",
      dateFormatted: "غير معروف",
      fullFormatted: "غير معروف",
    };
  }

  // 12-Hour format
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ampm = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minStr = minutes < 10 ? `0${minutes}` : String(minutes);
  const secStr = seconds < 10 ? `0${seconds}` : String(seconds);
  const timeFormatted = `${hours}:${minStr}:${secStr} ${ampm}`;

  // Date representation
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  let dateFormatted = "";
  if (isToday) {
    dateFormatted = "اليوم";
  } else if (isYesterday) {
    dateFormatted = "أمس";
  } else {
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    dateFormatted = `${d.getDate()} ${months[d.getMonth()]}`;
  }

  return {
    timeFormatted,
    dateFormatted,
    fullFormatted: `${dateFormatted} في ${timeFormatted}`,
  };
}

/**
 * Live dynamic relative time in Arabic (e.g. "الآن (منذ لحظات)", "منذ دقيقة", "منذ 15 دقيقة")
 */
export function getRelativeTimeArabic(dateOrIso: string | Date, now: Date = new Date()): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "غير متاح";

  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 40) {
    return "الآن (منذ لحظات)";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) {
    return "منذ دقيقة واحدة";
  }
  if (diffMin === 2) {
    return "منذ دقيقتين";
  }
  if (diffMin >= 3 && diffMin <= 10) {
    return `منذ ${diffMin} دقائق`;
  }
  if (diffMin < 60) {
    return `منذ ${diffMin} دقيقة`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) {
    return "منذ ساعة واحدة";
  }
  if (diffHours === 2) {
    return "منذ ساعتين";
  }
  if (diffHours >= 3 && diffHours <= 10) {
    return `منذ ${diffHours} ساعات`;
  }
  if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "منذ يوم واحد";
  }
  if (diffDays === 2) {
    return "منذ يومين";
  }
  return `منذ ${diffDays} أيام`;
}




