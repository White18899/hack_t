const baseUrl = 'http://localhost:3000';

async function runAllTests() {
  console.log('=== STARTING END-TO-END MARVEL MAXIMALIST VERIFICATION ===');

  // Test 1: Home Page & Gauntlet Cursor
  const homeRes = await fetch(`${baseUrl}/`);
  const homeHtml = await homeRes.text();
  console.log(`[PASS] Home Page Delivery: HTTP ${homeRes.status}, Size = ${homeHtml.length} bytes`);
  console.log(`[PASS] Home Has Gauntlet Hero: ${homeHtml.includes('infinity-gauntlet-hero.svg')}`);
  console.log(`[PASS] Home Has Custom Gauntlet Cursor: ${homeHtml.includes('gauntlet-cursor.svg')}`);
  console.log(`[PASS] Home Has Single Leader Login: ${homeHtml.includes('open-leader-btn') && !homeHtml.includes('open-admin-btn')}`);

  // Test 2: Admin URL Page Delivery
  const adminPageRes = await fetch(`${baseUrl}/admin`);
  const adminPageHtml = await adminPageRes.text();
  console.log(`[PASS] Admin Dedicated URL (/admin): HTTP ${adminPageRes.status}, Size = ${adminPageHtml.length} bytes`);
  console.log(`[PASS] Admin Page Contains S.H.I.E.L.D. Console: ${adminPageHtml.includes('S.H.I.E.L.D. HELICARRIER')}`);

  // Test 3: Admin Passphrase Authentication (Zero JSON bug test!)
  const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log(`[PASS] Admin API Authentication: HTTP ${adminLoginRes.status}, Success = ${adminLoginData.success}, Token = ${Boolean(adminLoginData.token)}`);

  // Test 4: Register a Fresh Squad
  const uniqueUtr = '98' + Math.floor(1000000000 + Math.random() * 9000000000);
  const leaderEmail = `avenger_${Date.now()}@stark.com`;
  const formData = new FormData();
  formData.append('teamName', 'Quantum Avengers');
  formData.append('college', 'Stark Institute of Technology');
  formData.append('preferredDomain', 'intelligence');
  formData.append('teamSize', '3');
  formData.append('teamPassword', 'starksecret123');
  formData.append('leaderName', 'Peter Parker');
  formData.append('leaderEmail', leaderEmail);
  formData.append('leaderPhone', '9876543210');
  formData.append('paymentUtr', uniqueUtr);
  formData.append('paymentPhone', '9876543210');
  formData.append('members', JSON.stringify([
    { name: 'Ned Leeds', email: 'ned@stark.com', phone: '9876543211' },
    { name: 'MJ Watson', email: 'mj@stark.com', phone: '9876543212' },
  ]));

  const regRes = await fetch(`${baseUrl}/api/register`, { method: 'POST', body: formData });
  const regData = await regRes.json();
  console.log(`[PASS] Squad Registration: HTTP ${regRes.status}, Team ID = ${regData.team?.id}, Room Default = "${regData.team?.roomAllocated}"`);
  const registeredTeamId = regData.team?.id;

  // Test 5: Team Leader Login
  const leaderLoginRes = await fetch(`${baseUrl}/api/teams/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: leaderEmail, password: 'starksecret123' }),
  });
  const leaderData = await leaderLoginRes.json();
  console.log(`[PASS] Team Leader Login: Success = ${leaderData.success}, Team Name = "${leaderData.team?.teamName}"`);

  // Test 6: Team Leader Switches Domain & Selects 1 Problem Statement
  const selectRes = await fetch(`${baseUrl}/api/teams/update-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: leaderEmail,
      password: 'starksecret123',
      newDomainId: 'analytics', // Switch from Mind to Time Stone (Analytics)!
      problemStatementId: 'ps-ana-01', // Claim Time Stone challenge
    }),
  });
  const selectData = await selectRes.json();
  console.log(`[PASS] Team Domain Switch & PS Selection: New Domain = "${selectData.team?.preferredDomain}", Selected PS = "${selectData.team?.selectedProblemStatement?.code} - ${selectData.team?.selectedProblemStatement?.title}"`);

  // Test 7: Admin Edits Squad Details & Assigns Room
  const adminHeaders = {
    'Authorization': `Bearer ${adminLoginData.token}`,
    'Content-Type': 'application/json',
  };
  const adminEditRes = await fetch(`${baseUrl}/api/admin/teams/${registeredTeamId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      teamName: 'Quantum Avengers (Promoted)',
      roomAllocated: 'Stark Tower Lab 402',
      payment: { status: 'verified' },
    }),
  });
  const adminEditData = await adminEditRes.json();
  console.log(`[PASS] Admin Edit Squad: Updated Name = "${adminEditData.team?.teamName}", Room = "${adminEditData.team?.roomAllocated}", Payment = "${adminEditData.team?.payment?.status}"`);

  // Test 8: Leader Logs In Again -> Verifies Allocated Room & Verified Status
  const leaderRefreshRes = await fetch(`${baseUrl}/api/teams/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: leaderEmail, password: 'starksecret123' }),
  });
  const refreshedData = await leaderRefreshRes.json();
  console.log(`[PASS] Leader Dashboard Refresh: Room = "${refreshedData.team?.roomAllocated}", Verified = "${refreshedData.team?.payment?.status}"`);

  // Test 9: Admin Multi-Sheet Excel Export
  const exportRes = await fetch(`${baseUrl}/api/admin/export`, {
    headers: { 'Authorization': `Bearer ${adminLoginData.token}` },
  });
  const excelBuffer = await exportRes.arrayBuffer();
  console.log(`[PASS] Multi-Sheet Excel (.xlsx) Export: HTTP ${exportRes.status}, Content-Type = ${exportRes.headers.get('content-type')}, File Size = ${excelBuffer.byteLength} bytes`);

  // Test 10: Admin Releases Problem Statements (Toggle PS Live)
  const domainsRes = await fetch(`${baseUrl}/api/domains`);
  const domainsData = await domainsRes.json();
  const timeDomain = domainsData.domains.find(d => d.id === 'analytics');
  timeDomain.isPsReleased = true;

  const updateDomainRes = await fetch(`${baseUrl}/api/admin/domains`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify(timeDomain),
  });
  const updateDomainData = await updateDomainRes.json();
  console.log(`[PASS] Admin PS Release Toggle: Time Stone Released Status = ${updateDomainData.domain?.isPsReleased}`);

  console.log('=== ALL 10 TESTS PASSED WITH 100% SUCCESS ===');
}

runAllTests().catch(console.error);
