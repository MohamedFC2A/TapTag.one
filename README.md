# TapTag.one (تابتوج) 🛡️
### Next-Gen Enterprise Smart Identity & NFC/QR Vehicle & Physical Asset Shield

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon.tech%20PostgreSQL-336791?style=flat&logo=postgresql)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma%206-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![WebAuthn / Passkeys](https://img.shields.io/badge/Security-FIDO2%20Passkeys-00C853?style=flat)](https://www.w3.org/TR/webauthn-2/)
[![Tailwind CSS](https://img.shields.io/badge/Design-Pitch%20Black%20%26%20Emerald-000000?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

---

## 📌 Overview / نظرة عامة

**TapTag.one** is a production-grade SaaS and physical hardware ecosystem designed for vehicle and asset protection. It pairs physical acrylic NFC/QR tags mounted on vehicles or high-value assets with zero-knowledge encrypted emergency alert channels, eliminating the need to expose private phone numbers on windshields.

* **First-Claim Biometric Ownership:** Physical cards are sold unconfigured in stores. When the customer scans the card, ownership is cryptographically bound to their mobile device via mandatory WebAuthn (Touch ID, Face ID, Fingerprint).
* **Zero PII Exposure:** Bystanders scan the tag to report blocking, towing, or emergencies without ever seeing the owner's phone number or personal details.
* **Factory Minting Engine:** Local factory workstation engine generating ISO/IEC 18004 compliant physical 70mm × 50mm acrylic cards with 300 DPI high-resolution export and laser-cutting SVG vector blueprints.

---

## 🏗️ Architecture & Tech Stack

* **Framework:** Next.js 15 (App Router, Server Actions, React 19).
* **Database & Persistence:** Neon.tech Serverless PostgreSQL with atomic collision-free tag allocation.
* **ORM:** Prisma 6 with strict schema constraints, relational integrity, and audit trails.
* **Authentication:** WebAuthn / FIDO2 Passkeys hardware biometrics (Zero Passwords, Non-bypassable).
* **Styling & Design System:** Pure Pitch Black (`#000000`), Dark Carbon Surfaces (`#08080A`), Precision Borders (`#1F2228`), Crisp Solid White (`#FFFFFF`), and Institutional Emerald (`#00C853`).
* **Audio Bridge:** Encrypted VoIP browser-to-browser calling channel (simulated/pluggable WebRTC audio tunnel).
* **Multi-Channel Dispatch:** Multi-tier webhook router for WhatsApp, Web Push, Telegram, and SMS fallback.

---

## 🚀 Key Modules

### 1. Factory Card Minting Engine (`/admin/qr-engine`)
* Restricted to factory manufacturing floor (`localhost` / isolated subnet).
* Atomic generation of cryptographically secure, collision-free hardware UIDs (`TT-XXXX-XXXX`).
* High-Efficiency Monocrystalline Photovoltaic (PV) harvesting banner simulation.
* Real-time Canvas & SVG Vector rendering for UV printing and CNC laser cutting.

### 2. Passwordless Biometric Activation (`/dashboard/activate`)
* Two-step claiming flow: NFC Tap / QR Code Detection -> Vehicle Plate & Emergency Contact Binding.
* Hardware Biometric Lock: Mandates WebAuthn Passkey registration (`userVerification: "required"`).

### 3. Smart Redirect Gateway (`/r/[tagId]`)
* If scanned by the verified owner device: automatically unlocks the Owner Control Suite.
* If scanned by a bystander: dynamically generates a cryptographic HMAC anti-spam session token and routes to the public incident dispatch portal.

### 4. Public Incident & Communication Portal (`/t/[tagId]`)
* **Vehicle Movement Alert:** Request the owner to move their car with predefined reasons (double parking, driveway blocking).
* **Emergency Report:** Immediate notification for collisions, towing, open windows, or alarm triggers.
* **Encrypted VoIP Audio Call:** In-browser private calling session without phone number exchange.
* **Direct Private Note:** 160-character limited secure direct message.

### 5. Fleet Command Center (`/dashboard`)
* Fleet overview metrics: Active tags, scan events, pending incidents, resolution SLA.
* Live status toggles: `ACTIVE`, `AWAY`, `DND`, `SUSPENDED`.
* Real-time automated response rules & notification channel management.

---

## 🛠️ Getting Started

### Prerequisites
* Node.js 18+ (Node.js 20+ recommended)
* PostgreSQL Database (Neon.tech recommended)
* Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MohamedFC2A/TapTag.one.git
   cd TapTag.one
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Neon PostgreSQL connection string and cryptographic secrets.

4. **Initialize database schema:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy Directives

* **Zero Plaintext Credentials:** Secrets and database connection strings are never committed to source control.
* **Rate-Limiting & Anti-Spam:** IP address hashing with secret salt enforces cooldown periods between incident submissions.
* **Cryptographic Attestation:** Biometric passkeys are evaluated against hardware authenticators with strict origin validation.

---

## 📄 License

Proprietary enterprise software developed for **TapTag.one**. All rights reserved.
