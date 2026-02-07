const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";
const shouldCreateUser = process.env.SMOKE_CREATE_USER === "true";
const userType = (process.env.SMOKE_USER_TYPE || "customer").toLowerCase();
const defaultPassword = process.env.SMOKE_USER_PASSWORD || "SmokeTest123!";

function logStep(label) {
  console.log(`\n=== ${label} ===`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function smokeHealth() {
  logStep("Health check");
  const data = await requestJson(`${API_BASE}/api/health`);
  console.log("Status:", data?.status || data);
}

async function smokeRegister(email, password) {
  logStep("Register");
  const payload = {
    userType,
    fullName: "Smoke Test",
    email,
    phone: "07000 000000",
    password,
    postcode: "SW1A 1AA",
    terms: true
  };
  const data = await requestJson(`${API_BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.log("Registered:", data?.user?.email || email);
  return data?.token;
}

async function smokeLogin(email, password) {
  logStep("Login");
  const data = await requestJson(`${API_BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  console.log("Login OK:", data?.user?.email || email);
  return data?.token;
}

async function smokeMe(token) {
  logStep("Auth me");
  const data = await requestJson(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log("User:", data?.user?.email || data?.user?.id || "ok");
}

async function smokeVerify(token) {
  logStep("Auth verify");
  const data = await requestJson(`${API_BASE}/api/auth/verify`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log("Verify:", data?.email || data?.userId || "ok");
}

async function main() {
  try {
    await smokeHealth();

    let email = process.env.SMOKE_USER_EMAIL;
    let password = process.env.SMOKE_USER_PASSWORD;
    let token = null;

    if (shouldCreateUser) {
      const suffix = Date.now();
      const domain = process.env.SMOKE_USER_DOMAIN || "example.com";
      email = `smoke-${suffix}@${domain}`;
      password = defaultPassword;
      token = await smokeRegister(email, password);
    }

    if (!email || !password) {
      console.log("\nNo SMOKE_USER_EMAIL/SMOKE_USER_PASSWORD provided. Skipping login checks.");
      return;
    }

    token = token || (await smokeLogin(email, password));

    if (!token) {
      throw new Error("Login did not return a token");
    }

    await smokeMe(token);
    await smokeVerify(token);

    console.log("\nSmoke auth checks completed successfully.");
  } catch (error) {
    console.error("\nSmoke auth checks failed:");
    console.error(error.data || error.message || error);
    process.exit(1);
  }
}

main();
