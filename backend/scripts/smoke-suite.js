const { spawn } = require("child_process");

const DEFAULT_SUITE = ["auth", "user-quote", "contracts"]; // keep fast + focused
const ALL_SCRIPTS = {
  auth: "scripts/smoke-auth.js",
  "user-quote": "scripts/smoke-user-quote.js",
  contracts: "scripts/smoke-contracts-endpoints.js",
  "full-production": "scripts/smoke-full-production.js"
};

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSuite() {
  const only = parseList(process.env.SMOKE_ONLY);
  if (only.length) return only;

  const suite = parseList(process.env.SMOKE_SUITE);
  if (suite.length) return suite;

  return DEFAULT_SUITE;
}

function filterSuite(suite) {
  const skip = new Set(parseList(process.env.SMOKE_SKIP));
  return suite.filter((name) => !skip.has(name));
}

function ensureKnown(suite) {
  const unknown = suite.filter((name) => !ALL_SCRIPTS[name]);
  if (unknown.length) {
    throw new Error(`Unknown smoke script(s): ${unknown.join(", ")}`);
  }
}

function runScript(name, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Smoke: ${name} ===`);
    const child = spawn(process.execPath, [filePath], {
      stdio: "inherit",
      env: { ...process.env }
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const err = new Error(`Smoke script failed: ${name}`);
        err.code = code;
        reject(err);
      }
    });
  });
}

async function main() {
  const suite = filterSuite(resolveSuite());
  ensureKnown(suite);

  if (!suite.length) {
    console.log("No smoke scripts to run.");
    return;
  }

  console.log("Smoke suite:", suite.join(", "));

  const results = [];
  const continueOnError = process.env.SMOKE_CONTINUE === "true";

  for (const name of suite) {
    const filePath = ALL_SCRIPTS[name];
    try {
      await runScript(name, filePath);
      results.push({ name, status: "passed" });
    } catch (error) {
      results.push({ name, status: "failed", error });
      if (!continueOnError) {
        break;
      }
    }
  }

  console.log("\n=== Smoke suite summary ===");
  results.forEach((result) => {
    const label = result.status === "passed" ? "PASS" : "FAIL";
    console.log(`${label} - ${result.name}`);
  });

  const failed = results.find((result) => result.status === "failed");
  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Smoke suite runner failed:");
  console.error(error.message || error);
  process.exit(1);
});
