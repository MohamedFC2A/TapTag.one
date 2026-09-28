/**
 * Precision Spatial Mathematics & Apple Navigation Fusion Test Suite
 */

import {
  calculateHaversineDistance,
  calculateForwardAzimuth,
  normalizeAngleDiff,
  computeVehicleCentroid,
  computeNavigationVector,
  calculateApplePrecisionArc,
  getNaturalDirectionText,
  KalmanAngleFilter,
  ExponentialFilter,
  computeTiltCompensatedHeading,
  computeWeightedGNSSCentroid,
  formatCalibrationDateTime,
  getRelativeTimeArabic,
} from "../src/lib/spatial-navigation.ts";

function runSpatialTestSuite() {
  console.log("=================================================");
  console.log("  TAPTAG ENTERPRISE - SPATIAL & SENSOR TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  // Test 1: Haversine distance accuracy
  const dZero = calculateHaversineDistance(24.7136, 46.6753, 24.7136, 46.6753);
  assert(Math.abs(dZero) < 0.001, "Haversine Distance: Coincident points yield 0.000m");

  // Known benchmark: 1 degree latitude ~= 111,139 meters
  const d1DegLat = calculateHaversineDistance(0, 0, 1, 0);
  assert(Math.abs(d1DegLat - 111195) < 200, `Haversine Distance: 1 Degree Latitude (~111.19 km, got ${(d1DegLat / 1000).toFixed(2)} km)`);

  // Test 2: Forward Azimuth (Bearings)
  const bNorth = calculateForwardAzimuth(0, 0, 1, 0);
  assert(Math.abs(bNorth - 0) < 0.1, "Azimuth: Due North yields 0.0°");

  const bEast = calculateForwardAzimuth(0, 0, 0, 1);
  assert(Math.abs(bEast - 90) < 0.1, "Azimuth: Due East yields 90.0°");

  const bSouth = calculateForwardAzimuth(1, 0, 0, 0);
  assert(Math.abs(bSouth - 180) < 0.1, "Azimuth: Due South yields 180.0°");

  const bWest = calculateForwardAzimuth(0, 1, 0, 0);
  assert(Math.abs(bWest - 270) < 0.1, "Azimuth: Due West yields 270.0°");

  // Test 3: Angular difference normalization [-180, 180]
  assert(normalizeAngleDiff(10, 350) === 20, "Angle Normalization: 10° - 350° wraps to +20°");
  assert(normalizeAngleDiff(350, 10) === -20, "Angle Normalization: 350° - 10° wraps to -20°");
  assert(normalizeAngleDiff(180, 0) === 180 || normalizeAngleDiff(180, 0) === -180, "Angle Normalization: Opposite heading wraps to 180°");

  // Test 4: Lateral Centroid Offset (1.2m shift from driver door)
  const userLat = 30.0444;
  const userLng = 31.2357;
  const userHeadingNorth = 0; // Facing North
  const { centroidLat, centroidLng } = computeVehicleCentroid(userLat, userLng, userHeadingNorth, 1.2);
  const offsetDist = calculateHaversineDistance(userLat, userLng, centroidLat, centroidLng);
  assert(Math.abs(offsetDist - 1.2) < 0.05, `Vehicle Centroid Offset: Exactly 1.2m offset from driver door (Calculated: ${offsetDist.toFixed(3)}m)`);

  // Test 5: 5.0-Meter Cutoff Boundary Condition
  const mockCal = {
    tagUid: "TEST-TAG",
    vehiclePlate: "1234",
    vehicleMake: "Toyota",
    calibratedAt: new Date().toISOString(),
    rawLat: userLat,
    rawLng: userLng,
    userHeading: 0,
    accuracy: 3.0,
    centroidLat: userLat,
    centroidLng: userLng,
    offsetDistanceMeters: 1.2,
  };

  // Case A: 5.2 meters away -> Outside lockout
  const vFar = computeNavigationVector(userLat + 0.0000468, userLng, 0, mockCal, 3.0);
  assert(vFar.distanceMeters > 5.0 && !vFar.isWithinLockoutRange && vFar.isBeyondActiveRange, `Threshold Boundary: ${vFar.distanceMeters.toFixed(2)}m is recognized as Active Range (> 5m)`);

  // Case B: 3.5 meters away -> Inside lockout (< 5m)
  const vNear = computeNavigationVector(userLat + 0.0000315, userLng, 0, mockCal, 3.0);
  assert(vNear.distanceMeters <= 5.0 && vNear.isWithinLockoutRange && !vNear.isBeyondActiveRange, `Threshold Boundary: ${vNear.distanceMeters.toFixed(2)}m is recognized as Precision Lockout (<= 5m)`);

  // Test 6: Apple Dynamic Circular Arc Computation
  const arcRight = calculateApplePrecisionArc(45, 125, 150, 150);
  assert(arcRight.isVisible && arcRight.pathD.startsWith("M ") && arcRight.pathD.includes("A 125 125"), "Apple Arc Geometry: Dynamic curved SVG arc path created for 45° bearing");

  const arcAhead = calculateApplePrecisionArc(5, 125, 150, 150);
  assert(!arcAhead.isVisible, "Apple Arc Geometry: Arc gracefully hidden when directly aligned (< 12°)");

  // Test 7: Natural Language Direction Generator
  assert(getNaturalDirectionText(0, true) === "أمامك مباشرة", "Direction Text (Ar): 0° -> 'أمامك مباشرة'");
  assert(getNaturalDirectionText(60, true) === "إلى يمينك", "Direction Text (Ar): +60° -> 'إلى يمينك'");
  assert(getNaturalDirectionText(-70, true) === "إلى يسارك", "Direction Text (Ar): -70° -> 'إلى يسارك'");
  assert(getNaturalDirectionText(160, true) === "خلفك", "Direction Text (Ar): 160° -> 'خلفك'");
  assert(getNaturalDirectionText(-165, true) === "خلفك", "Direction Text (Ar): -165° -> 'خلفك'");

  // Test 8: Kalman Angular Filter Stability (No 359 -> 1 wrap flutter)
  const kalman = new KalmanAngleFilter(0.1, 1.5);
  kalman.update(358);
  kalman.update(359);
  const smoothAroundZero = kalman.update(1);
  assert(smoothAroundZero > 350 || smoothAroundZero < 10, `Kalman Filter: Wrap-around 359° -> 1° without discontinuity (Value: ${smoothAroundZero.toFixed(1)}°)`);

  // Test 9: 3D Tilt-Compensated Heading across all cardinal directions & tilts
  const flatNorth = computeTiltCompensatedHeading(0, 0, 0);
  assert(Math.abs(flatNorth - 0) < 0.1, "3D Tilt Heading: Flat phone facing North yields 0.0°");

  const flatEast = computeTiltCompensatedHeading(270, 0, 0);
  assert(Math.abs(flatEast - 90) < 0.1, `3D Tilt Heading: Flat phone facing East yields 90.0° (got ${flatEast}°)`);

  const flatSouth = computeTiltCompensatedHeading(180, 0, 0);
  assert(Math.abs(flatSouth - 180) < 0.1, `3D Tilt Heading: Flat phone facing South yields 180.0° (got ${flatSouth}°)`);

  const flatWest = computeTiltCompensatedHeading(90, 0, 0);
  assert(Math.abs(flatWest - 270) < 0.1, `3D Tilt Heading: Flat phone facing West yields 270.0° (got ${flatWest}°)`);

  const tiltedNorth = computeTiltCompensatedHeading(0, 45, 0);
  assert(Math.abs(tiltedNorth - 0) < 0.1 || Math.abs(tiltedNorth - 360) < 0.1, "3D Tilt Heading: 45° Pitch Tilt maintains True North 0.0°");

  const tiltedRollNorth = computeTiltCompensatedHeading(0, 45, 10);
  assert(Math.abs(tiltedRollNorth - 355) < 1.0, `3D Tilt Heading: 45° Pitch with 10° Roll adjusts smoothly to 355° (got ${tiltedRollNorth}°)`);

  // Test 10: Weighted GNSS Multi-Burst Centroid
  const sampleBurst = [
    { lat: 24.713600, lng: 46.675300, accuracy: 1.5, heading: 45 },
    { lat: 24.713602, lng: 46.675301, accuracy: 1.8, heading: 46 },
    { lat: 24.713610, lng: 46.675310, accuracy: 8.5, heading: 50 }, // Low accuracy, should be heavily down-weighted
  ];
  const { avgLat, avgAccuracy, sampleCount } = computeWeightedGNSSCentroid(sampleBurst);
  assert(sampleCount === 3, "Multi-GNSS Centroid: All 3 samples processed");
  assert(avgAccuracy < 2.5, `Multi-GNSS Centroid: Weighted accuracy is heavily influenced by high-accuracy fix (got ${avgAccuracy.toFixed(2)}m)`);
  assert(Math.abs(avgLat - 24.713601) < 0.000005, "Multi-GNSS Centroid: Weighted latitude strongly adheres to sub-meter cluster");

  // Test 11: formatCalibrationDateTime (Deterministic Clean Arabic 12h)
  const nowTest = new Date();
  const formattedToday = formatCalibrationDateTime(nowTest.toISOString());
  assert(formattedToday.dateFormatted === "اليوم", `Timestamp Format: Current date resolves to 'اليوم' (got '${formattedToday.dateFormatted}')`);
  assert(formattedToday.timeFormatted.includes("ص") || formattedToday.timeFormatted.includes("م"), "Timestamp Format: 12-hour marker (ص/م) present");

  // Test 12: getRelativeTimeArabic (Live Dynamic Relative Elapsed Time)
  const justNow = new Date(Date.now() - 10 * 1000); // 10s ago
  assert(getRelativeTimeArabic(justNow) === "الآن (منذ لحظات)", "Relative Time: 10s ago yields 'الآن (منذ لحظات)'");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
  assert(getRelativeTimeArabic(fiveMinAgo) === "منذ 5 دقائق", "Relative Time: 5 min ago yields 'منذ 5 دقائق'");

  const oneHourAgo = new Date(Date.now() - 65 * 60 * 1000); // 65 min ago
  assert(getRelativeTimeArabic(oneHourAgo) === "منذ ساعة واحدة", "Relative Time: 65 min ago yields 'منذ ساعة واحدة'");

  // Test 13: Adaptive ExponentialFilter (Immediate walking follow + stationary noise suppression)
  const filter = new ExponentialFilter();
  filter.reset(20.0);
  // Walking step: jumps from 20m to 15m (delta 5m > 1.5m -> high tracking alpha 0.75)
  const stepFollow = filter.update(15.0);
  assert(stepFollow < 17.0, `Adaptive Filter: Walking transition rapidly tracks toward target (got ${stepFollow.toFixed(2)}m)`);
  // Stationary jitter: small noise around current smoothed position (delta 0.15m < 0.6m -> gentle alpha 0.35)
  const stationaryNoise = stepFollow + 0.15;
  const stationarySmooth = filter.update(stationaryNoise);
  assert(Math.abs(stationarySmooth - stepFollow) < 0.10, `Adaptive Filter: Stationary noise dampened gently (got ${stationarySmooth.toFixed(2)}m)`);

  console.log("\n-------------------------------------------------");
  console.log(`Spatial Test Suite Summary: ${passed} Passed | ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSpatialTestSuite();
