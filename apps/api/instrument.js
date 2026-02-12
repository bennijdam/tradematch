const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://17c2accb86104f4fcc60b93262f3cc7c@o4510850561474560.ingest.de.sentry.io/4510851885695056",
  integrations: [nodeProfilingIntegration()],
  enableLogs: true,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",
  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: true,
});
