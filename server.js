import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Load .env.local first, fallback to .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// SECURITY RATE LIMITERS
// ==========================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const regLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Registration rate limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const utrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { exists: false, error: 'Verification rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// SECURITY HELPERS: HASHING & SANITIZATION
// ==========================================
function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!password || !stored) return false;
  if (!stored.startsWith('pbkdf2$')) {
    // Legacy plaintext support for initial test teams
    return password === stored;
  }
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const originalHash = parts[2];
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (e) {
    return false;
  }
}

function sanitizeTeam(team) {
  if (!team) return team;
  const safe = { ...team };
  delete safe.teamPassword;
  return safe;
}

// ==========================================
// SECURITY HELPERS: ADMIN CLEARANCE TOKEN
// ==========================================
function generateAdminToken(secret) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `shield_${timestamp}_${nonce}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64');
}

function verifyAdminToken(tokenString, secret) {
  if (!tokenString) return false;
  if (tokenString === secret) return true; // Direct secret match support

  try {
    const decoded = Buffer.from(tokenString, 'base64').toString('utf-8');
    const [payload, signature] = decoded.split('.');
    if (!payload || !signature) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
    if (!isValid) return false;

    const parts = payload.split('_');
    const timestamp = parseInt(parts[1], 10);
    // 24 hour clearance token expiry
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

function requireAdminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET || 'admin123';
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token.toString().trim();
  }

  if (!token || !verifyAdminToken(token, secret)) {
    return res.status(401).json({
      success: false,
      error: 'Access Denied: S.H.I.E.L.D. Level 10 Clearance authorization required.'
    });
  }
  next();
}

// ==========================================
// CLOUDFLARE R2 CONFIGURATION
// ==========================================
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'infinity-hackathon-bucket';
const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

const isR2Enabled = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

let s3Client = null;
if (isR2Enabled) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
  console.log(`[R2 Storage] Connected to Cloudflare R2 bucket: ${bucketName}`);
} else {
  console.log('[R2 Storage] Running with local persistent filesystem storage fallback.');
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const R2_DB_KEY = 'state/database.json';

// Initial Domains & Problem Statements — Marvel Infinity Stones
const INITIAL_DOMAINS = [
  {
    id: 'intelligence',
    stoneName: 'Mind Stone',
    domainName: 'INTELLIGENCE',
    tagline: 'AI • ML • Decision Systems',
    heroMarvelTheme: 'vision',
    description: 'Architect autonomous multi-agent networks, neural cognition models, self-refining LLM pipelines, and intelligent decision systems capable of enterprise-scale problem-solving.',
    iconName: 'Cpu',
    stoneSymbol: 'The Vision Core',
    accentHex: '#facc15',
    accentRgb: '250, 204, 21',
    techStackSuggestions: ['Python', 'PyTorch', 'LangChain', 'FastAPI', 'Gemini API', 'TensorFlow'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-intel-01',
        code: 'PS-INTEL-01',
        title: 'Autonomous Multi-Agent Synthesis & Dynamic Self-Correction Engine',
        category: 'AI & Decision Systems',
        description: 'Build an autonomous team of specialized AI agents (Architect, Auditor, Coder, Verifier) that debate trade-offs, execute verification loops, and generate verified artifact packages.',
        difficulty: 'Advanced',
        deliverables: [
          'Interactive agent trace visualizer UI',
          'Self-correcting verification testbench',
          'Multi-modal decision engine integration'
        ]
      },
      {
        id: 'ps-intel-02',
        code: 'PS-INTEL-02',
        title: 'Neuro-Symbolic Automated Theorem Prover & Code Certifier',
        category: 'Formal AI Verification',
        description: 'Construct a neural-guided symbolic solver that produces formally verified correctness certificates for distributed protocols and cryptographic smart contracts.',
        difficulty: 'Hardcore',
        deliverables: [
          'Automated proof trace generation visualizer',
          'CLI benchmark suite verifying real-world protocols',
          'Exportable formal verification certificate'
        ]
      }
    ]
  },
  {
    id: 'connectivity',
    stoneName: 'Space Stone',
    domainName: 'CONNECTIVITY',
    tagline: 'Cybersecurity • Cloud • Networks',
    heroMarvelTheme: 'tesseract',
    description: 'Forge zero-trust defense architectures, planet-scale cloud networks, high-throughput distributed protocols, and resilient cybersecurity fabrics.',
    iconName: 'Globe',
    stoneSymbol: 'The Tesseract',
    accentHex: '#38bdf8',
    accentRgb: '56, 189, 248',
    techStackSuggestions: ['Rust', 'Go', 'Kubernetes', 'eBPF', 'Cloudflare Workers', 'WireGuard'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-conn-01',
        code: 'PS-CONN-01',
        title: 'Zero-Trust Multi-Cloud Mesh Failover & Network Threat Shield',
        category: 'Cybersecurity & Cloud',
        description: 'Design a self-healing reverse proxy and global routing daemon that dynamically migrates stateful traffic across multiple cloud providers and edge nodes during regional outages or active DDoS attacks.',
        difficulty: 'Hardcore',
        deliverables: [
          'Working distributed controller and lightweight edge proxy agent',
          'Zero-loss connection migration benchmark demonstration',
          'Real-time threat detection & firewall isolation rules'
        ]
      },
      {
        id: 'ps-conn-02',
        code: 'PS-CONN-02',
        title: 'Post-Quantum Encrypted Peer-to-Peer Mesh Fabric',
        category: 'Quantum Cryptography',
        description: 'Engineer a lightweight decentralized P2P transport layer implementing Kyber/Dilithium lattice-based key exchanges with zero external central coordinator dependency.',
        difficulty: 'Hardcore',
        deliverables: [
          'Working multi-node mesh simulator daemon',
          'Quantum-resistant handshake latency benchmark',
          'Live packet telemetry visualizer'
        ]
      }
    ]
  },
  {
    id: 'digital',
    stoneName: 'Reality Stone',
    domainName: 'DIGITAL',
    tagline: 'Web • Mobile • Digital Platforms',
    heroMarvelTheme: 'aether',
    description: 'Bend digital reality. Build hyper-responsive web applications, cross-platform mobile architectures, immersive real-time canvases, and scalable modern platforms.',
    iconName: 'Sparkles',
    stoneSymbol: 'The Aether Prism',
    accentHex: '#f43f5e',
    accentRgb: '244, 63, 94',
    techStackSuggestions: ['TypeScript', 'React', 'Flutter', 'Next.js', 'Node.js', 'WebGL'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-dig-01',
        code: 'PS-DIG-01',
        title: 'Sub-30ms Collaborative Digital Canvas & Universal Component Mesh',
        category: 'Web & Mobile Platforms',
        description: 'Construct a browser-based and mobile-first real-time workspace enabling multi-user manipulation of high-fidelity state with cryptographic attribution and instant offline synchronization.',
        difficulty: 'Advanced',
        deliverables: [
          'Interactive cross-platform collaboration UI',
          'Sub-30ms CRDT state synchronization pipeline',
          'Offline-first progressive synchronization'
        ]
      },
      {
        id: 'ps-dig-02',
        code: 'PS-DIG-02',
        title: 'Generative Spatial Reality Studio for WebXR & Mobile AR',
        category: 'Spatial Realities',
        description: 'Build an in-browser 3D WebXR workspace enabling instantaneous procedural generation of reactive 3D worlds controllable across VR headsets, desktops, and mobile devices.',
        difficulty: 'Advanced',
        deliverables: [
          'Fully functional Three.js/WebXR interactive world',
          'Procedural asset generator with real-time lighting',
          'Cross-device responsive controls'
        ]
      }
    ]
  },
  {
    id: 'automation',
    stoneName: 'Power Stone',
    domainName: 'AUTOMATION',
    tagline: 'IoT • Robotics • Embedded Systems',
    heroMarvelTheme: 'thanos',
    description: 'Unleash physical and digital kinetic power. Develop autonomous robotics, smart hardware controllers, industrial IoT pipelines, and embedded real-time systems.',
    iconName: 'Shield',
    stoneSymbol: 'The Kinetic Orb',
    accentHex: '#c084fc',
    accentRgb: '192, 132, 252',
    techStackSuggestions: ['C++', 'Rust', 'ESP32 / Arduino', 'ROS2', 'MQTT', 'FreeRTOS'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-auto-01',
        code: 'PS-AUTO-01',
        title: 'Autonomous Edge Robotics Fleet Controller & Sensor Telemetry Hub',
        category: 'Robotics & Embedded Systems',
        description: 'Develop a microsecond telemetry agent and swarm control hub that continuously coordinates robotic actuators and IoT sensors, isolating hardware faults automatically.',
        difficulty: 'Hardcore',
        deliverables: [
          'Hardware-in-the-loop or simulation telemetry interface',
          'Autonomous failover daemon for robotic actuators',
          'Real-time metrics visualizer with latency histograms'
        ]
      },
      {
        id: 'ps-auto-02',
        code: 'PS-AUTO-02',
        title: 'Industrial Energy Grid Balancer & Automated Micro-Inverter Mesh',
        category: 'Embedded IoT & Power Systems',
        description: 'Design an ultra-low-power embedded firmware orchestrator that coordinates distributed renewable energy sources, balancing load across power nodes in real time.',
        difficulty: 'Advanced',
        deliverables: [
          'Embedded firmware code compatible with ESP32/ARM Cortex',
          'Hardware simulation testbench with load surges',
          'Interactive telemetry dashboard'
        ]
      }
    ]
  },
  {
    id: 'analytics',
    stoneName: 'Time Stone',
    domainName: 'ANALYTICS',
    tagline: 'Data • Prediction • Optimization',
    heroMarvelTheme: 'doctor-strange',
    description: 'Control temporal velocity. Engineer real-time streaming pipelines, high-throughput predictive time-series models, algorithmic optimization engines, and big data intelligence.',
    iconName: 'Clock',
    stoneSymbol: 'The Eye of Agamotto',
    accentHex: '#4ade80',
    accentRgb: '74, 222, 128',
    techStackSuggestions: ['Python', 'Kafka', 'ClickHouse', 'Pandas', 'DuckDB', 'Scikit-Learn'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-ana-01',
        code: 'PS-ANA-01',
        title: 'Sub-Millisecond Streaming Prediction & Algorithmic Optimization Pipeline',
        category: 'Data & Prediction',
        description: 'Engineer an event-driven analytical router that processes high-throughput telemetry streams, predicts impending anomaly spikes using micro-statistical models, and dynamically optimizes execution paths.',
        difficulty: 'Hardcore',
        deliverables: [
          'Real-time streaming pipeline processing benchmarks',
          'Live statistical prediction vs naive forecast models',
          'Visual telemetry interface with latency histograms'
        ]
      },
      {
        id: 'ps-ana-02',
        code: 'PS-ANA-02',
        title: 'Temporal Graph Analytics & Supply Chain Bottleneck Oracle',
        category: 'Graph Analytics',
        description: 'Build a temporal graph processing engine capable of querying millions of dynamic shipment nodes and calculating optimal routing adjustments seconds before cascading delays occur.',
        difficulty: 'Advanced',
        deliverables: [
          'Interactive graph visualization canvas with time-slider',
          'Predictive bottleneck alert daemon',
          'Benchmarking report showing speedup vs standard algorithms'
        ]
      }
    ]
  },
  {
    id: 'impact',
    stoneName: 'Soul Stone',
    domainName: 'IMPACT',
    tagline: 'Healthcare • Agriculture • Education • Social Good',
    heroMarvelTheme: 'vormir',
    description: 'Channel technology to transform lives. Pioneer accessible healthcare diagnostics, precision agricultural sensors, adaptive educational tools, and sustainable social impact networks.',
    iconName: 'Heart',
    stoneSymbol: 'The Cosmic Singularity',
    accentHex: '#fb923c',
    accentRgb: '251, 146, 60',
    techStackSuggestions: ['Python', 'Flutter', 'PostgreSQL', 'FastAPI', 'Edge AI', 'OpenCV'],
    isPsReleased: false,
    psReleaseDate: '2026-10-10T09:00:00Z',
    problemStatements: [
      {
        id: 'ps-imp-01',
        code: 'PS-IMP-01',
        title: 'Decentralized Community Healthcare Triage & Precision Agriculture Telemetry',
        category: 'HealthTech & Social Impact',
        description: 'Construct a privacy-preserving triage engine and sensor aggregation hub for underserved rural communities that pairs offline-first inference with automated resource distribution.',
        difficulty: 'Advanced',
        deliverables: [
          'Offline-first progressive web and mobile application',
          'Differential-privacy epidemiological & soil telemetry dashboard',
          'SMS/WhatsApp fallback alerting pipeline'
        ]
      },
      {
        id: 'ps-imp-02',
        code: 'PS-IMP-02',
        title: 'Adaptive Multi-Lingual AI Tutor for Low-Resource Classrooms',
        category: 'EdTech & Inclusivity',
        description: 'Develop a localized voice and text pedagogical assistant that adapts curriculum lessons into indigenous languages without requiring high-speed cloud internet connectivity.',
        difficulty: 'Advanced',
        deliverables: [
          'Accessible PWA optimized for low-end mobile devices',
          'Local offline speech-to-text / text-to-speech fallback engine',
          'Student mastery & gamified progress tracker'
        ]
      }
    ]
  }
];

// Database Utilities
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadDb() {
  if (isR2Enabled && s3Client) {
    try {
      const res = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: R2_DB_KEY }));
      if (res.Body) {
        const text = await res.Body.transformToString();
        const parsed = JSON.parse(text);
        if (parsed.domains && parsed.teams) return parsed;
      }
    } catch (e) {
      // Key may not exist yet in bucket
    }
  }

  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading local db.json:', e);
    }
  }

  const initial = { domains: INITIAL_DOMAINS, teams: [] };
  await saveDb(initial);
  return initial;
}

async function saveDb(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

  if (isR2Enabled && s3Client) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: R2_DB_KEY,
        Body: Buffer.from(JSON.stringify(data, null, 2)),
        ContentType: 'application/json',
      }));
    } catch (err) {
      console.warn('[R2 Sync Error]:', err.message);
    }
  }
}

// Multer Storage for Payment Proof Screenshots
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only safe image files (PNG, JPG, JPEG, WEBP) are allowed.'));
    }
  },
});

// Helper: Upload Buffer to Cloudflare R2
async function uploadToR2(buffer, key, contentType) {
  if (!isR2Enabled || !s3Client) {
    const localPath = path.join(uploadDir, path.basename(key));
    fs.writeFileSync(localPath, buffer);
    return `/uploads/${path.basename(key)}`;
  }

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    if (publicDomain) {
      return `${publicDomain.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
  } catch (err) {
    console.error('R2 PutObject error, saving locally fallback:', err);
    const localPath = path.join(uploadDir, path.basename(key));
    fs.writeFileSync(localPath, buffer);
    return `/uploads/${path.basename(key)}`;
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Domains & Problem Statements
app.get('/api/domains', async (req, res) => {
  try {
    const db = await loadDb();
    res.json({ success: true, domains: db.domains });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Real-time UTR Uniqueness Verification
app.get('/api/verify-utr', utrLimiter, async (req, res) => {
  try {
    const utr = (req.query.utr || '').toString().trim();
    if (!utr) return res.json({ exists: false });

    const db = await loadDb();
    const existing = db.teams.find((t) => t.payment && t.payment.utr && t.payment.utr.trim().toLowerCase() === utr.toLowerCase());
    res.json({ exists: Boolean(existing), utr });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Squad Registration Endpoint
app.post('/api/register', regLimiter, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const {
      teamName,
      college,
      preferredDomain,
      teamSize,
      teamPassword,
      leaderName,
      leaderEmail,
      leaderPhone,
      paymentUtr,
      paymentPhone,
      members,
    } = req.body;

    if (!teamName || !college || !preferredDomain || !teamPassword || !leaderEmail || !paymentUtr) {
      return res.status(400).json({ success: false, error: 'Missing mandatory registration fields.' });
    }

    const cleanUtr = paymentUtr.trim();
    const db = await loadDb();

    // Enforce strictly UNIQUE UTR across all teams
    const duplicateUtr = db.teams.find(
      (t) => t.payment && t.payment.utr && t.payment.utr.trim().toLowerCase() === cleanUtr.toLowerCase()
    );
    if (duplicateUtr) {
      return res.status(409).json({
        success: false,
        error: `The UTR '${cleanUtr}' is already registered with another team. Every payment must have a unique UTR.`,
      });
    }

    // Process screenshot file
    let screenshotUrl = '/placeholder-receipt.png';
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.png';
      const key = `receipts/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      screenshotUrl = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    }

    // Parse teammates
    let parsedMembers = [];
    if (typeof members === 'string') {
      try {
        parsedMembers = JSON.parse(members);
      } catch (e) {
        parsedMembers = [];
      }
    } else if (Array.isArray(members)) {
      parsedMembers = members;
    }

    const parsedSize = parseInt(teamSize, 10) || (parsedMembers.length + 1);
    if (parsedSize < 3 || parsedSize > 4) {
      return res.status(400).json({ success: false, error: 'Squad size must be strictly 3 or 4 members.' });
    }

    // Construct squad record with secure password hash
    const teamId = `INF-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTeam = {
      id: teamId,
      teamName: teamName.trim(),
      college: college.trim(),
      preferredDomain,
      teamSize: parsedSize,
      teamPassword: hashPassword(teamPassword),
      leader: {
        name: leaderName.trim(),
        email: leaderEmail.trim().toLowerCase(),
        phone: leaderPhone ? leaderPhone.trim() : '',
      },
      members: parsedMembers,
      roomAllocated: 'TBA (Released with Problem Statements)',
      selectedProblemStatement: null,
      payment: {
        utr: cleanUtr,
        phone: paymentPhone ? paymentPhone.trim() : (leaderPhone ? leaderPhone.trim() : ''),
        screenshotUrl,
        submittedAt: new Date().toISOString(),
        amount: 300,
        status: 'pending',
      },
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    db.teams.push(newTeam);
    await saveDb(db);

    res.json({
      success: true,
      message: 'Registration successful! May the Infinity Stones guide your squad.',
      team: sanitizeTeam(newTeam),
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Leader Portal Login
app.post('/api/teams/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }
    const db = await loadDb();
    const cleanEmail = email.trim().toLowerCase();
    const team = db.teams.find((t) => t.leader && t.leader.email && t.leader.email.trim().toLowerCase() === cleanEmail);

    if (!team) {
      return res.status(404).json({ success: false, error: 'No squad registered with this leader email.' });
    }
    if (!verifyPassword(password, team.teamPassword)) {
      return res.status(401).json({ success: false, error: 'Incorrect team password.' });
    }

    const assignedDomain = db.domains.find((d) => d.id === team.preferredDomain) || db.domains[0];
    res.json({ success: true, team: sanitizeTeam(team), domainInfo: assignedDomain });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Leader Update Domain or Select 1 Problem Statement
app.post('/api/teams/update-selection', async (req, res) => {
  try {
    const { email, password, newDomainId, problemStatementId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Authentication credentials required.' });
    }

    const db = await loadDb();
    const cleanEmail = email.trim().toLowerCase();
    const team = db.teams.find((t) => t.leader.email.trim().toLowerCase() === cleanEmail);

    if (!team || !verifyPassword(password, team.teamPassword)) {
      return res.status(401).json({ success: false, error: 'Authentication failed.' });
    }

    // Change domain if specified
    if (newDomainId && db.domains.some((d) => d.id === newDomainId)) {
      team.preferredDomain = newDomainId;
      team.selectedProblemStatement = null; // reset if domain changed
    }

    const currentDomain = db.domains.find((d) => d.id === team.preferredDomain);

    // Select 1 Problem Statement if specified
    if (problemStatementId && currentDomain) {
      const ps = currentDomain.problemStatements.find(
        (p) => p.id === problemStatementId || p.code === problemStatementId
      );
      if (ps) {
        team.selectedProblemStatement = {
          id: ps.id,
          code: ps.code,
          title: ps.title,
          category: ps.category,
          selectedAt: new Date().toISOString(),
        };
      }
    }

    await saveDb(db);
    res.json({ success: true, team: sanitizeTeam(team), domainInfo: currentDomain });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Admin Authentication (Robust Clearance Token Response)
app.post('/api/admin/login', authLimiter, (req, res) => {
  try {
    const { password } = req.body || {};
    const secret = process.env.ADMIN_SECRET || 'admin123';

    if (!password) {
      return res.status(400).json({ success: false, error: 'Passphrase is required.' });
    }
    if (password === secret) {
      const token = generateAdminToken(secret);
      return res.status(200).json({ success: true, token, message: 'Organizer clearance granted.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid admin passphrase.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Admin Get All Teams
app.get('/api/admin/teams', requireAdminAuth, async (req, res) => {
  try {
    const db = await loadDb();
    const sanitized = db.teams.map((t) => sanitizeTeam(t));
    res.json({ success: true, teams: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Admin Edit ANYTHING of Team Details
app.put('/api/admin/teams/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = await loadDb();
    const idx = db.teams.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: `Squad ${id} not found.` });
    }

    // Merge updates deeply
    const existing = db.teams[idx];
    let updatedPassword = existing.teamPassword;
    if (updates.teamPassword !== undefined && updates.teamPassword !== '') {
      updatedPassword = updates.teamPassword.startsWith('pbkdf2$')
        ? updates.teamPassword
        : hashPassword(updates.teamPassword);
    }

    db.teams[idx] = {
      ...existing,
      teamName: updates.teamName !== undefined ? updates.teamName : existing.teamName,
      college: updates.college !== undefined ? updates.college : existing.college,
      preferredDomain: updates.preferredDomain !== undefined ? updates.preferredDomain : existing.preferredDomain,
      teamSize: updates.teamSize !== undefined ? updates.teamSize : existing.teamSize,
      teamPassword: updatedPassword,
      roomAllocated: updates.roomAllocated !== undefined ? updates.roomAllocated : (existing.roomAllocated || 'Unassigned'),
      selectedProblemStatement: updates.selectedProblemStatement !== undefined ? updates.selectedProblemStatement : existing.selectedProblemStatement,
      leader: {
        ...existing.leader,
        ...(updates.leader || {}),
      },
      payment: {
        ...existing.payment,
        ...(updates.payment || {}),
      },
      members: updates.members !== undefined ? updates.members : existing.members,
    };

    await saveDb(db);
    res.json({ success: true, team: sanitizeTeam(db.teams[idx]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backward-compatible patch route
app.patch('/api/admin/teams', requireAdminAuth, async (req, res) => {
  try {
    const { id, updates } = req.body;
    const db = await loadDb();
    const idx = db.teams.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Squad not found' });

    db.teams[idx] = {
      ...db.teams[idx],
      ...updates,
      payment: { ...db.teams[idx].payment, ...(updates.payment || {}) }
    };
    await saveDb(db);
    res.json({ success: true, team: sanitizeTeam(db.teams[idx]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Admin Delete Squad
app.delete('/api/admin/teams/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await loadDb();
    const prevLen = db.teams.length;
    db.teams = db.teams.filter((t) => t.id !== id);
    if (db.teams.length !== prevLen) {
      await saveDb(db);
      return res.json({ success: true, message: `Squad ${id} removed.` });
    }
    res.status(404).json({ success: false, error: 'Squad not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Also support query param for delete
app.delete('/api/admin/teams', requireAdminAuth, async (req, res) => {
  try {
    const id = req.query.id;
    const db = await loadDb();
    const prevLen = db.teams.length;
    db.teams = db.teams.filter((t) => t.id !== id);
    if (db.teams.length !== prevLen) {
      await saveDb(db);
      return res.json({ success: true, message: `Squad ${id} removed.` });
    }
    res.status(404).json({ success: false, error: 'Squad not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Admin Update Domains & Problem Statements
app.put('/api/admin/domains', requireAdminAuth, async (req, res) => {
  try {
    const updatedDomain = req.body;
    const db = await loadDb();
    const idx = db.domains.findIndex((d) => d.id === updatedDomain.id);
    if (idx >= 0) {
      db.domains[idx] = updatedDomain;
      await saveDb(db);
      return res.json({ success: true, domain: db.domains[idx] });
    }
    res.status(400).json({ success: false, error: 'Domain not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Admin Multi-Sheet Excel Export (.xlsx)
app.get('/api/admin/export', requireAdminAuth, async (req, res) => {
  try {
    const db = await loadDb();
    const teams = db.teams;

    // Sheet 1: Payments & Allocations
    const paymentRows = teams.map((t, idx) => ({
      'S.No': idx + 1,
      'Team ID': t.id,
      'Team Name': t.teamName,
      'College': t.college,
      'Domain': t.preferredDomain.toUpperCase() + ' STONE',
      'Room Allocated': t.roomAllocated || 'Unassigned',
      'Payment Status': (t.payment?.status || 'pending').toUpperCase(),
      'Payment UTR': t.payment?.utr || 'N/A',
      'Payment Phone': t.payment?.phone || 'N/A',
      'Selected Challenge': t.selectedProblemStatement ? `${t.selectedProblemStatement.code} - ${t.selectedProblemStatement.title}` : 'None Selected',
      'Proof Screenshot URL': t.payment?.screenshotUrl || 'N/A',
      'Registered At': new Date(t.createdAt).toLocaleString(),
    }));

    // Sheet 2: Full Teams & Member Rosters
    const teamRows = teams.map((t, idx) => {
      const row = {
        'S.No': idx + 1,
        'Team ID': t.id,
        'Team Name': t.teamName,
        'Domain': t.preferredDomain.toUpperCase() + ' STONE',
        'College': t.college,
        'Room Allocated': t.roomAllocated || 'Unassigned',
        'Team Size': t.teamSize,
        'Leader Name': t.leader?.name || '',
        'Leader Email': t.leader?.email || '',
        'Leader Phone': t.leader?.phone || '',
      };
      (t.members || []).forEach((m, mIdx) => {
        row[`Member ${mIdx + 2} Name`] = m.name;
        row[`Member ${mIdx + 2} Email`] = m.email;
        row[`Member ${mIdx + 2} Phone`] = m.phone;
        row[`Member ${mIdx + 2} College ID`] = m.collegeId || '';
      });
      return row;
    });

    const workbook = XLSX.utils.book_new();
    const pSheet = XLSX.utils.json_to_sheet(paymentRows);
    XLSX.utils.book_append_sheet(workbook, pSheet, 'Payments & Rooms');
    const tSheet = XLSX.utils.json_to_sheet(teamRows);
    XLSX.utils.book_append_sheet(workbook, tSheet, 'Full Team Rosters');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="infinity_hackathon_squads_${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated URL route for Admin Portal
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Single Page Application Fallback for Home and Leader Portal
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Infinity Hackathon 2026] Server running on http://localhost:${PORT}`);
  console.log(`[Admin Portal Route] Access organizer console at http://localhost:${PORT}/admin`);
});
