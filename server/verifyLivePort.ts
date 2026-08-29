async function runVerification() {
  const baseUrl = "http://127.0.0.1:3000";
  console.log("Checking live server at:", baseUrl);

  // 1. Check HTML index
  const indexRes = await fetch(baseUrl);
  console.log("GET / status:", indexRes.status);
  if (!indexRes.ok) throw new Error("Index page failed to load");

  // 2. Submit new farmer registration directly without OTP
  const farmerPhone = `98480${Math.floor(10000 + Math.random() * 90000)}`;
  console.log("Registering new farmer with phone:", farmerPhone);
  const regRes = await fetch(`${baseUrl}/api/registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Venkat Rao",
      phone: farmerPhone,
      password: "Farmer@Live2026",
      village: "Muppalapally",
      district: "Nizamabad",
      primaryCrop: "Paddy",
      aadhaarMasked: "XXXX XXXX 7788",
      declarationAccepted: true,
    }),
  });
  console.log("POST /api/registration status:", regRes.status);
  const regData = await regRes.json();
  console.log("Registration response:", regData);
  if (regRes.status !== 201 || regData.farmer.status !== "PENDING") {
    throw new Error("Farmer registration failed or status is not PENDING");
  }

  // 3. Attempt login before approval (should be rejected with 403 REGISTRATION_NOT_APPROVED)
  const unapprovedLoginRes = await fetch(`${baseUrl}/api/farmers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: farmerPhone,
      password: "Farmer@Live2026",
    }),
  });
  console.log("Unapproved login status (expected 403):", unapprovedLoginRes.status);
  const unapprovedData = await unapprovedLoginRes.json();
  console.log("Unapproved login response:", unapprovedData);
  if (unapprovedLoginRes.status !== 403 || unapprovedData.error !== "REGISTRATION_NOT_APPROVED") {
    throw new Error("Unapproved farmer was allowed to login or returned wrong error");
  }

  // 4. Officer logs in
  const officerLoginRes = await fetch(`${baseUrl}/api/officers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      officerCode: "OFF-NZM-104",
      password: "Officer@2026",
    }),
  });
  console.log("Officer login status:", officerLoginRes.status);
  const officerData = await officerLoginRes.json();
  const officerToken = officerData.accessToken;
  if (!officerToken) throw new Error("Officer login failed");

  // 5. Officer views pending registrations
  const pendingRes = await fetch(`${baseUrl}/api/officers/registrations/pending`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const pendingData = await pendingRes.json();
  const pendingRecord = pendingData.registrations.find(
    (r: any) => r.farmer?.phone === farmerPhone || r.farmerId === regData.farmer.id
  );
  console.log("Officer sees pending registration:", pendingRecord?.id, pendingRecord?.farmer?.name);
  if (!pendingRecord) throw new Error("Officer did not receive pending registration");

  // 6. Officer approves the registration
  const approveRes = await fetch(`${baseUrl}/api/officers/registrations/${pendingRecord.id}/approve`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  console.log("Officer approve status:", approveRes.status);
  if (approveRes.status !== 200) throw new Error("Officer approval failed");

  // 7. Approved farmer logs in
  const approvedLoginRes = await fetch(`${baseUrl}/api/farmers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: farmerPhone,
      password: "Farmer@Live2026",
    }),
  });
  console.log("Approved farmer login status:", approvedLoginRes.status);
  const farmerSession = await approvedLoginRes.json();
  console.log("Farmer session token received:", !!farmerSession.accessToken);
  if (approvedLoginRes.status !== 200 || !farmerSession.accessToken) {
    throw new Error("Approved farmer failed to login");
  }

  console.log("=== ALL END-TO-END VERIFICATIONS PASSED ON LIVE PORT 3000 ===");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
