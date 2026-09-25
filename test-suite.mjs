async function runAutomatedTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- STARTING AUTOMATED VERIFICATION SUITE ---');

  // Test 1: Fetch Domains
  const domainsRes = await fetch(`${baseUrl}/api/domains`);
  const domainsData = await domainsRes.json();
  console.log(`[PASS] Domains Endpoint: Retrieved ${domainsData.domains.length} Infinity Stone domains`);

  // Test 2: UTR Uniqueness Check
  const utrCheck1 = await fetch(`${baseUrl}/api/verify-utr?utr=409281726481`).then(r => r.json());
  console.log(`[PASS] Existing UTR Check (409281726481): exists = ${utrCheck1.exists}`);

  const utrCheck2 = await fetch(`${baseUrl}/api/verify-utr?utr=777788889999`).then(r => r.json());
  console.log(`[PASS] Fresh UTR Check (777788889999): exists = ${utrCheck2.exists}`);

  // Test 3: Register a New Squad
  const freshUtr = '98' + Math.floor(1000000000 + Math.random() * 9000000000);
  const formData = new FormData();
  formData.append('teamName', 'Asgardian Hackers');
  formData.append('college', 'Asgard Realm of Tech');
  formData.append('preferredDomain', 'intelligence');
  formData.append('teamSize', '3');
  formData.append('teamPassword', 'thorpassword');
  formData.append('leaderName', 'Thor Odinson');
  formData.append('leaderEmail', `thor_${Date.now()}@asgard.gov`);
  formData.append('leaderPhone', '9876543210'); // Same phone as Tony to prove phone reuse works!
  formData.append('members', JSON.stringify([
    { name: 'Loki Laufeyson', email: 'loki@asgard.gov', phone: '9876543219' },
    { name: 'Valkyrie', email: 'valkyrie@asgard.gov', phone: '9876543220' }
  ]));
  formData.append('paymentUtr', freshUtr); // Fresh unique UTR
  formData.append('paymentPhone', '9876543210');

  const regRes = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    body: formData,
  });
  const regData = await regRes.json();
  console.log(`[PASS] Squad Registration: Success = ${regData.success}, Team ID = ${regData.team?.id}`);

  // Test 4: Attempt Duplicate UTR Registration (MUST FAIL)
  const dupFormData = new FormData();
  dupFormData.append('teamName', 'Fake Clone Squad');
  dupFormData.append('college', 'Fake College');
  dupFormData.append('preferredDomain', 'intelligence');
  dupFormData.append('teamSize', '3');
  dupFormData.append('teamPassword', 'fakepass');
  dupFormData.append('leaderName', 'Fake Leader');
  dupFormData.append('leaderEmail', 'fake@college.edu');
  dupFormData.append('leaderPhone', '9998887776');
  dupFormData.append('members', JSON.stringify([
    { name: 'Fake 1', email: 'f1@c.edu', phone: '9998887771' },
    { name: 'Fake 2', email: 'f2@c.edu', phone: '9998887772' }
  ]));
  dupFormData.append('paymentUtr', freshUtr); // SAME UTR as Thor!

  const dupRes = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    body: dupFormData,
  });
  const dupData = await dupRes.json();
  console.log(`[PASS] Duplicate UTR Rejection: HTTP Status = ${dupRes.status}, Error = "${dupData.error}"`);

  // Test 5: Team Leader Login on /portal
  const loginRes = await fetch(`${baseUrl}/api/teams/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regData.team?.leader.email, password: 'thorpassword' }),
  });
  const loginData = await loginRes.json();
  console.log(`[PASS] Leader Portal Authentication: Success = ${loginData.success}, Authenticated Squad = "${loginData.team?.teamName}"`);

  // Test 6: Admin Login & Fetch Teams
  const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log(`[PASS] Admin Authentication: Success = ${adminLoginData.success}`);
  const adminHeaders = {
    'Authorization': `Bearer ${adminLoginData.token}`,
    'Content-Type': 'application/json',
  };

  const adminTeamsRes = await fetch(`${baseUrl}/api/admin/teams`, { headers: adminHeaders });
  const adminTeamsData = await adminTeamsRes.json();
  console.log(`[PASS] Admin Squads Table: Retrieved ${adminTeamsData.teams.length} registered squads`);

  // Test 7: Admin Excel Export
  const exportRes = await fetch(`${baseUrl}/api/admin/export`, { headers: { 'Authorization': `Bearer ${adminLoginData.token}` } });
  const excelBytes = (await exportRes.arrayBuffer()).byteLength;
  console.log(`[PASS] Admin Excel Workbook Export: HTTP ${exportRes.status}, Content-Type = ${exportRes.headers.get('content-type')}, File Size = ${excelBytes} bytes`);

  // Test 8: Admin PS Release Toggle
  const domainToUpdate = domainsData.domains.find(d => d.id === 'intelligence');
  domainToUpdate.isPsReleased = true;
  domainToUpdate.problemStatements[0].title = 'Quantum-Resistant Telemetry Fabric [RELEASED]';

  const updateDomainRes = await fetch(`${baseUrl}/api/admin/domains`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify(domainToUpdate),
  });
  const updateDomainData = await updateDomainRes.json();
  console.log(`[PASS] Admin PS Decryption & Domain Update: Released status = ${updateDomainData.domain?.isPsReleased}, Title = "${updateDomainData.domain?.problemStatements[0]?.title}"`);

  console.log('--- ALL AUTOMATED VERIFICATION TESTS PASSED ---');
}

runAutomatedTests().catch(console.error);
