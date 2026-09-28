# Zero-Hardware Spatial Precision Navigation Engine ("أين سيارتي؟")
## Implementation Plan & Technical Architecture

### 1. Overview & Objective
Develop an owner-exclusive, zero-hardware spatial navigation and precision-finding system.
- **Zero External Hardware**: Operates entirely using modern mobile device sensors (High-accuracy GNSS Geolocation, DeviceOrientation compass/magnetometer, Gyroscope, Accelerometer Dead Reckoning) combined with proprietary sensor fusion and Kalman filtering algorithms.
- **Subtle Spatial Calibration**: Presented as "معايرة موضع المركبة الفضائي" (Vehicle Spatial Stance Calibration) rather than raw GPS coordinate logging.
  - Interactive isometric 3D visual guide demonstrating the stance (standing at driver's side / left side of the vehicle, phone held flat facing upwards aligned with vehicle direction).
  - Algorithmic lateral offset vector projection (`offset_distance * cos(heading + 90°)`, shifting the centroid ~1.2m to the true vehicle body center).
  - High-speed multi-sample sensor capture (1.5 - 2.0s duration) with median filtering.
- **Sensor Fusion Navigation Engine**:
  - Haversine distance computation.
  - Forward azimuth & relative bearing calculation.
  - Kalman filter smoothing to remove sensor jitter and compass flutter.
  - Dynamic confidence index calculation (up to 95%+ precision).
- **Apple AirTag Style 3D Precision Finding UI**:
  - Pure Apple AirTag inspired aesthetic: Deep matte obsidian black (`#000000`), crisp precision green (`#00C853` with pure bevel/shading, ZERO glowing/glare).
  - Dynamic 3D directional arrow rotating with smooth perspective and device orientation.
  - Responsive distance countdown in real-time (`24 m`, `15 m`, `6.2 m`).
  - Active when distance >= 5m.
- **Anti-Disorientation Lockout ("انظر لمحيطك بحثاً عنها")**:
  - When within close proximity (<= 2.5m, where compass vectors become noisy/ambiguous), the arrow gracefully locks out and closes.
  - Displays high-visibility notification: "وصلت للمركبة! انظر لمحيطك المباشر بحثاً عنها".
  - Haptic vibration cadence (`navigator.vibrate([100, 80, 100, 80, 200])`) and subtle synthesized audio feedback via Web Audio API.
- **Sensor Permission & Fallback Support**:
  - Handles iOS `DeviceOrientationEvent.requestPermission()`.
  - Realistic interactive simulation / testing mode for desktop or testing without moving physically.
- **Owner-Only Authentication**:
  - Gated by biometric passkey / device fingerprint.
  - Integrated into both `/t/[tagId]` (Owner mode) and `/dashboard` (Fleet command).

---

### 2. Architecture & File Breakdown
1. `src/lib/spatial-navigation.ts`:
   - Sensor fusion algorithms, Kalman filtering, haversine distance, forward bearing, lateral stance offset vector, confidence score calculations.
   - Types and interfaces for `SpatialCalibration`, `NavigationState`, and `SensorReading`.
2. `src/components/navigation/IsometricStanceDiagram.tsx`:
   - Interactive 3D / Isometric vector visualization of the vehicle, the driver stance on the left side, phone orientation flat facing up, and dynamic visual indicators.
3. `src/components/navigation/SpatialCalibrationModal.tsx`:
   - Ultra-fast 1-tap calibration modal with 3D isometric tutorial, multi-sample GPS & compass capture, progress bar, audio click, and immediate persistence to `localStorage` + server.
4. `src/components/navigation/PrecisionAirTagArrow.tsx`:
   - Clean Apple AirTag-style 3D arrow with perspective tilt, smooth CSS transformations, precision distance rings, distance readout, and smooth animations without glowing.
5. `src/components/navigation/VehicleSpatialFinder.tsx`:
   - Complete precision finding interface:
     - Real-time sensor stream listener (`DeviceOrientation`, `Geolocation.watchPosition`).
     - State machine (`IDLE`, `CALIBRATING`, `NAVIGATING`, `LOCKOUT_ARRIVED`, `SIMULATING`).
     - Anti-disorientation lockout when distance <= 2.5m.
     - Live testing / simulation controls for desktop / demonstration.
6. `src/app/actions/calibration-actions.ts`:
   - Server action to persist and fetch calibration metadata for a tag.
7. Integration:
   - `src/app/t/[tagId]/TagActionClient.tsx`: Add "تحديد موقع المركبة (أين سيارتي؟)" to Owner Suite.
   - `src/app/dashboard/DashboardClient.tsx`: Add "تحديد الموقع الفضائي" quick action for each vehicle in the fleet table.
   - `src/lib/translations.ts`: Full Arabic and English translations.

---

### 3. Verification & Testing
- Unit and algorithmic calculation tests for bearing, distance, and lateral offset vector.
- TypeScript compiler audit (`npx tsc --noEmit`).
- Production build verification (`npm run build`).
- Functional test with simulated walk towards car from 30m down to 2m, validating arrow direction, meter decrease, and "انظر لمحيطك" lockout trigger.
