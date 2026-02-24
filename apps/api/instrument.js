const Sentry = require("@sentry/node");

// nodeProfilingIntegration requires a native binary compiled for the specific
// Node.js ABI — skip it gracefully if unavailable (e.g. Node v25 in local dev).
let profilingIntegrations = [];
try {
  const { nodeProfilingIntegration } = require("@sentry/profiling-node");
  profilingIntegrations = [nodeProfilingIntegration()];
} catch (_) {
  console.warn("⚠️  Sentry profiling-node not available — profiling disabled.");
}

Sentry.init({
  dsn: "https://17c2accb86104f4fcc60b93262f3cc7c@o4510850561474560.ingest.de.sentry.io/4510851885695056",
  integrations: profilingIntegrations,
  enableLogs: true,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",
  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: true,
});
