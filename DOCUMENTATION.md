# INFINITY // HACK 2026 — Neo-Brutalist Infinity Stones Architecture & Specification

**Theme**: Marvel: The 6 Infinity Stones  
**Design Aesthetic**: Neo-Brutalism (Thick 4–8px Black Borders, Zero Rounded Corners, Hard Offset Drop Shadows, Raw High-Voltage Color Blocking, Stamped Propaganda Posters, Asymmetric Overlapping Badges)  
**Architecture**: Pure Single HTML File (`public/index.html`) + Dedicated S.H.I.E.L.D. Admin Console (`public/admin.html` at `/admin`) + Node.js Backend (`server.js`)  
**Storage Engine**: Cloudflare R2 Object Storage (`infinity-hackathon-bucket`) with live S3 API integration & local filesystem fallback  

---

## 1. Project Directory Structure

```
hack_t/
├── server.js              # Node.js Express server handling API routes, /admin routing & Cloudflare R2
├── package.json           # Lightweight dependencies (express, multer, @aws-sdk/client-s3, xlsx, dotenv, cors)
├── .env.local             # Live Cloudflare R2 credentials & admin secret
├── .gitignore             # Ignores node_modules, .env.local, uploads
├── DOCUMENTATION.md       # Complete element & architecture specification
└── public/
    ├── index.html         # THE COMPLETE NEO-BRUTALIST SPA (Hero, 6 Stone VFX Power Cards, Battle Plan, Leader Dashboard)
    ├── admin.html         # Dedicated S.H.I.E.L.D. Level 10 Organizer Console (accessed via /admin)
    ├── assets/
    │   ├── Mind_Stone_VFX.png       # Yellow Mind Stone VFX cutout
    │   ├── Space_Stone_VFX.png      # Cyan Space Stone VFX cutout
    │   ├── Reality_Stone_VFX.png    # Red Reality Stone VFX cutout
    │   ├── Power_Stone_VFX.png      # Purple Power Stone VFX cutout
    │   ├── Time_Stone_VFX.png       # Green Time Stone VFX cutout
    │   ├── Soul_Stone_VFX.png       # Orange Soul Stone VFX cutout
    │   ├── infinity-gauntlet-hero.svg   # Vector centerpiece emblem
    │   ├── gauntlet-cursor.svg          # Custom Infinity Gauntlet standard cursor
    │   └── gauntlet-cursor-pointer.svg  # Custom Infinity Gauntlet pointer cursor
    └── uploads/           # Local fallback storage for receipt screenshots
```

---

## 2. The 6 Infinity Stone Cosmic Domains & VFX Assets

| Stone | Cosmic Domain | Saturated Accent | User Asset File | Suggested Arsenal |
| :--- | :--- | :--- | :--- | :--- |
| **Mind Stone** 🧠 | **INTELLIGENCE** | `#FFE600` (Electric Yellow) | `Mind_Stone_VFX.png` | Python, PyTorch, LangChain, FastAPI, Gemini API, TensorFlow |
| **Space Stone** 🌐 | **CONNECTIVITY** | `#00F0FF` (Hyper Cyan) | `Space_Stone_VFX.png` | Rust, Go, Kubernetes, eBPF, Cloudflare Workers, WireGuard |
| **Reality Stone** 🌌 | **DIGITAL** | `#FF0055` (Crimson Glitch) | `Reality_Stone_VFX.png` | TypeScript, React, Flutter, Next.js, Node.js, WebGL |
| **Power Stone** ⚡ | **AUTOMATION** | `#B026FF` (Thanos Violet) | `Power_Stone_VFX.png` | C++, Rust, ESP32 / Arduino, ROS2, MQTT, FreeRTOS |
| **Time Stone** ⏳ | **ANALYTICS** | `#00FF66` (Radioactive Emerald) | `Time_Stone_VFX.png` | Python, Kafka, ClickHouse, Pandas, DuckDB, Scikit-Learn |
| **Soul Stone** 🧬 | **IMPACT** | `#FF7700` (Solar Flare Orange) | `Soul_Stone_VFX.png` | Python, Flutter, PostgreSQL, FastAPI, Edge AI, OpenCV |

---

## 3. Key Architectural Rules Implemented

### A. Neo-Brutalist Visual Grammar
* **Thick Black Borders**: 4px to 8px borders across all cards, buttons, dialogs, and sections.
* **Hard Offset Drop Shadows**: `box-shadow: 8px 8px 0px #000`, `12px 12px 0px #000`, `16px 16px 0px #000`.
* **Zero Rounded Radii**: Strict `border-radius: 0px` across the entire interface.
* **Instant Button Press**: On active click, buttons translate `translate(3px, 3px)` with `box-shadow: 1px 1px 0 #000` for tactile friction.
* **Stone VFX Cutout Overflows**: Transparent high-energy Stone PNG cutouts burst out of the card borders.

### A. Navigation & URL-Based Admin
* **Public Homepage Navigation**:
  * Contains **ONLY ONE login button**: `⚡ Team Leader Login` (`#open-leader-btn`).
  * NO Admin button on the public homepage.
* **Organizer Admin Console**:
  * Accessed strictly via URL: **`http://localhost:3000/admin`**.
  * S.H.I.E.L.D. Level 10 Clearance with secret passphrase (`admin123`).

### B. Auto-Rolling 6-Stone Stack File (White Dossier Stack Effect)
* **White Dossier File Stack Layout**: Layered classified white dossier effect (`#FFFFFF`, `#F4F4F5`, `#E4E4E7`) with thick 4px black borders, hard offset black drop shadows, and vibrant colored archive tab stamps peeking out behind the active card.
* **Clean Stone Display**: The dark background container and radial glow bloom have been removed; the stone VFX cutouts float cleanly on the white dossier card with crisp neo-brutalist offset drop shadows.
* **Autonomous Cycling**: Automatically rolls through all 6 Infinity Stones sequentially every 3.5 seconds:
  1. Mind Stone (`Mind_Stone_VFX.png` • Psionic Yellow `#FFE600`)
  2. Space Stone (`Space_Stone_VFX.png` • Teleportation Cyan `#00F0FF`)
  3. Reality Stone (`Reality_Stone_VFX.png` • Transmutation Crimson `#FF0055`)
  4. Power Stone (`Power_Stone_VFX.png` • Singularity Violet `#B026FF`)
  5. Time Stone (`Time_Stone_VFX.png` • Temporal Emerald `#00FF66`)
  6. Soul Stone (`Soul_Stone_VFX.png` • Essence Solar `#FF7700`)
* **Interactive Controls & Registration**:
  * Snappy tactile card deal transitions (`stoneRollOut` / `stoneRollIn`).
  * 6 clickable stone indicator chips with tactile elevation for the active stone.
  * `◀ PREV` and `NEXT ▶` manual stepping controls.
  * Live `AUTO-ROLLING STACK ●` pulsing indicator with automatic hover-to-pause and resume on mouse leave.
  * Direct "WIELD →" action button immediately launching the registration modal with that specific stone domain preselected.

### C. Responsive Spacing & Layout Architecture
* **Navbar Overflow Elimination**:
  * Prevents clipping on laptop/scaled displays (1024px–1200px) by transitioning to compact labels (`⚡ LEADER`, `JOIN →`) and hiding redundant tags.
  * At `<= 1080px`, horizontal links hide and a tactile Neo-Brutalist hamburger toggle (`☰`) activates a slide-down mobile navigation drawer with direct jump anchors.
  * At `<= 640px` (mobile), the brand scales to `INF // '26` and secondary actions hide, maintaining pristine margins and zero horizontal scroll.
* **Countdown & Stats Scaling**:
  * Battle clock adapts into an equal 4-column mobile grid without text truncation.
  * Stats strip seamlessly reflows from 4-columns (desktop) to a 2x2 grid (tablet) to a single stacked column (mobile) with pixel-exact borders.

### D. Domain Stone Cards: Neo-Brutalist Stone Overflow Buttons & Pristine Card Layout
* **Neo-Brutalist Stone Overflow CTA Buttons**:
  * Instead of stones crowding card titles or descriptions, each of the 6 Infinity Stone cutouts (`Mind_Stone_VFX.png`, `Space_Stone_VFX.png`, `Reality_Stone_VFX.png`, `Power_Stone_VFX.png`, `Time_Stone_VFX.png`, `Soul_Stone_VFX.png`) is physically embedded in the right side of the card's bottom action button (`.btn-claim-stone`).
  * **Brutalist Overflow**: Scaled up to **`90px x 90px`** desktop size. The stone boldly breaks out past the right border and top/bottom edges of the button (`position: absolute; right: -22px; top: 50%; transform: translateY(-50%) rotate(8deg);`) with a deep hard offset black drop shadow (`filter: drop-shadow(5px 5px 0px rgba(0, 0, 0, 0.95))`).
  * **Visual Direction**: The button label `WIELD {StoneName}` sits on the left, an arrow `→` (`font-size: 1.35rem`) points directly toward the stone, and `padding-right: 82px` ensures ample runway so text and arrow never collide with the massive stone.
  * **Interactive Micro-Animations**:
    * Hovering anywhere on the card gently tilts and scales the stone (`scale(1.08) rotate(3deg)`).
    * Hovering directly over the button elevates the button with an offset shadow (`7px 7px 0px #000`), translates the arrow (`translateX(4px)`), and dynamically bursts the stone forward (`scale(1.2) rotate(-5deg)` with `drop-shadow(7px 7px 0px #000)`), expanding up to **108px**.
* **Pristine Card Body Spacing**:
  * The entire upper body of all 6 cards (Domain Title, Category Tagline, Description, Tech Arsenal pills, and Problem Statement preview box) is 100% clean, spacious, and free of any clashing graphics.
  * Card titles retain bold, consistent clamp sizing (`font-size: clamp(1.45rem, 3.6vw, 1.85rem)`) with zero artificial text wrapping.
* **Mobile Responsiveness**:
  * On mobile (`<= 640px`), buttons scale gracefully (`padding: 12px 14px; padding-right: 70px; font-size: 0.95rem`) and stones adapt to **`74px x 74px`** at `right: -16px`, retaining the punchy breakout effect without causing horizontal overflow.
* **Zero-Collision Spacing Management**:
  * Title collisions on long words (`INTELLIGENCE`, `CONNECTIVITY`, `AUTOMATION`) completely resolved with dynamic fluid font sizes and tailored padding.
  * Top bar status badges (`[🔓 DECRYPTED]` and `[🔒 LOCKED]`) have 100% clear sightlines with zero stone overlap across all 6 cards.
* **Auto-Fill Registration**: Clicking any of the 6 stone domain cards automatically opens the Registration Modal with that stone preselected in `<select id="reg-domain">`.

### E. Neo-Brutalist `<TargetCursor />` (React Bits Component Integration)
* **Component Architecture**:
  * Implemented and integrated the `<TargetCursor />` component from [React Bits](https://reactbits.dev) in both ES Module / Vanilla JS (`public/js/TargetCursor.js`) and React JSX (`src/components/TargetCursor.jsx`, `public/js/TargetCursor.jsx`).
  * Styled in `public/css/TargetCursor.css` and powered by GSAP animation engine (`public/js/gsap.min.js`).
* **Neo-Brutalist Theming**:
  * **Brutalist Corner Reticles**: 4 mechanical bracket corners with thick `3.5px solid #000000` borders and hard offset drop shadows (`box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.9)`).
  * **Infinity Core Dot**: Center reticle with 2px black border and glowing Electric Yellow (`#FFE600`) core.
  * **Lock-On Targeting**: Automatically detects and locks onto interactive elements (`button, a, .btn-brutal, .btn-claim-stone, .stone-card, .plan-card, .stat-tile, .bounty-card, input, select`), expanding the brackets to frame the target's bounding box with a high-contrast yellow offset shadow.
  * **Smooth Parallax & Physics**: As the cursor moves across a locked target, the corners maintain an active parallax spring before snapping cleanly back on leave.
  * **Tactile Mechanical Click**: Compresses on `mousedown` (`scale: 0.88`) and springs back on `mouseup`.
  * **Touch & Mobile Awareness**: Automatically detects mobile / touch screens (`<= 768px`) and safely unbinds to preserve native mobile touch interactions.

### F. Dynamic Leader Dashboard
* When a team leader logs in, the dashboard dynamically morphs its background, borders, badge, and shadows to match their chosen stone (e.g. Doctor Strange emerald runes for the Time Stone).
* **Room Allocated Display**: Shows assigned room (e.g., `📍 ALLOCATED ROOM: Stark Lab 304`).
* **Problem Statement Selection**: 1 team can select 1 problem statement with the "Claim Problem Statement" button once released.
* **Domain Switching**: Option to edit domain before locking their statement.

### G. Full-Control Organizer Admin Console (`/admin`)
* Admin can edit **any squad detail**:
  * Team Name, College, Leader Name, Leader Email, Leader Phone, Team Password.
  * Preferred Domain.
  * Assigned Lab / Room (`roomAllocated`).
  * Selected Problem Statement (`selectedProblemStatement`).
  * Payment Status (`verified`, `pending`, `rejected`) and UTR.
* Multi-sheet Excel export (`.xlsx`) with team rosters, payment UTRs, and room allocations.

---

## 4. How to Run & Deploy

### A. Live Cloudflare Pages Production
* **Public Homepage & Leader Portal**: **[https://infinity-hackathon-2026.pages.dev](https://infinity-hackathon-2026.pages.dev)**
* **Organizer Admin Console**: **[https://infinity-hackathon-2026.pages.dev/admin](https://infinity-hackathon-2026.pages.dev/admin)**
* **Architecture**: Cloudflare Pages + Pages Functions (`functions/api/[[catchall]].js`) with native edge R2 storage (`infinity-hackathon-bucket`).

```bash
# Deploy latest changes directly to Cloudflare Pages:
npm run deploy
# or
npm run pages:deploy

# Run Cloudflare Pages locally with edge functions & R2:
npm run pages:dev
```

### B. Local Node.js Development Server

```bash
# 1. Start Local Express Server
npm run dev
# or
node server.js

# 2. Public Home & Leader Portal
http://localhost:3000

# 3. Dedicated Organizer Admin Console
http://localhost:3000/admin
```

