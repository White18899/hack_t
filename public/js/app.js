// =======================================================
// INFINITY HACKATHON 2026 — CLIENT APPLICATION CONTROLLER
// =======================================================

let allDomains = [];
let allTeams = [];
let selectedReceiptFile = null;

// ==========================================
// 1. INITIALIZATION & COUNTDOWN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  loadDomains();
  initRegistration();
  initFaqAccordion();
  initPortal();
  initAdmin();
});

function initCountdown() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 18);
  targetDate.setHours(9, 0, 0, 0);

  function update() {
    const diff = targetDate.getTime() - new Date().getTime();
    if (diff > 0) {
      document.getElementById('clock-days').innerText = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
      document.getElementById('clock-hours').innerText = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
      document.getElementById('clock-mins').innerText = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      document.getElementById('clock-secs').innerText = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
    }
  }
  update();
  setInterval(update, 1000);
}

// ==========================================
// 2. DOMAINS RENDERING
// ==========================================
async function loadDomains() {
  try {
    const res = await fetch('/api/domains');
    const data = await res.json();
    if (data.success && data.domains) {
      allDomains = data.domains;
      renderDomainsGrid();
    }
  } catch (err) {
    console.error('Error fetching domains:', err);
  }
}

function renderDomainsGrid() {
  const container = document.getElementById('domains-grid');
  if (!container) return;

  container.innerHTML = allDomains.map((d) => {
    const isLive = d.isPsReleased;
    const ps = d.problemStatements[0] || {};

    return `
      <div class="glass-panel" style="display: flex; flex-direction: column; justify-content: space-between; padding: 28px; background: rgba(12, 12, 16, 0.75);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <div class="font-mono" style="font-size: 0.7rem; color: #a1a1aa; text-transform: uppercase;">${d.stoneSymbol}</div>
              <div style="font-weight: 700; font-size: 1rem; color: #fff;">${d.stoneName}</div>
            </div>
            <span class="badge" style="${isLive ? 'background: rgba(255,255,255,0.1); color: #fff;' : 'color: #a1a1aa;'}">
              ${isLive ? '🔓 PS LIVE' : '🔒 LOCKED'}
            </span>
          </div>

          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #fff;">${d.domainName}</h3>
          <p style="font-size: 0.85rem; color: #a1a1aa; line-height: 1.6; margin-bottom: 16px;">${d.description}</p>

          <div style="margin-bottom: 20px;">
            <div class="font-mono" style="font-size: 0.68rem; color: #71717a; text-transform: uppercase; margin-bottom: 6px;">Recommended Arsenal:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${d.techStackSuggestions.map(t => `<span class="badge" style="font-size: 0.65rem; padding: 2px 6px;">${t}</span>`).join('')}
            </div>
          </div>

          <div style="padding: 12px; border-radius: 6px; background: ${isLive ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)'}; border: 1px solid ${isLive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}; margin-bottom: 20px;">
            ${isLive ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span class="font-mono" style="font-size: 0.72rem; color: #fff; font-weight: 600;">${ps.code || 'PS AVAILABLE'}</span>
                <span class="badge" style="font-size: 0.6rem; padding: 1px 5px;">${ps.difficulty || 'Advanced'}</span>
              </div>
              <div style="font-weight: 600; font-size: 0.84rem; color: #fff;">${ps.title || ''}</div>
              <p style="font-size: 0.78rem; color: #a1a1aa; margin-top: 4px;">${ps.description ? ps.description.slice(0, 110) + '...' : ''}</p>
            ` : `
              <div style="font-size: 0.78rem; color: #71717a;">
                🔒 Decryption in progress. Official Problem Statements unlock 48h before the hackathon.
              </div>
            `}
          </div>
        </div>

        <button class="btn btn-secondary" style="width: 100%; justify-content: space-between;" onclick="openRegisterModal('${d.id}')">
          <span style="font-size: 0.84rem;">Register for ${d.stoneName}</span>
          <span>→</span>
        </button>
      </div>
    `;
  }).join('');
}

// ==========================================
// 3. REGISTRATION MODAL & OCR ENGINE
// ==========================================
function initRegistration() {
  document.getElementById('open-register-btn')?.addEventListener('click', () => openRegisterModal());
  document.getElementById('hero-register-btn')?.addEventListener('click', () => openRegisterModal());

  const teamSizeSelect = document.getElementById('reg-team-size');
  teamSizeSelect?.addEventListener('change', (e) => {
    updateDynamicMembers(parseInt(e.target.value, 10));
  });
  updateDynamicMembers(3);

  // Real-time UTR Uniqueness Check on blur
  const utrInput = document.getElementById('reg-payment-utr');
  utrInput?.addEventListener('blur', () => checkUtrUniqueness(utrInput.value));

  // Dropzone Setup
  const dropzone = document.getElementById('receipt-dropzone');
  const fileInput = document.getElementById('receipt-file-input');

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleReceiptUpload(e.target.files[0]);
    }
  });

  // Drag and drop
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255,255,255,0.6)';
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(255,255,255,0.25)';
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255,255,255,0.25)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReceiptUpload(e.dataTransfer.files[0]);
    }
  });

  // Form Submission
  const form = document.getElementById('squad-registration-form');
  form?.addEventListener('submit', handleRegistrationSubmit);
}

function openRegisterModal(preferredDomain = 'space') {
  const domainSelect = document.getElementById('reg-domain');
  if (domainSelect) domainSelect.value = preferredDomain;

  document.getElementById('reg-form-container').style.display = 'block';
  document.getElementById('reg-success-container').style.display = 'none';
  document.getElementById('reg-error-msg').style.display = 'none';

  openModal('registration-modal');
}

function updateDynamicMembers(size) {
  const container = document.getElementById('dynamic-members-container');
  if (!container) return;

  const validSize = Math.min(Math.max(parseInt(size, 10) || 3, 3), 4);
  const count = validSize - 1; // Leader is member 1
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
        <div class="font-mono" style="font-size: 0.7rem; color: #a1a1aa; margin-bottom: 8px;">MEMBER ${i + 2} DETAILS</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          <input type="text" class="input-field mem-name" placeholder="Member ${i + 2} Name" required>
          <input type="email" class="input-field mem-email" placeholder="Member ${i + 2} Email" required>
          <input type="tel" class="input-field mem-phone" placeholder="Member ${i + 2} Phone" required>
          <input type="text" class="input-field mem-collegeId" placeholder="College ID (Optional)">
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// Client-Side AI OCR Processing via Tesseract.js
async function handleReceiptUpload(file) {
  selectedReceiptFile = file;

  const promptDiv = document.getElementById('dropzone-prompt');
  const scanningDiv = document.getElementById('dropzone-scanning');
  const previewDiv = document.getElementById('dropzone-preview');
  const previewImg = document.getElementById('preview-img');
  const filenameTag = document.getElementById('preview-filename');

  promptDiv.style.display = 'none';
  scanningDiv.style.display = 'block';
  previewDiv.style.display = 'none';

  try {
    previewImg.src = URL.createObjectURL(file);
    filenameTag.innerText = file.name;

    // Run Tesseract OCR in browser
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(file);
    const text = ret.data.text || '';
    await worker.terminate();

    // 1. Extract 12-Digit UTR
    const utrRegexes = [
      /(?:UTR|UPI\s*Ref|Ref(?:erence)?\s*No|Bank\s*Ref|Txn\s*ID|Transaction\s*ID)[\s:#-]*([0-9]{12})\b/i,
      /\b([0-9]{12})\b/
    ];
    let detectedUtr = null;
    for (const r of utrRegexes) {
      const match = text.match(r);
      if (match && match[1]) {
        detectedUtr = match[1];
        break;
      }
    }

    // 2. Extract Phone Number
    const phoneRegexes = [
      /(?:Mobile|Phone|Paid\s*to|From|Number|No)[\s:#-]*(?:\+?91[\s-]?)?([6-9]\d{9})\b/i,
      /(?:\+?91[\s-]?)?([6-9]\d{9})\b/
    ];
    let detectedPhone = null;
    for (const r of phoneRegexes) {
      const match = text.match(r);
      if (match && match[1] && match[1] !== detectedUtr) {
        detectedPhone = match[1];
        break;
      }
    }

    if (detectedUtr) {
      document.getElementById('reg-payment-utr').value = detectedUtr;
      checkUtrUniqueness(detectedUtr);
    }
    if (detectedPhone) {
      document.getElementById('reg-payment-phone').value = detectedPhone;
    }

    scanningDiv.style.display = 'none';
    previewDiv.style.display = 'flex';
  } catch (err) {
    console.error('OCR scan failed:', err);
    scanningDiv.style.display = 'none';
    previewDiv.style.display = 'flex';
  }
}

async function checkUtrUniqueness(utr) {
  const alertDiv = document.getElementById('utr-conflict-alert');
  if (!utr || utr.trim().length < 6) {
    alertDiv.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/verify-utr?utr=${encodeURIComponent(utr.trim())}`);
    const data = await res.json();
    if (data.exists) {
      alertDiv.innerText = `⚠ UTR '${utr}' is already registered. UTR must be strictly unique!`;
      alertDiv.style.display = 'block';
    } else {
      alertDiv.style.display = 'none';
    }
  } catch (err) {
    alertDiv.style.display = 'none';
  }
}

async function handleRegistrationSubmit(e) {
  e.preventDefault();
  const errorBox = document.getElementById('reg-error-msg');
  const submitBtn = document.getElementById('submit-reg-btn');
  errorBox.style.display = 'none';

  const utrAlert = document.getElementById('utr-conflict-alert');
  if (utrAlert && utrAlert.style.display !== 'none') {
    errorBox.innerText = 'Please resolve the duplicate UTR conflict before submitting.';
    errorBox.style.display = 'block';
    return;
  }

  const teamSizeVal = parseInt(document.getElementById('reg-team-size').value, 10);
  if (teamSizeVal < 3 || teamSizeVal > 4) {
    errorBox.innerText = 'Squad size must be strictly 3 or 4 hackers.';
    errorBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Transmitting to Cloudflare R2...';

  try {
    const formData = new FormData();
    formData.append('teamName', document.getElementById('reg-team-name').value);
    formData.append('college', document.getElementById('reg-college').value);
    formData.append('preferredDomain', document.getElementById('reg-domain').value);
    formData.append('teamSize', document.getElementById('reg-team-size').value);
    formData.append('teamPassword', document.getElementById('reg-team-password').value);

    formData.append('leaderName', document.getElementById('reg-leader-name').value);
    formData.append('leaderEmail', document.getElementById('reg-leader-email').value);
    formData.append('leaderPhone', document.getElementById('reg-leader-phone').value);

    formData.append('paymentUtr', document.getElementById('reg-payment-utr').value);
    formData.append('paymentPhone', document.getElementById('reg-payment-phone').value);

    // Teammates JSON
    const names = document.querySelectorAll('.mem-name');
    const emails = document.querySelectorAll('.mem-email');
    const phones = document.querySelectorAll('.mem-phone');
    const collegeIds = document.querySelectorAll('.mem-collegeId');
    const members = [];

    for (let i = 0; i < names.length; i++) {
      members.push({
        name: names[i].value,
        email: emails[i].value,
        phone: phones[i].value,
        collegeId: collegeIds[i]?.value || ''
      });
    }
    formData.append('members', JSON.stringify(members));

    if (selectedReceiptFile) {
      formData.append('paymentScreenshot', selectedReceiptFile);
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed');
    }

    // Success Confetti
    if (window.confetti) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    // Show Success View
    document.getElementById('success-team-id').innerText = data.team.id;
    document.getElementById('success-team-name').innerText = data.team.teamName;
    document.getElementById('success-team-domain').innerText = data.team.preferredDomain.toUpperCase() + ' STONE';
    document.getElementById('success-team-email').innerText = data.team.leader.email;

    document.getElementById('reg-form-container').style.display = 'none';
    document.getElementById('reg-success-container').style.display = 'block';
  } catch (err) {
    errorBox.innerText = err.message;
    errorBox.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Complete Squad Registration →';
  }
}

// ==========================================
// 4. TEAM LEADER PORTAL
// ==========================================
function initPortal() {
  document.getElementById('open-portal-btn')?.addEventListener('click', () => {
    document.getElementById('portal-login-view').style.display = 'block';
    document.getElementById('portal-dashboard-view').style.display = 'none';
    document.getElementById('portal-error-msg').style.display = 'none';
    openModal('portal-modal');
  });

  const form = document.getElementById('portal-login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('portal-error-msg');
    errorBox.style.display = 'none';

    const email = document.getElementById('portal-email').value;
    const password = document.getElementById('portal-password').value;

    try {
      const res = await fetch('/api/teams/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Authentication failed');

      // Populate Dashboard View
      const team = data.team;
      const domain = data.domainInfo;

      document.getElementById('p-team-id').innerText = team.id;
      document.getElementById('p-team-domain').innerText = team.preferredDomain.toUpperCase() + ' STONE';
      document.getElementById('p-team-name').innerText = team.teamName;
      document.getElementById('p-team-college').innerText = `${team.college} • Squad of ${team.teamSize} Hackers`;

      const pStatus = document.getElementById('p-payment-status');
      pStatus.innerText = team.payment.status.toUpperCase();
      pStatus.style.color = team.payment.status === 'verified' ? '#86efac' : team.payment.status === 'rejected' ? '#fca5a5' : '#fde047';

      // PS Info
      const psContent = document.getElementById('p-ps-content');
      if (domain && domain.isPsReleased) {
        const ps = domain.problemStatements[0] || {};
        psContent.innerHTML = `
          <div style="font-weight: 700; font-size: 1.1rem; color: #fff; margin-bottom: 4px;">${ps.title || ''}</div>
          <div class="badge" style="margin-bottom: 8px;">${ps.code} • ${ps.difficulty}</div>
          <p style="color: #d4d4d8; font-size: 0.85rem; line-height: 1.6;">${ps.description || ''}</p>
        `;
      } else {
        psContent.innerHTML = `
          <div style="text-align: center; padding: 20px 0; color: #71717a;">
            🔒 Problem Statements are encrypted. Challenges decrypt 48h before kickoff.
          </div>
        `;
      }

      // Roster
      const rosterList = document.getElementById('p-members-list');
      let rosterHtml = `
        <div style="padding: 8px 12px; background: rgba(255,255,255,0.04); border-radius: 4px;">
          <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">${team.leader.name} (Leader)</div>
          <div style="font-size: 0.75rem; color: #a1a1aa;">${team.leader.email} • ${team.leader.phone}</div>
        </div>
      `;
      team.members.forEach(m => {
        rosterHtml += `
          <div style="padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 4px;">
            <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">${m.name}</div>
            <div style="font-size: 0.75rem; color: #a1a1aa;">${m.email} • ${m.phone}</div>
          </div>
        `;
      });
      rosterList.innerHTML = rosterHtml;

      document.getElementById('portal-login-view').style.display = 'none';
      document.getElementById('portal-dashboard-view').style.display = 'block';
    } catch (err) {
      errorBox.innerText = err.message;
      errorBox.style.display = 'block';
    }
  });
}

function logoutPortal() {
  document.getElementById('portal-login-view').style.display = 'block';
  document.getElementById('portal-dashboard-view').style.display = 'none';
  document.getElementById('portal-password').value = '';
}

// ==========================================
// 5. ORGANIZER ADMIN CONSOLE
// ==========================================
function initAdmin() {
  document.getElementById('open-admin-btn')?.addEventListener('click', () => {
    document.getElementById('admin-login-view').style.display = 'block';
    document.getElementById('admin-dashboard-view').style.display = 'none';
    document.getElementById('admin-login-error').style.display = 'none';
    openModal('admin-modal');
  });

  const form = document.getElementById('admin-login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('admin-login-error');
    errorBox.style.display = 'none';

    const password = document.getElementById('admin-password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Invalid passphrase');

      document.getElementById('admin-login-view').style.display = 'none';
      document.getElementById('admin-dashboard-view').style.display = 'block';
      loadAdminData();
    } catch (err) {
      errorBox.innerText = err.message;
      errorBox.style.display = 'block';
    }
  });

  // Search & Filters
  document.getElementById('admin-search-input')?.addEventListener('input', renderAdminTeamsTable);
  document.getElementById('admin-filter-domain')?.addEventListener('change', renderAdminTeamsTable);
  document.getElementById('admin-filter-payment')?.addEventListener('change', renderAdminTeamsTable);

  // Excel Download
  document.getElementById('admin-export-btn')?.addEventListener('click', () => {
    window.location.href = '/api/admin/export';
  });
}

async function loadAdminData() {
  try {
    const res = await fetch('/api/admin/teams');
    const data = await res.json();
    if (data.success) {
      allTeams = data.teams;
      renderAdminTeamsTable();
    }
    renderAdminDomainsList();
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

function renderAdminTeamsTable() {
  const tbody = document.getElementById('admin-teams-tbody');
  if (!tbody) return;

  const query = (document.getElementById('admin-search-input')?.value || '').toLowerCase();
  const filterDomain = document.getElementById('admin-filter-domain')?.value || 'all';
  const filterPayment = document.getElementById('admin-filter-payment')?.value || 'all';

  const filtered = allTeams.filter(t => {
    const mQuery = t.teamName.toLowerCase().includes(query) ||
                   t.id.toLowerCase().includes(query) ||
                   t.leader.email.toLowerCase().includes(query) ||
                   t.payment.utr.toLowerCase().includes(query);
    const mDomain = filterDomain === 'all' || t.preferredDomain === filterDomain;
    const mPayment = filterPayment === 'all' || t.payment.status === filterPayment;
    return mQuery && mDomain && mPayment;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #71717a;">No squads match query.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td>
        <div class="font-mono" style="font-size: 0.72rem; color: #71717a;">${t.id}</div>
        <div style="font-weight: 700; color: #fff;">${t.teamName}</div>
      </td>
      <td><span class="badge" style="font-size: 0.65rem;">${t.preferredDomain}</span></td>
      <td>
        <div style="font-weight: 600;">${t.leader.name}</div>
        <div style="font-size: 0.72rem; color: #a1a1aa;">${t.leader.email}</div>
      </td>
      <td>
        <div class="font-mono" style="font-weight: 600; color: #fff;">${t.payment.utr}</div>
        ${t.payment.screenshotUrl ? `<a href="${t.payment.screenshotUrl}" target="_blank" style="color: #fff; font-size: 0.7rem; text-decoration: underline;">View Proof</a>` : ''}
      </td>
      <td>
        <select class="select-field font-mono" style="padding: 4px 8px; font-size: 0.75rem; width: auto;" onchange="updatePaymentStatus('${t.id}', this.value)">
          <option value="pending" ${t.payment.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="verified" ${t.payment.status === 'verified' ? 'selected' : ''}>Verified</option>
          <option value="rejected" ${t.payment.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm font-mono" style="padding: 4px 8px; color: #fca5a5; border-color: rgba(255,80,80,0.3);" onclick="deleteSquad('${t.id}', '${t.teamName}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function updatePaymentStatus(teamId, status) {
  try {
    const res = await fetch('/api/admin/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: teamId, updates: { payment: { status } } }),
    });
    const data = await res.json();
    if (data.success) {
      allTeams = allTeams.map(t => t.id === teamId ? data.team : t);
      renderAdminTeamsTable();
    }
  } catch (err) {
    alert('Failed to update status');
  }
}

async function deleteSquad(teamId, teamName) {
  if (!confirm(`Delete squad "${teamName}" (${teamId})?`)) return;
  try {
    const res = await fetch(`/api/admin/teams?id=${teamId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      allTeams = allTeams.filter(t => t.id !== teamId);
      renderAdminTeamsTable();
    }
  } catch (err) {
    alert('Failed to delete squad');
  }
}

function renderAdminDomainsList() {
  const container = document.getElementById('admin-domains-list');
  if (!container) return;

  container.innerHTML = allDomains.map(d => `
    <div class="glass-panel" style="padding: 20px; background: rgba(12,12,16,0.75);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span class="badge">${d.stoneName}</span>
        <button class="btn btn-sm ${d.isPsReleased ? 'btn-primary' : 'btn-outline'}" onclick="togglePsRelease('${d.id}')">
          ${d.isPsReleased ? '🔓 PS LIVE' : '🔒 PS LOCKED'}
        </button>
      </div>
      <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">${d.domainName}</div>
      <p style="font-size: 0.8rem; color: #a1a1aa; margin-bottom: 12px;">${d.description.slice(0, 100)}...</p>
      <div class="font-mono" style="font-size: 0.7rem; color: #fff;">${d.problemStatements[0]?.title || 'No PS Defined'}</div>
    </div>
  `).join('');
}

async function togglePsRelease(domainId) {
  const domain = allDomains.find(d => d.id === domainId);
  if (!domain) return;
  domain.isPsReleased = !domain.isPsReleased;

  try {
    const res = await fetch('/api/admin/domains', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domain),
    });
    const data = await res.json();
    if (data.success) {
      renderAdminDomainsList();
      renderDomainsGrid(); // Update public view too
    }
  } catch (err) {
    alert('Failed to toggle status');
  }
}

function switchAdminTab(tab) {
  document.getElementById('admin-tab-teams').style.display = tab === 'teams' ? 'block' : 'none';
  document.getElementById('admin-tab-domains').style.display = tab === 'domains' ? 'block' : 'none';

  document.getElementById('tab-teams-btn').className = `btn btn-sm ${tab === 'teams' ? 'btn-primary' : 'btn-outline'}`;
  document.getElementById('tab-domains-btn').className = `btn btn-sm ${tab === 'domains' ? 'btn-primary' : 'btn-outline'}`;
}

function logoutAdmin() {
  document.getElementById('admin-login-view').style.display = 'block';
  document.getElementById('admin-dashboard-view').style.display = 'none';
  document.getElementById('admin-password').value = '';
}

// ==========================================
// 6. UTILITIES & MODAL HELPERS
// ==========================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
      const p = item.querySelector('p');
      const span = item.querySelector('span:last-child');
      if (p.style.display === 'none' || !p.style.display) {
        p.style.display = 'block';
        span.innerText = '−';
      } else {
        p.style.display = 'none';
        span.innerText = '+';
      }
    });
  });
}
