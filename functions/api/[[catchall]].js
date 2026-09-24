import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

// Default / fallback configurations
const DEFAULT_ACCOUNT_ID = '69bba0cb37d6435b937a6e480164c7b3';
const DEFAULT_ACCESS_KEY = '5e3529888b0684be7ba2da3fe4cbfcf5';
const DEFAULT_SECRET_KEY = 'a4761934b0edbaf6ff2344788d9d302a7121e491184c845a25a930caaa23650a';
const DEFAULT_BUCKET = 'infinity-hackathon-bucket';
const DEFAULT_PUBLIC_DOMAIN = 'https://pub-aa1b426e7ec64c31a70bdd49676fdec1.r2.dev';
const R2_DB_KEY = 'state/database.json';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function getS3Client(env) {
  const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID || DEFAULT_ACCESS_KEY;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || DEFAULT_SECRET_KEY;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function loadDb(env) {
  // 1. Try Native R2 Binding
  if (env.BUCKET) {
    try {
      const obj = await env.BUCKET.get(R2_DB_KEY);
      if (obj) {
        const text = await obj.text();
        const parsed = JSON.parse(text);
        if (parsed.domains && parsed.teams) return parsed;
      }
    } catch (err) {
      console.warn('Native R2 get failed, trying S3 API:', err);
    }
  }

  // 2. Try S3 API client
  try {
    const s3 = getS3Client(env);
    const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || DEFAULT_BUCKET;
    const res = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: R2_DB_KEY }));
    if (res.Body) {
      const text = await res.Body.transformToString();
      const parsed = JSON.parse(text);
      if (parsed.domains && parsed.teams) return parsed;
    }
  } catch (err) {
    console.warn('S3 client get failed:', err);
  }

  // Fallback initial structure
  return {
    domains: [
      {
        id: 'intelligence',
        stoneName: 'Mind Stone',
        domainName: 'INTELLIGENCE',
        tagline: 'AI • ML • Decision Systems',
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
            description: 'Build an autonomous team of specialized AI agents that debate trade-offs, execute verification loops, and generate verified artifact packages.',
            difficulty: 'Advanced',
            deliverables: ['Interactive agent trace visualizer UI', 'Self-correcting verification testbench', 'Multi-modal decision engine integration']
          }
        ]
      },
      {
        id: 'connectivity',
        stoneName: 'Space Stone',
        domainName: 'CONNECTIVITY',
        tagline: 'Cybersecurity • Cloud • Networks',
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
            description: 'Design a self-healing reverse proxy and global routing daemon that dynamically migrates stateful traffic across multiple cloud providers.',
            difficulty: 'Hardcore',
            deliverables: ['Lightweight edge proxy agent', 'Zero-loss connection migration benchmark', 'Real-time threat detection rules']
          }
        ]
      },
      {
        id: 'digital',
        stoneName: 'Reality Stone',
        domainName: 'DIGITAL',
        tagline: 'Web • Mobile • Digital Platforms',
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
            description: 'Construct a browser-based and mobile-first real-time workspace enabling multi-user manipulation of high-fidelity state.',
            difficulty: 'Advanced',
            deliverables: ['Interactive collaboration UI', 'Sub-30ms CRDT state synchronization', 'Offline-first progressive synchronization']
          }
        ]
      },
      {
        id: 'automation',
        stoneName: 'Power Stone',
        domainName: 'AUTOMATION',
        tagline: 'IoT • Robotics • Embedded Systems',
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
            description: 'Develop a microsecond telemetry agent and swarm control hub that continuously coordinates robotic actuators and IoT sensors.',
            difficulty: 'Hardcore',
            deliverables: ['Simulation telemetry interface', 'Autonomous failover daemon', 'Real-time metrics visualizer']
          }
        ]
      },
      {
        id: 'analytics',
        stoneName: 'Time Stone',
        domainName: 'ANALYTICS',
        tagline: 'Data • Prediction • Optimization',
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
            title: 'Distributed Real-Time Temporal Anomaly Engine & Graph Query Accelerator',
            category: 'Data Engineering & Analytics',
            description: 'Architect a sub-second distributed pipeline processing time-series streams with graph traversal.',
            difficulty: 'Hardcore',
            deliverables: ['Streaming telemetry ingestion engine', 'Interactive graph query dashboard', 'Predictive bottleneck alert daemon']
          }
        ]
      },
      {
        id: 'impact',
        stoneName: 'Soul Stone',
        domainName: 'IMPACT',
        tagline: 'Healthcare • Agriculture • Education • Social Good',
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
            description: 'Construct a privacy-preserving triage engine and sensor aggregation hub for underserved rural communities.',
            difficulty: 'Advanced',
            deliverables: ['Offline-first PWA application', 'Differential-privacy telemetry dashboard', 'SMS/WhatsApp fallback alerting']
          }
        ]
      }
    ],
    teams: []
  };
}

async function saveDb(data, env) {
  const jsonString = JSON.stringify(data, null, 2);

  // 1. Try Native R2 Binding
  if (env.BUCKET) {
    try {
      await env.BUCKET.put(R2_DB_KEY, jsonString, {
        httpMetadata: { contentType: 'application/json' },
      });
      return;
    } catch (err) {
      console.warn('Native R2 put failed, attempting S3 API:', err);
    }
  }

  // 2. Try S3 API client
  try {
    const s3 = getS3Client(env);
    const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || DEFAULT_BUCKET;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: R2_DB_KEY,
      Body: jsonString,
      ContentType: 'application/json',
    }));
  } catch (err) {
    console.error('Failed to save database to R2:', err);
  }
}

async function uploadFileToR2(arrayBuffer, key, contentType, env) {
  const publicDomain = (env.CLOUDFLARE_R2_PUBLIC_DOMAIN || DEFAULT_PUBLIC_DOMAIN).replace(/\/$/, '');

  // 1. Try Native R2 Binding
  if (env.BUCKET) {
    try {
      await env.BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType },
      });
      return `${publicDomain}/${key}`;
    } catch (err) {
      console.warn('Native R2 put failed for asset, trying S3 API:', err);
    }
  }

  // 2. S3 API fallback
  try {
    const s3 = getS3Client(env);
    const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || DEFAULT_BUCKET;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: contentType,
    }));
    return `${publicDomain}/${key}`;
  } catch (err) {
    console.error('Error uploading file to R2:', err);
    return '/placeholder-receipt.png';
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // 1. GET /api/domains
    if (pathname === '/api/domains' && method === 'GET') {
      const db = await loadDb(env);
      return jsonResponse({ success: true, domains: db.domains });
    }

    // 2. GET /api/verify-utr
    if (pathname === '/api/verify-utr' && method === 'GET') {
      const utr = (url.searchParams.get('utr') || '').trim();
      if (!utr) return jsonResponse({ exists: false });

      const db = await loadDb(env);
      const existing = db.teams.find(
        (t) => t.payment && t.payment.utr && t.payment.utr.trim().toLowerCase() === utr.toLowerCase()
      );
      return jsonResponse({ exists: Boolean(existing), utr });
    }

    // 3. POST /api/register
    if (pathname === '/api/register' && method === 'POST') {
      let fields = {};
      let fileBuffer = null;
      let fileType = 'image/png';
      let fileName = 'receipt.png';

      const contentTypeHeader = request.headers.get('content-type') || '';
      if (contentTypeHeader.includes('multipart/form-data')) {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          if (key === 'paymentScreenshot' && typeof value === 'object' && value.name) {
            fileBuffer = await value.arrayBuffer();
            fileType = value.type || 'image/png';
            fileName = value.name || 'receipt.png';
          } else {
            fields[key] = value;
          }
        }
      } else {
        fields = await request.json().catch(() => ({}));
      }

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
      } = fields;

      if (!teamName || !college || !preferredDomain || !teamPassword || !leaderEmail || !paymentUtr) {
        return jsonResponse({ success: false, error: 'Missing mandatory registration fields.' }, 400);
      }

      const cleanUtr = paymentUtr.trim();
      const db = await loadDb(env);

      // Check duplicate UTR
      const duplicateUtr = db.teams.find(
        (t) => t.payment && t.payment.utr && t.payment.utr.trim().toLowerCase() === cleanUtr.toLowerCase()
      );
      if (duplicateUtr) {
        return jsonResponse(
          {
            success: false,
            error: `The UTR '${cleanUtr}' is already registered with another team. Every payment must have a unique UTR.`,
          },
          409
        );
      }

      // Upload screenshot to R2 if provided
      let screenshotUrl = '/placeholder-receipt.png';
      if (fileBuffer && fileBuffer.byteLength > 0) {
        const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '.png';
        const key = `receipts/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        screenshotUrl = await uploadFileToR2(fileBuffer, key, fileType, env);
      }

      // Teammate parsing
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
        return jsonResponse({ success: false, error: 'Squad size must be strictly 3 or 4 members.' }, 400);
      }

      const teamId = `INF-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTeam = {
        id: teamId,
        teamName: teamName.trim(),
        college: college.trim(),
        preferredDomain,
        teamSize: parsedSize,
        teamPassword,
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
      await saveDb(db, env);

      return jsonResponse({
        success: true,
        message: 'Registration successful! May the Infinity Stones guide your squad.',
        team: newTeam,
      });
    }

    // 4. POST /api/teams/login
    if (pathname === '/api/teams/login' && method === 'POST') {
      const { email, password } = await request.json().catch(() => ({}));
      if (!email || !password) {
        return jsonResponse({ success: false, error: 'Email and password are required.' }, 400);
      }
      const db = await loadDb(env);
      const cleanEmail = email.trim().toLowerCase();
      const team = db.teams.find((t) => t.leader && t.leader.email && t.leader.email.trim().toLowerCase() === cleanEmail);

      if (!team) {
        return jsonResponse({ success: false, error: 'No squad registered with this leader email.' }, 404);
      }
      if (team.teamPassword !== password) {
        return jsonResponse({ success: false, error: 'Incorrect team password.' }, 401);
      }

      const assignedDomain = db.domains.find((d) => d.id === team.preferredDomain) || db.domains[0];
      return jsonResponse({ success: true, team, domainInfo: assignedDomain });
    }

    // 5. POST /api/teams/update-selection
    if (pathname === '/api/teams/update-selection' && method === 'POST') {
      const { email, password, newDomainId, problemStatementId } = await request.json().catch(() => ({}));
      if (!email || !password) {
        return jsonResponse({ success: false, error: 'Authentication credentials required.' }, 400);
      }

      const db = await loadDb(env);
      const cleanEmail = email.trim().toLowerCase();
      const team = db.teams.find((t) => t.leader.email.trim().toLowerCase() === cleanEmail);

      if (!team || team.teamPassword !== password) {
        return jsonResponse({ success: false, error: 'Authentication failed.' }, 401);
      }

      if (newDomainId && db.domains.some((d) => d.id === newDomainId)) {
        team.preferredDomain = newDomainId;
        team.selectedProblemStatement = null;
      }

      const currentDomain = db.domains.find((d) => d.id === team.preferredDomain);

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

      await saveDb(db, env);
      return jsonResponse({ success: true, team, domainInfo: currentDomain });
    }

    // 6. POST /api/admin/login
    if (pathname === '/api/admin/login' && method === 'POST') {
      const { password } = await request.json().catch(() => ({}));
      const secret = env.ADMIN_SECRET || 'admin123';

      if (!password) {
        return jsonResponse({ success: false, error: 'Passphrase is required.' }, 400);
      }
      if (password === secret) {
        const token = btoa(`admin_clearance_${Date.now()}`);
        return jsonResponse({ success: true, token, message: 'Organizer clearance granted.' }, 200);
      }
      return jsonResponse({ success: false, error: 'Invalid admin passphrase.' }, 401);
    }

    // 7. GET /api/admin/teams
    if (pathname === '/api/admin/teams' && method === 'GET') {
      const db = await loadDb(env);
      return jsonResponse({ success: true, teams: db.teams });
    }

    // 8. PUT /api/admin/teams/:id
    if (pathname.startsWith('/api/admin/teams/') && method === 'PUT') {
      const teamId = pathname.replace('/api/admin/teams/', '');
      const updates = await request.json().catch(() => ({}));
      const db = await loadDb(env);
      const idx = db.teams.findIndex((t) => t.id === teamId);

      if (idx === -1) {
        return jsonResponse({ success: false, error: `Squad ${teamId} not found.` }, 404);
      }

      const existing = db.teams[idx];
      db.teams[idx] = {
        ...existing,
        teamName: updates.teamName !== undefined ? updates.teamName : existing.teamName,
        college: updates.college !== undefined ? updates.college : existing.college,
        preferredDomain: updates.preferredDomain !== undefined ? updates.preferredDomain : existing.preferredDomain,
        teamSize: updates.teamSize !== undefined ? updates.teamSize : existing.teamSize,
        teamPassword: updates.teamPassword !== undefined ? updates.teamPassword : existing.teamPassword,
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

      await saveDb(db, env);
      return jsonResponse({ success: true, team: db.teams[idx] });
    }

    // PATCH /api/admin/teams
    if (pathname === '/api/admin/teams' && method === 'PATCH') {
      const { id, updates } = await request.json().catch(() => ({}));
      const db = await loadDb(env);
      const idx = db.teams.findIndex((t) => t.id === id);
      if (idx === -1) return jsonResponse({ success: false, error: 'Squad not found' }, 404);

      db.teams[idx] = {
        ...db.teams[idx],
        ...updates,
        payment: { ...db.teams[idx].payment, ...(updates?.payment || {}) }
      };
      await saveDb(db, env);
      return jsonResponse({ success: true, team: db.teams[idx] });
    }

    // 9. DELETE /api/admin/teams/:id or DELETE /api/admin/teams?id=...
    if ((pathname.startsWith('/api/admin/teams/') || pathname === '/api/admin/teams') && method === 'DELETE') {
      const id = pathname.startsWith('/api/admin/teams/')
        ? pathname.replace('/api/admin/teams/', '')
        : url.searchParams.get('id');

      const db = await loadDb(env);
      const prevLen = db.teams.length;
      db.teams = db.teams.filter((t) => t.id !== id);
      if (db.teams.length !== prevLen) {
        await saveDb(db, env);
        return jsonResponse({ success: true, message: `Squad ${id} removed.` });
      }
      return jsonResponse({ success: false, error: 'Squad not found' }, 404);
    }

    // 10. PUT /api/admin/domains
    if (pathname === '/api/admin/domains' && method === 'PUT') {
      const updatedDomain = await request.json().catch(() => ({}));
      const db = await loadDb(env);
      const idx = db.domains.findIndex((d) => d.id === updatedDomain.id);
      if (idx >= 0) {
        db.domains[idx] = updatedDomain;
        await saveDb(db, env);
        return jsonResponse({ success: true, domain: db.domains[idx] });
      }
      return jsonResponse({ success: false, error: 'Domain not found' }, 400);
    }

    // 11. GET /api/admin/export
    if (pathname === '/api/admin/export' && method === 'GET') {
      const db = await loadDb(env);
      const teams = db.teams;

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
        'Selected Challenge': t.selectedProblemStatement
          ? `${t.selectedProblemStatement.code} - ${t.selectedProblemStatement.title}`
          : 'None Selected',
        'Proof Screenshot URL': t.payment?.screenshotUrl || 'N/A',
        'Registered At': new Date(t.createdAt).toLocaleString(),
      }));

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

      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

      return new Response(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="infinity_hackathon_squads_${Date.now()}.xlsx"`,
          ...CORS_HEADERS,
        },
      });
    }

    return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);
  } catch (err) {
    console.error('API Error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
