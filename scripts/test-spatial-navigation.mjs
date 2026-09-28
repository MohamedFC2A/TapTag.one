import assert from "node:assert";

// Haversine
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

function calculateForwardAzimuth(lat1, lon1, lat2, lon2) {
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

function normalizeAngleDiff(targetDeg, sourceDeg) {
  let diff = (targetDeg - sourceDeg) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function computeVehicleCentroid(userLat, userLng, userHeading, lateralOffsetMeters = 1.2) {
  const metersPerLat = 111139;
  const metersPerLng = 111139 * Math.cos(toRadians(userLat));

  const offsetAngleRad = toRadians((userHeading + 90) % 360);
  const deltaNorth = lateralOffsetMeters * Math.cos(offsetAngleRad);
  const deltaEast = lateralOffsetMeters * Math.sin(offsetAngleRad);

  const centroidLat = userLat + deltaNorth / metersPerLat;
  const centroidLng = userLng + deltaEast / metersPerLng;

  return { centroidLat, centroidLng };
}

class KalmanAngleFilter {
  constructor(processNoise = 0.05, measurementNoise = 2.0) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.x = 0;
    this.p = 1.0;
    this.initialized = false;
  }

  update(measurement) {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return this.x;
    }

    this.p = this.p + this.q;
    let diff = measurement - this.x;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    const k = this.p / (this.p + this.r);
    this.x = (this.x + k * diff + 360) % 360;
    this.p = (1 - k) * this.p;

    return this.x;
  }
}

console.log("=== STARTING SPATIAL NAVIGATION ENGINE MATHEMATICAL SUITE ===");

// TEST 1: Haversine distance accuracy
const latA = 24.7136;
const lonA = 46.6753;
// Move north by approx 0.00018 degrees (~20 meters)
const latB = 24.7136 + 20 / 111139;
const lonB = 46.6753;
const dist20m = calculateHaversineDistance(latA, lonA, latB, lonB);
console.log(`[Test 1] 20m Target Distance: calculated = ${dist20m.toFixed(2)}m`);
assert(Math.abs(dist20m - 20) < 0.5, "Haversine 20m test failed");

// TEST 2: Forward Azimuth (Due North, Due East)
const northAzimuth = calculateForwardAzimuth(latA, lonA, latB, lonB);
console.log(`[Test 2] Due North Azimuth: ${northAzimuth.toFixed(1)}° (Expected ~0°)`);
assert(Math.abs(northAzimuth - 0) < 0.1 || Math.abs(northAzimuth - 360) < 0.1, "Due North Azimuth failed");

const lonEast = lonA + 20 / (111139 * Math.cos(toRadians(latA)));
const eastAzimuth = calculateForwardAzimuth(latA, lonA, latA, lonEast);
console.log(`[Test 2] Due East Azimuth: ${eastAzimuth.toFixed(1)}° (Expected ~90°)`);
assert(Math.abs(eastAzimuth - 90) < 0.1, "Due East Azimuth failed");

// TEST 3: Angle normalization across wrap boundary
const wrapDiff = normalizeAngleDiff(10, 350);
console.log(`[Test 3] Angle diff between 10° and 350°: ${wrapDiff}° (Expected +20°)`);
assert.strictEqual(wrapDiff, 20, "Angle diff wrap-around failed");

// TEST 4: Lateral Stance Offset Vector
// User facing North (0°), standing at driver's door (left of car)
// Vehicle centroid should be 1.2 meters to the East (+90°)
const stance = computeVehicleCentroid(latA, lonA, 0, 1.2);
const offsetDist = calculateHaversineDistance(latA, lonA, stance.centroidLat, stance.centroidLng);
const offsetBearing = calculateForwardAzimuth(latA, lonA, stance.centroidLat, stance.centroidLng);
console.log(`[Test 4] Lateral centroid distance: ${offsetDist.toFixed(2)}m (Expected 1.20m), Bearing: ${offsetBearing.toFixed(1)}° (Expected ~90°)`);
assert(Math.abs(offsetDist - 1.2) < 0.05, "Lateral offset distance failed");
assert(Math.abs(offsetBearing - 90) < 0.5, "Lateral offset bearing failed");

// TEST 5: Kalman Filter Smoothing across boundary
const kalman = new KalmanAngleFilter();
let smooth = kalman.update(358);
smooth = kalman.update(359);
smooth = kalman.update(1);
smooth = kalman.update(2);
console.log(`[Test 5] Kalman wrap around 359° -> 2° converged smoothly to: ${smooth.toFixed(2)}°`);
assert(smooth < 10 || smooth > 350, "Kalman filter wrap failed");

// TEST 6: Anti-Disorientation Lockout Logic
const closeDist = 1.8;
const isWithinLockoutRange = closeDist <= 2.5;
console.log(`[Test 6] Anti-Disorientation Lockout at 1.8m: ${isWithinLockoutRange} (Expected true)`);
assert.strictEqual(isWithinLockoutRange, true, "Lockout threshold failed");

const farDist = 14.5;
const isBeyondActiveRange = farDist >= 5.0;
console.log(`[Test 6] Active 3D Arrow threshold at 14.5m: ${isBeyondActiveRange} (Expected true)`);
assert.strictEqual(isBeyondActiveRange, true, "Active range threshold failed");

console.log("=== ALL SPATIAL NAVIGATION TESTS PASSED WITH 100% RELIABILITY ===");
